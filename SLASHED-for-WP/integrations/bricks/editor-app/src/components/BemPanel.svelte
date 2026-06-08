<script>
  /**
   * The reBEMer panel.
   *
   * Mounted once per badge activation, hosts the rows for the selected
   * subtree and orchestrates the apply flow. Per-row UI lives in
   * Row.svelte; the panel owns mode + global state and feeds derived
   * recommendations down to each row.
   *
   * Initial row seeding (Goal #9, design doc §9.3):
   *   - The block row's name is seeded from the structure-panel label
   *     (slugified). If the label is empty or non-slugifiable the
   *     fallback is the literal `'block'` with `suggestedFrom: 'fallback'`.
   *   - Descendant rows prefer the structure-panel label; when that
   *     produces no slug, the Bricks element type drives the suggestion
   *     via `suggestElementName()` (heading → 'heading', image → 'image',
   *     etc). Layout containers (section/container/block/div) fall
   *     through to the generic `'item'` fallback so users don't end up
   *     with `card__container`.
   *   - Provenance is tracked on each row via `suggestedFrom`. The first
   *     time the user types into a row's input, Row.svelte flips it to
   *     'user' so the apply-time auto-numbering knows not to renumber it.
   */
  import { onMount } from 'svelte';
  import * as api from '../lib/bricks-api.js';
  import { slugify } from '../lib/slugify.js';
  import { validateName } from '../lib/validate.js';
  import { applyToSubtree, buildPlan, computeBlockAssignment } from '../lib/apply.js';
  import { suggestElementName, isLayoutContainer, suggestContainerName, SOLE_CHILD_LABEL_OVERRIDES } from '../lib/element-types.js';
  import { pickMigratableKeys, pickSkippedKeys } from '../lib/migrate-keys.js';
  import Row from './Row.svelte';
  import Toast from './Toast.svelte';

  let { rootId, onClose } = $props();

  const MODE_HINTS = {
    add:     'Attaches a new BEM class to each element without removing any existing classes.',
    rename:  'Renames an existing class family to the new name (its settings carry over). When an element has several classes, pick which family to rename per row; other classes are kept unless "Remove all existing classes" is on.',
    replace: 'Swaps classes for a new BEM class with empty settings. Pick a family to replace just that one (keeping the rest), or leave "— All classes —" / enable "Remove all existing classes" to clear the element.',
    migrate: 'Lifts inline element styles (padding, color, typography, etc.) into a new global class.',
    mixed:   'Per-element control — every row defaults to Add. Switch any row to Rename (targets one class family, keeps others) or Replace (a selected family, or all classes). "Remove all existing classes" clears every renamed/replaced row.',
  };

  /** Whether the "Remove all existing classes" toggle applies to this mode. */
  function modeAllowsRemoveExisting(m) {
    return m === 'rename' || m === 'replace' || m === 'mixed';
  }

  /** Read _cssGlobalClasses as a flat array of string ids (mirrors readClassIds in apply.js). */
  function readCurrentClassIds(settings) {
    const raw = settings?._cssGlobalClasses;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : Object.values(raw);
    return arr.filter(id => typeof id === 'string' && id.length > 0);
  }

  let mode = $state('add');
  let syncLabels = $state(true);
  /**
   * "Remove all existing classes" toggle (design doc §6.3). Available in
   * rename/replace/mixed; threaded to applyToSubtree so each rename/replace
   * row leaves its element with only the class(es) that op creates. Add and
   * migrate ignore it.
   */
  let removeExisting = $state(false);
  let rows = $state([]);
  /** Snapshot of bricks_global_classes captured on panel open. */
  let globalClassesAtOpen = $state([]);
  let toast = $state(null);
  let panelEl = $state(null);

  const rootLabel = $derived(rows[0]?.originalLabel ?? '');

  /**
   * Per-row owning block name for prefix display. Uses the same stack
   * walk as buildPlan so the displayed prefix always matches the plan.
   */
  const rowBlockNames = $derived.by(() => {
    if (rows.length === 0) return new Map();
    return computeBlockAssignment(rows, rootId);
  });

  /**
   * For migrate mode the panel-level summary tells the user how many
   * keys *would* be lifted across the included rows, and how many are
   * present-but-not-on-the-allowlist (always per-element, never
   * migrated). Helps the user decide whether 'migrate' or 'add' is
   * the right operation for the subtree they opened.
   */
  const migrateSummary = $derived.by(() => {
    if (mode !== 'migrate') return null;
    let willMigrate = 0;
    let willSkip = 0;
    for (const row of rows) {
      if (!row.include) continue;
      willMigrate += (row.migrateKeys?.length ?? 0);
      willSkip += (row.skippedKeys?.length ?? 0);
    }
    return { willMigrate, willSkip };
  });

  /**
   * Per-row preview of all class names that will be created/attached on
   * Apply: the base finalClass plus any modifier classes derived from
   * row.modifiers. Stored as string[] per row so the row component can
   * surface "use existing" hints for any of them. Built from the same
   * pure `buildPlan` step that the apply path uses, so hints always
   * agree with apply-time behavior.
   */
  const previewClassNames = $derived.by(() => {
    if (rows.length === 0) return new Map();
    const result = buildPlan({ rootId, rows, mode });
    const map = new Map();
    if (!result.ok) return map;
    for (const op of result.ops) {
      const names = [op.finalClass];
      for (const slug of op.modifierSlugs ?? []) names.push(`${op.finalClass}--${slug}`);
      map.set(op.row.id, names);
    }
    return map;
  });

  onMount(() => {
    const subtree = api.getSubtree(rootId);
    globalClassesAtOpen = api.getGlobalClasses().slice();

    // Pass 1: basic name seeding from labels and element types.
    const seeded = subtree.map((el, i) => {
      const isRoot = i === 0;
      const label = el.label || '';
      const labelSlug = slugify(label);
      const elementType = el.name || '';

      let name;
      let suggestedFrom;
      if (labelSlug) {
        name = labelSlug;
        suggestedFrom = 'label';
      } else if (isRoot) {
        name = 'block';
        suggestedFrom = 'fallback';
      } else if (elementType && !isLayoutContainer(elementType)) {
        name = suggestElementName(elementType, 'item');
        suggestedFrom = 'element-type';
      } else {
        name = 'item';
        suggestedFrom = 'fallback';
      }

      const currentClassIds = readCurrentClassIds(el.settings);
      return {
        id: el.id,
        depth: el.depth,
        bricksType: elementType,
        originalLabel: label || (isRoot ? 'block' : 'element'),
        name,
        modifiers: [''],
        isBlockRoot: false,
        include: true,
        suggestedFrom,
        migrateKeys: pickMigratableKeys(el.settings),
        skippedKeys: pickSkippedKeys(el.settings),
        currentClassCount: currentClassIds.length,
        currentClassIds,
        op: 'add',
        // Empty by default: the Row normalizes this to the first family for
        // rename ops, while replace keeps '' meaning "— All classes —".
        renameFamilyId: '',
      };
    });

    // Pass 2: context-aware refinement using parent→children relationships.
    // Skips user-labelled elements (suggestedFrom === 'label').
    if (seeded.length > 1) {
      // Build parent → direct child ids map using a depth-tracking stack.
      const childrenOf = new Map(subtree.map(e => [e.id, []]));
      const stack = [];
      for (const el of subtree) {
        while (stack.length && stack[stack.length - 1].depth >= el.depth) stack.pop();
        if (stack.length) childrenOf.get(stack[stack.length - 1].id).push(el.id);
        stack.push(el);
      }

      const elById  = new Map(subtree.map(e => [e.id, e]));
      const rowById = new Map(seeded.map(r => [r.id, r]));

      for (const [, childIds] of childrenOf) {
        if (!childIds.length) continue;

        // Count how many children share each element type.
        const typeCount = new Map();
        for (const id of childIds) {
          const t = elById.get(id)?.name;
          if (t) typeCount.set(t, (typeCount.get(t) ?? 0) + 1);
        }

        // Layout-container children in document order (for positional hints).
        const containerIds = childIds.filter(id => isLayoutContainer(elById.get(id)?.name ?? ''));

        for (const id of childIds) {
          const row = rowById.get(id);
          const el  = elById.get(id);
          if (!row || !el || row.suggestedFrom === 'label') continue;

          if (isLayoutContainer(el.name)) {
            // Infer container role from its children's types.
            const gcTypes = (childrenOf.get(id) ?? [])
              .map(gcId => elById.get(gcId)?.name ?? '').filter(Boolean);
            const pos = containerIds.indexOf(id);
            row.name = suggestContainerName(gcTypes, pos, containerIds.length);
            row.suggestedFrom = 'element-type';
          } else if ((typeCount.get(el.name) ?? 0) === 1) {
            // Sole element of its type → apply semantic override if available.
            const override = SOLE_CHILD_LABEL_OVERRIDES[el.name];
            if (override) {
              row.name = override;
              row.suggestedFrom = 'element-type';
            }
          }
        }
      }
    }

    rows = seeded;
  });

  function handleKeydown(e) {
    if (e.key === 'Escape') { onClose?.(); return; }
    const inPanel = panelEl && e.target instanceof Node && panelEl.contains(e.target);
    if (inPanel && e.key === 'Enter' && (e.target?.tagName === 'INPUT' || e.target?.tagName === 'SELECT')) {
      e.preventDefault();
      apply();
    }
  }

  let closeTimer = null;

  function apply() {
    const block = slugify(rows[0]?.name ?? '');
    const v = validateName(block);
    if (!v.ok) {
      toast = { kind: 'error', message: v.reason };
      return;
    }

    // Validate any sub-block roots before hitting applyToSubtree.
    for (const row of rows) {
      if (!row.isBlockRoot || !row.include) continue;
      const sv = validateName(slugify(row.name ?? ''));
      if (!sv.ok) {
        toast = { kind: 'error', message: `Sub-block "${row.originalLabel}": ${sv.reason}` };
        return;
      }
    }

    const result = applyToSubtree({ rootId, rows, mode, syncLabels, removeExisting });
    if (!result.ok) {
      toast = { kind: 'error', message: result.error };
    } else {
      toast = { kind: 'success', message: `Applied to ${result.count} element${result.count !== 1 ? 's' : ''}.` };
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = setTimeout(() => onClose?.(), 800);
    }
  }

  $effect(() => {
    return () => { if (closeTimer) clearTimeout(closeTimer); };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

<div bind:this={panelEl} class="rebemer-panel" role="dialog" aria-modal="true" tabindex="-1">
  <header class="rebemer-panel__header">
    <h2 class="rebemer-panel__title">reBEMer · <span class="rebemer-panel__subject">{rootLabel}</span></h2>
    <button
      type="button"
      class="rebemer-panel__close"
      aria-label="Close reBEMer panel"
      onclick={() => onClose?.()}
    >×</button>
  </header>

  <section class="rebemer-panel__toolbar">
    <label class="rebemer-field">
      <span class="rebemer-field__label">Operation</span>
      <select bind:value={mode}>
        <option value="add">Add</option>
        <option value="rename">Rename</option>
        <option value="replace">Replace</option>
        <option value="migrate">Migrate ID styles</option>
        <option value="mixed">All-in-one</option>
      </select>
    </label>
    <label class="rebemer-field rebemer-field--inline">
      <input type="checkbox" bind:checked={syncLabels} />
      <span>Sync labels</span>
    </label>
    {#if modeAllowsRemoveExisting(mode)}
      <label class="rebemer-field rebemer-field--inline" title="Strip every class already on each renamed/replaced element, leaving only the new BEM class">
        <input type="checkbox" bind:checked={removeExisting} />
        <span>Remove all existing classes</span>
      </label>
    {/if}
  </section>
  <p class="rebemer-panel__mode-hint">{MODE_HINTS[mode]}</p>

  {#if migrateSummary}
    <aside
      class="rebemer-panel__notice"
      class:rebemer-panel__notice--warn={migrateSummary.willSkip > 0 || migrateSummary.willMigrate === 0}
      role="status"
    >
      {#if migrateSummary.willMigrate === 0}
        No migratable style keys found on any included element. Apply will attach empty classes.
      {:else}
        Will migrate <strong>{migrateSummary.willMigrate}</strong> style key{migrateSummary.willMigrate === 1 ? '' : 's'} into new classes.
      {/if}
      {#if migrateSummary.willSkip > 0}
        <span class="rebemer-panel__notice-skip">
          {migrateSummary.willSkip} key{migrateSummary.willSkip === 1 ? '' : 's'} not on the allowlist will stay on the element.
        </span>
      {/if}
    </aside>
  {/if}

  <section class="rebemer-panel__body">
    {#each rows as row, i (row.id)}
      <Row
        bind:row={rows[i]}
        {mode}
        blockName={rowBlockNames.get(row.id) ?? ''}
        isRoot={row.id === rootId || row.isBlockRoot}
        {rootId}
        globalClasses={globalClassesAtOpen}
        {removeExisting}
        finalClassNames={previewClassNames.get(row.id) ?? []}
      />
    {/each}
  </section>

  <footer class="rebemer-panel__footer">
    <button type="button" class="rebemer-btn" onclick={() => onClose?.()}>Cancel</button>
    <button type="button" class="rebemer-btn rebemer-btn--primary" onclick={apply}>Apply</button>
  </footer>
</div>

{#if toast}
  <Toast kind={toast.kind} message={toast.message} onDismiss={() => { toast = null; }} />
{/if}
