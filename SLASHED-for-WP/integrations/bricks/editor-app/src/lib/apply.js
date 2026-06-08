/**
 * Apply BEM classes to a subtree in one pass.
 *
 * Five modes:
 *   add      — attach new BEM classes (keep any existing classes).
 *   rename   — detach old classes, create new ones seeded with old settings.
 *   replace  — detach old classes, create new ones with empty settings.
 *   migrate  — keep existing classes, lift allowlisted element-settings
 *              keys (padding, color, etc.) up into a new global class
 *              and remove them from the element.
 *   mixed    — per-row operation; each row independently chooses add,
 *              rename, or replace via row.op. Rename can target a
 *              specific class family (row.renameFamilyId); replace can
 *              remove a targeted family or all existing classes.
 *
 * Class-family targeting (rename / replace)
 * -----------------------------------------
 * `row.renameFamilyId` selects WHICH existing class family the op acts on,
 * and is honored in the dedicated `rename` and `replace` modes as well as
 * per-row in `mixed` mode:
 *   - rename  — the selected family's base is renamed to the new class
 *               (its settings seed the new class) and its modifier
 *               siblings are renamed too; unrelated classes are kept.
 *               Empty id falls back to the element's first class.
 *   - replace — the selected family (base + modifiers) is detached and
 *               the new class attached; unrelated classes are kept. Empty
 *               id ('') means "all classes" — every existing class is
 *               detached.
 *
 * Remove all existing classes
 * ---------------------------
 * The `removeExisting` apply flag (off by default) is the panel-level
 * "Remove all existing classes" toggle. When on it forces every
 * rename/replace op to leave the element with ONLY the class(es) that op
 * creates (the renamed/new base plus any modifier-input classes). It never
 * affects `add` or `migrate` ops, which always preserve other classes.
 *
 * Modifiers
 * ---------
 * Any row in add/rename/replace mode may carry `row.modifiers: string[]`.
 * Non-empty entries produce additional `finalClass--modSlug` classes that
 * are attached alongside the primary class in the same Apply. Modifier
 * slugs are resolved AFTER auto-numbering so they always reference the
 * final (post-numbered) base class name.
 *
 * Multiple blocks per subtree
 * ---------------------------
 * Any non-root row may have `row.isBlockRoot: true`, promoting it to a
 * sub-block root. Its `finalClass` becomes its own block name (not
 * `parentBlock__elemName`), and all its descendants adopt it as their
 * owning block. `computeBlockAssignment` implements the stack walk that
 * resolves each row to its owning block.
 *
 * Sibling auto-numbering
 * ----------------------
 * Two rows under the same block can resolve to the same final class
 * name (e.g. two `image` rows both producing `card__image`). A pre-pass
 * detects in-plan collisions and appends `-1`, `-2`, … in document
 * order to disambiguate. The pre-pass respects row provenance:
 *   - `'user'` (user-typed) and `'label'` (derived from the structure-
 *     panel label, which is itself user-controlled) are *authoritative*
 *     and never auto-numbered. Two authoritative rows colliding is a
 *     hard validation error.
 *   - `'element-type' | 'fallback' | 'auto-number'` rows accept the
 *     numeric suffix in document order.
 *
 * Skip toggle
 * -----------
 * Rows with `include: false` are excluded from operations *and* from
 * the collision tally — a skipped row never claims a number. A skipped
 * sub-block root is also not pushed onto the block stack, so its
 * children fall back to the nearest active ancestor block.
 *
 * Two-step API
 * ------------
 *   buildPlan(...)        Pure: validate + auto-number. Returns
 *                         { ok, ops, error }. No mutations. Used by
 *                         the panel for preview-driven UI hints.
 *   applyToSubtree(...)   Impure: builds the plan, pre-validates
 *                         migrate-mode conflicts against live state,
 *                         snapshots current element state, then mutates
 *                         the Bricks Vue state op by op. Rolls back all
 *                         touched elements on any mid-apply error.
 *
 * @module apply
 */

import { slugify } from './slugify.js';
import { MIGRATE_ALLOWLIST } from './migrate-keys.js';
import * as api from './bricks-api.js';

const VALID_MODES = new Set(['add', 'rename', 'replace', 'migrate', 'mixed']);

/**
 * Provenance values that are treated as authoritative — these names
 * come from the user (typed in OR already on the structure-panel
 * label, which the user owns) and must never be auto-renumbered.
 * Anything else is open to renumbering when sibling collisions occur.
 */
const AUTHORITATIVE_PROVENANCE = new Set(['user', 'label']);

/**
 * @typedef {Object} Row
 * @property {string} id - Bricks element id.
 * @property {number} depth - 0 = root, > 0 = descendant.
 * @property {string} name - Slugifiable label (block name for root or
 *   sub-block roots, element label otherwise).
 * @property {string[]} [modifiers] - Slugifiable modifier tokens. Each
 *   non-empty entry produces an extra `finalClass--modSlug` class
 *   attached alongside the primary class (add/rename/replace only).
 * @property {boolean} [isBlockRoot] - When true (and row.id !== rootId),
 *   this row starts a new BEM block scope for itself and its descendants.
 * @property {boolean} include - When false the row is skipped: no
 *   mutations, no collision tally, no preflight.
 * @property {'user'|'label'|'element-type'|'fallback'|'auto-number'} [suggestedFrom]
 *   Where the row's `name` came from. `'user'` and `'label'` are
 *   treated as authoritative (never auto-renumbered). The other
 *   values are open to renumbering on intra-plan collisions.
 * @property {string[]} [migrateKeys] - element-settings keys to lift
 *   into the new class on a 'migrate' apply. Already filtered by
 *   `migrate-keys.MIGRATE_ALLOWLIST` by the caller; we re-filter here
 *   defensively against tampered DOM input.
 * @property {'add'|'rename'|'replace'} [op] - Per-row operation for
 *   'mixed' mode. Ignored in all other modes. Defaults to 'add'.
 * @property {string[]} [currentClassIds] - IDs of existing global
 *   classes currently attached to the element. Populated by BemPanel
 *   on open; used in 'mixed' mode for family detection and seeding.
 * @property {string|null} [renameFamilyId] - With `op: 'rename'` (any
 *   mode), the ID of the class to use as the rename source (base of the
 *   family being renamed); falls back to currentIds[0]. With
 *   `op: 'replace'`, the ID of the family to detach (its base + modifiers)
 *   while keeping unrelated classes; an empty string ('') means "all
 *   classes" — detach every existing class. Honored in the dedicated
 *   `rename`/`replace` modes and per-row in `mixed`.
 */

/**
 * @typedef {Object} Op
 * @property {Row} row
 * @property {boolean} isRoot        True for the tree root or a sub-block root.
 * @property {string} blockName      The owning block's slugified name.
 * @property {string} finalClass     The post-numbering class name.
 * @property {string[]} modifierSlugs Resolved after auto-numbering; each
 *   entry produces a `finalClass--slug` class attached alongside the primary.
 * @property {string} suggestedFrom  Possibly mutated to 'auto-number'.
 */

/**
 * Walk rows in document order to determine the owning BEM block for each row.
 * Block/sub-block roots are only pushed onto the stack when included; element
 * rows are assigned an owner regardless of their include status (intentional:
 * BemPanel uses this for live prefix display so excluded rows still show their
 * would-be prefix). Uses a depth-based stack: a sub-block root pushes itself,
 * popping any prior entries at the same or greater depth first.
 *
 * Exported so BemPanel can reuse the result for live prefix display without
 * re-running the full plan.
 *
 * @param {Row[]} rows
 * @param {string} rootId
 * @returns {Map<string, string>}  row.id → owning block's slugified name
 */
export function computeBlockAssignment(rows, rootId) {
  const map = new Map();
  const stack = []; // { depth: number, blockName: string }

  for (const row of rows) {
    while (stack.length && stack[stack.length - 1].depth >= row.depth) stack.pop();

    const isRootRow = row.id === rootId;
    const isSubBlock = !isRootRow && row.isBlockRoot === true;

    if (isRootRow || isSubBlock) {
      const slug = slugify(row.name);
      if (slug && row.include !== false) {
        stack.push({ depth: row.depth, blockName: slug });
        map.set(row.id, slug);
      }
    } else {
      const ownerSlug = stack.length ? stack[stack.length - 1].blockName : '';
      if (ownerSlug) map.set(row.id, ownerSlug);
    }
  }

  return map;
}

/**
 * Build the plan for a subtree apply: validate inputs, slug, run the
 * sibling auto-numbering pre-pass. Pure — no mutations to live Bricks
 * state, no I/O.
 *
 * @param {object} opts
 * @param {string} opts.rootId
 * @param {Row[]} opts.rows
 * @param {'add'|'rename'|'replace'|'migrate'|'mixed'} opts.mode
 * @returns {{ok:true, ops:Op[]} | {ok:false, error:string, ops:Op[]}}
 *   On error, `ops` is an empty array so callers (e.g. previews) can
 *   safely treat it as "nothing to display".
 */
export function buildPlan({ rootId, rows, mode }) {
  if (!VALID_MODES.has(mode)) {
    return { ok: false, ops: [], error: `Invalid mode: ${mode}` };
  }

  const blockRow = rows.find(r => r.id === rootId);
  if (!blockRow) return { ok: false, ops: [], error: 'Root row missing.' };

  const rootBlockName = slugify(blockRow.name);
  if (!rootBlockName) return { ok: false, ops: [], error: 'Block name is empty.' };

  // Validate sub-block root names up-front so errors are reported before
  // any op is built. Collect all bad names for a combined message.
  const emptySubBlocks = [];
  for (const row of rows) {
    if (!row.isBlockRoot || !row.include || row.id === rootId) continue;
    if (!slugify(row.name)) emptySubBlocks.push(row.originalLabel || row.id);
  }
  if (emptySubBlocks.length > 0) {
    return { ok: false, ops: [], error: `Block name is empty for: ${emptySubBlocks.join(', ')}.` };
  }

  const blockMap = computeBlockAssignment(rows, rootId);

  // 1. Build per-row operations with intended (pre-numbering) class names.
  /** @type {Op[]} */
  const ops = [];
  for (const row of rows) {
    if (!row.include) continue;
    const isRootRow = row.id === rootId;
    const isSubBlock = !isRootRow && row.isBlockRoot === true;

    const blockName = blockMap.get(row.id);
    if (!blockName) continue;

    let baseClass;
    if (isRootRow || isSubBlock) {
      baseClass = blockName;
    } else {
      const elemSlug = slugify(row.name);
      if (!elemSlug) continue;
      baseClass = `${blockName}__${elemSlug}`;
    }

    ops.push({
      row,
      isRoot: isRootRow || isSubBlock,
      blockName,
      finalClass: baseClass,
      modifierSlugs: [], // populated after auto-numbering
      suggestedFrom: row.suggestedFrom || 'fallback',
    });
  }

  if (ops.length === 0) {
    return { ok: false, ops: [], error: 'No rows to apply. Include at least one row.' };
  }

  // 2. Sibling auto-numbering (in-plan collision resolver).
  const numberingResult = applyAutoNumbering(ops);
  if (!numberingResult.ok) return { ok: false, ops: [], error: numberingResult.error };

  // 3. Resolve modifier slugs against the now-final class names.
  //    Doing this after numbering ensures modifiers reference the
  //    correct (post-numbered) base class (e.g. `card__image-1--lg`).
  if (mode !== 'migrate') {
    for (const op of ops) {
      const mods = Array.isArray(op.row.modifiers) ? op.row.modifiers : [];
      op.modifierSlugs = mods.map(m => slugify(m)).filter(Boolean);
    }
  }

  return { ok: true, ops };
}

/**
 * Apply a plan to live Bricks state.
 *
 * @param {object} opts
 * @param {string} opts.rootId
 * @param {Row[]} opts.rows
 * @param {'add'|'rename'|'replace'|'migrate'|'mixed'} opts.mode
 * @param {boolean} opts.syncLabels
 * @param {boolean} [opts.removeExisting] - "Remove all existing classes"
 *   toggle. When true, every rename/replace op leaves the element with
 *   only the class(es) it creates. Ignored by add/migrate ops.
 * @returns {{ok:true, count:number} | {ok:false, error:string}}
 */
export function applyToSubtree({ rootId, rows, mode, syncLabels, removeExisting = false }) {
  const planResult = buildPlan({ rootId, rows, mode });
  if (!planResult.ok) return { ok: false, error: planResult.error };

  const ops = planResult.ops;
  const globalClasses = api.getGlobalClasses();

  // 3. Pre-validate migrate-mode against live state BEFORE any
  //    mutation. This catches the "existing class with conflicting
  //    settings" case up-front so we never end up half-applied with a
  //    silent style-loss surprise. See validateMigrate() for details.
  if (mode === 'migrate') {
    const validation = validateMigrate(ops, globalClasses);
    if (!validation.ok) return validation;
  }

  // 4. Snapshot current state so we can roll back on mid-apply failure.
  //    classIds and labels are cheap to capture; for migrate mode we also
  //    save the exact setting keys that removeMigratedKeys will delete.
  const snapshot = new Map(); // id -> { classIds, label, migrateKeys? }
  for (const op of ops) {
    if (snapshot.has(op.row.id)) continue; // same element, already snapshotted
    const el = api.findElement(op.row.id);
    if (!el) continue;
    const entry = {
      classIds: readClassIds(el.settings).slice(),
      label: syncLabels ? (el.label ?? '') : null,
    };
    if (mode === 'migrate' && Array.isArray(op.row.migrateKeys)) {
      const saved = {};
      for (const key of op.row.migrateKeys) {
        if (Object.prototype.hasOwnProperty.call(el.settings || {}, key)) {
          saved[key] = JSON.parse(JSON.stringify(el.settings[key]));
        }
      }
      entry.migrateKeys = saved;
    }
    snapshot.set(op.row.id, entry);
  }

  // 5. Apply each op against live state, wrapped in a single undo batch
  //    so Ctrl-Z reverses the whole subtree apply in one step.
  let count = 0;
  try {
    api.batchMutations(() => {
    for (const op of ops) {
      const el = api.findElement(op.row.id);
      if (!el) continue;

      const currentIds = readClassIds(el.settings);
      // In 'mixed' mode each row carries its own operation; validate and fall back to 'add'.
      const rowOp = op.row.op ?? 'add';
      const effectiveMode = mode === 'mixed'
        ? (['add', 'rename', 'replace'].includes(rowOp) ? rowOp : 'add')
        : mode;

      // "Remove all existing classes" only affects the destructive ops.
      // add/migrate always keep the element's other classes.
      const removeAll = removeExisting && (effectiveMode === 'rename' || effectiveMode === 'replace');

      // Determine seed settings for the new class.
      let seed = {};
      if (effectiveMode === 'rename' && currentIds.length > 0) {
        // Seed from the selected family base (any mode) or the first class.
        const sourceId = op.row.renameFamilyId || currentIds[0];
        const firstOld = globalClasses.find(c => c && c.id === sourceId);
        if (firstOld && firstOld.settings) {
          seed = JSON.parse(JSON.stringify(firstOld.settings));
        }
      } else if (effectiveMode === 'migrate') {
        seed = collectMigrateSeed(el.settings, op.row.migrateKeys);
      }

      // For migrate effectiveMode, when the target class already exists, merge
      // any keys from the seed that the existing class doesn't have.
      // upsertGlobalClass deliberately never overwrites; without this
      // step, the inline keys would be stripped from the element by
      // removeMigratedKeys (below) and never reach the existing class
      // — silent style loss. Pre-validation in step 3 has already
      // confirmed there are no conflicting values, so merging here
      // is safe and additive.
      if (effectiveMode === 'migrate') {
        const existing = globalClasses.find(c => c && c.name === op.finalClass);
        if (existing) {
          if (!existing.settings || typeof existing.settings !== 'object') {
            existing.settings = {};
          }
          for (const [key, value] of Object.entries(seed)) {
            if (!Object.prototype.hasOwnProperty.call(existing.settings, key)) {
              existing.settings[key] = value;
            }
          }
        }
      }

      const newClassId = api.upsertGlobalClass(op.finalClass, seed);

      // Build the new class list for this element.
      let nextIds;
      switch (effectiveMode) {
        case 'add':
        case 'migrate':
          nextIds = currentIds.includes(newClassId)
            ? currentIds
            : [...currentIds, newClassId];
          break;

        case 'rename': {
          // Source family base: the user-selected family (any mode) or the
          // element's first class. Its settings already seeded the new class.
          const sourceId = op.row.renameFamilyId || (currentIds[0] ?? null);
          const renamedIds = [newClassId];
          const oldBase = sourceId ? globalClasses.find(c => c && c.id === sourceId) : null;
          // When removeAll is on, drop every other class: the element keeps
          // only the renamed base (settings carried via seed) plus any
          // modifier-input classes appended below. Otherwise rename the
          // family's modifier siblings and keep unrelated classes.
          if (oldBase && !removeAll) {
            const oldPrefix = oldBase.name + '--';
            // Iterate all ids — skip the source (replaced by newClassId), rename
            // its modifier classes, and keep all unrelated classes as-is.
            for (const id of currentIds) {
              if (id === sourceId) continue;
              const old = globalClasses.find(c => c && c.id === id);
              if (!old) continue;
              if (old.name.startsWith(oldPrefix)) {
                const suffix = old.name.slice(oldBase.name.length); // '--lg' etc.
                const modSeed = old.settings ? JSON.parse(JSON.stringify(old.settings)) : {};
                renamedIds.push(api.upsertGlobalClass(op.finalClass + suffix, modSeed));
              } else {
                renamedIds.push(id); // unrelated class — keep
              }
            }
          }
          nextIds = renamedIds;
          break;
        }

        case 'replace':
          // Target a specific family (any mode) → strip only that family's
          // base + modifier classes; keep all unrelated classes. With no
          // family selected ('') or when removeAll is on, strip every class
          // and keep only the new one.
          if (op.row.renameFamilyId && !removeAll) {
            const targetBase = globalClasses.find(c => c && c.id === op.row.renameFamilyId);
            if (targetBase) {
              const prefix = targetBase.name + '--';
              const kept = currentIds.filter(id => {
                if (id === op.row.renameFamilyId) return false;
                const cls = globalClasses.find(c => c && c.id === id);
                return !cls || !cls.name.startsWith(prefix);
              });
              nextIds = [newClassId, ...kept];
            } else {
              nextIds = [newClassId]; // target not found — replace all as fallback
            }
          } else {
            nextIds = [newClassId]; // replace all (default / removeAll)
          }
          break;
      }

      // Append any modifier classes requested via row.modifiers. These
      // piggyback on the primary class operation: the base is already in
      // nextIds, so we only need to upsert and append the modifier classes.
      for (const modSlug of op.modifierSlugs) {
        const modClass = `${op.finalClass}--${modSlug}`;
        const modId = api.upsertGlobalClass(modClass, {});
        if (!nextIds.includes(modId)) nextIds.push(modId);
      }

      api.setElementClasses(op.row.id, nextIds);

      // For migrate effectiveMode, remove the lifted keys from the element settings
      // AFTER the class is attached. The pre-validation + merge above
      // guarantees every key is now provided by the (new or existing)
      // class with the same value, so this is visually a no-op.
      if (effectiveMode === 'migrate') {
        removeMigratedKeys(el.settings, op.row.migrateKeys);
      }

      // Sync label if enabled.
      if (syncLabels) {
        const label = labelFromClass(op.finalClass, op.blockName);
        if (label) api.setElementLabel(op.row.id, label);
      }

      count++;
    }
    }); // end batchMutations
  } catch (err) {
    // Roll back every element we touched to its pre-apply state.
    // upsertGlobalClass side-effects (new global classes) are not removed
    // because unused classes are harmless and removal would require tracking
    // which were newly created vs pre-existing.
    for (const [id, snap] of snapshot) {
      try {
        api.setElementClasses(id, snap.classIds);
        if (snap.migrateKeys) {
          const el = api.findElement(id);
          if (el && el.settings) Object.assign(el.settings, snap.migrateKeys);
        }
        if (snap.label !== null) api.setElementLabel(id, snap.label);
      } catch {
        // Best-effort; a failing rollback step shouldn't mask the original error.
      }
    }
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[reBEMer] apply failed after', count, 'mutation(s), rolled back:', message);
    return { ok: false, error: `Operation failed and was rolled back: ${message}` };
  }

  if (count === 0) {
    return { ok: false, error: 'No elements were modified. The subtree may have changed.' };
  }

  return { ok: true, count };
}

/**
 * Pre-validation for migrate mode: detect cases where lifting the
 * keys would conflict with an existing class of the same name.
 *
 * Three cases per migrate op:
 *
 *   1. Target class doesn't exist → safe; new class will be created
 *      with the seed (handled in applyToSubtree).
 *   2. Target class exists, no overlap with seed → safe; missing
 *      keys will be merged into the existing class (additive).
 *   3. Target class exists, same key with different value → CONFLICT.
 *      Applying would either overwrite the existing class's value
 *      (forbidden by Goal #6) or strip the inline key without
 *      replacement (silent style loss). Refuse the whole apply.
 *
 * The third case is rare in practice — it requires the same BEM
 * class name to mean two different things in two different contexts,
 * which is exactly what we don't want and what reBEMer is supposed
 * to discourage. Refusing rather than guessing keeps the user in
 * control: rename one of the colliding contexts or use Add mode.
 *
 * @param {Op[]} ops
 * @param {Array} globalClasses
 * @returns {{ok:true} | {ok:false, error:string}}
 */
function validateMigrate(ops, globalClasses) {
  for (const op of ops) {
    const existing = globalClasses.find(c => c && c.name === op.finalClass);
    if (!existing) continue;

    const el = api.findElement(op.row.id);
    if (!el) continue;

    const seed = collectMigrateSeed(el.settings, op.row.migrateKeys);
    const existingSettings = (existing.settings && typeof existing.settings === 'object')
      ? existing.settings
      : {};

    const conflicts = [];
    for (const [key, value] of Object.entries(seed)) {
      if (!Object.prototype.hasOwnProperty.call(existingSettings, key)) continue;
      if (JSON.stringify(existingSettings[key]) !== JSON.stringify(value)) {
        conflicts.push(key.replace(/^_/, ''));
      }
    }

    if (conflicts.length > 0) {
      const list = conflicts.join(', ');
      return {
        ok: false,
        error: `Migrate blocked: existing class "${op.finalClass}" has conflicting values for ${list}. Pick a different name or use Add mode.`,
      };
    }
  }
  return { ok: true };
}

/**
 * Detect in-plan collisions and assign `-1`, `-2`, … suffixes.
 *
 * Mutates `ops[].finalClass` and `ops[].suggestedFrom` (latter flips
 * to `'auto-number'` when a row gets a numeric suffix). Returns a
 * result object — `{ ok: false, error }` on validation failure.
 *
 * @param {Op[]} ops
 */
function applyAutoNumbering(ops) {
  const groups = new Map();
  for (const op of ops) {
    const list = groups.get(op.finalClass) || [];
    list.push(op);
    groups.set(op.finalClass, list);
  }

  for (const [name, group] of groups) {
    if (group.length === 1) continue;

    const authoritative = group.filter(o => AUTHORITATIVE_PROVENANCE.has(o.suggestedFrom));
    if (authoritative.length > 1) {
      return {
        ok: false,
        error: `"${name}" is used by ${authoritative.length} rows. Edit one to make it unique.`,
      };
    }

    let n = 1;
    for (const op of group) {
      if (AUTHORITATIVE_PROVENANCE.has(op.suggestedFrom)) continue;
      op.finalClass = `${name}-${n++}`;
      op.suggestedFrom = 'auto-number';
    }
  }

  // Post-numbering integrity check: catch the case where a user-typed
  // `card__image-1` collides with an auto-numbered `card__image-1`
  // produced from a different group.
  const seen = new Map();
  for (const op of ops) {
    const prior = seen.get(op.finalClass);
    if (prior) {
      return {
        ok: false,
        error: `"${op.finalClass}" is produced by 2 rows after auto-numbering (one ${prior}, one ${op.suggestedFrom}). Pick a different name for one of them.`,
      };
    }
    seen.set(op.finalClass, op.suggestedFrom);
  }

  return { ok: true };
}

/**
 * Build the seed settings for a 'migrate' op: a deep clone of the
 * subset of the element's settings that the row marked for migration
 * AND that are still on the migration allowlist.
 *
 * Re-filtering against the allowlist here is intentional defense-in-
 * depth: the panel UI populates `row.migrateKeys` from the allowlist,
 * but a tampered DOM (e.g. dev-tools editing) could send arbitrary
 * keys. Allowlist re-check guarantees we never lift unknown keys.
 *
 * @param {object} elementSettings
 * @param {string[]|undefined} requestedKeys
 * @returns {object}
 */
function collectMigrateSeed(elementSettings, requestedKeys) {
  if (!elementSettings || !Array.isArray(requestedKeys)) return {};
  const seed = {};
  for (const key of requestedKeys) {
    if (!MIGRATE_ALLOWLIST.has(key)) continue;
    if (!Object.prototype.hasOwnProperty.call(elementSettings, key)) continue;
    seed[key] = JSON.parse(JSON.stringify(elementSettings[key]));
  }
  return seed;
}

/**
 * Strip the migrated keys from the element-settings blob in place.
 *
 * @param {object} elementSettings
 * @param {string[]|undefined} keys
 */
function removeMigratedKeys(elementSettings, keys) {
  if (!elementSettings || !Array.isArray(keys)) return;
  for (const key of keys) {
    if (!MIGRATE_ALLOWLIST.has(key)) continue;
    if (Object.prototype.hasOwnProperty.call(elementSettings, key)) {
      delete elementSettings[key];
    }
  }
}

/** Read _cssGlobalClasses as a flat array of string ids. */
function readClassIds(settings) {
  const raw = settings?._cssGlobalClasses;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : Object.values(raw);
  return arr.filter(id => typeof id === 'string' && id.length > 0);
}

/** Title-case the element part of a class name for the structure label. */
function labelFromClass(className, blockName) {
  let s = className;
  if (s === blockName) return titleCase(blockName.replace(/-/g, ' '));
  if (s.startsWith(blockName + '__')) s = s.slice(blockName.length + 2);
  s = s.replace(/--.+$/, '');
  return titleCase(s.replace(/-/g, ' '));
}

function titleCase(s) {
  return s.replace(/(^|\s)([a-z])/g, (_, sp, ch) => sp + ch.toUpperCase());
}
