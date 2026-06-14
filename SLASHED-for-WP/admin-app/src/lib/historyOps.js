/**
 * Pure-JS algorithms for the override store.
 *
 * Splitting the logic out of `store.svelte.js` (which is wrapped in Svelte 5
 * `$state` runes that only exist inside the Svelte compile pipeline) lets the
 * same code be unit-tested under `node --test` against plain object stores.
 *
 * Each function takes the live `overrides` and `history` objects by
 * reference and mutates them in place. The store layer sets up the runes,
 * provides a `persist()` callback, and calls into here.
 *
 *   • `setOne(state, name, value)` — single-token edit
 *   • `clearOne(state, name)` — drop a single override
 *   • `clearEvery(state)` — drop every override (one history step)
 *   • `replaceAll(state, map, isKnown)` — full replacement (CSS import)
 *   • `patchMany(state, patch, isKnown)` — bulk edit (one history step)
 *   • `applyThemeToState(state, presetMap)` — wipe + replace (one step)
 *   • `undoStep(state)` / `redoStep(state)` — walk the history stack
 *   • `dragSet(state, name, value)` / `endDrag(state)` — transient mutation
 *     pair for slider drags. `dragSet` lazily snapshots the pre-drag state on
 *     the first call, then mutates `overrides` in place WITHOUT persisting or
 *     pushing history. `endDrag` (driven by the slider's `change` event)
 *     records exactly ONE history entry for the whole drag and writes once to
 *     storage. Every other history-recording op auto-flushes a pending drag
 *     so a user can never end up with un-checkpointed state.
 *
 * `state` shape: `{ overrides, history: { past, future }, sanitize, persist, isKnown, limit, _dragSnap?: string|null }`.
 */

/**
 * Build a snapshot of the current overrides (stable JSON for compare + size cap).
 * @param {Record<string,string>} overrides
 */
export function snapshot(overrides) {
  return JSON.stringify(overrides);
}

/**
 * Restore a snapshot into the live override map (in place, so the proxy stays
 * the same object identity).
 * @param {Record<string,string>} overrides
 * @param {string} snap
 */
export function restore(overrides, snap) {
  let next = {};
  try { next = JSON.parse(snap) || {}; } catch { /* ignore */ }
  for (const k of Object.keys(overrides)) delete overrides[k];
  for (const [k, v] of Object.entries(next)) overrides[k] = v;
}

/**
 * Push a checkpoint onto the past stack; drops the redo branch.
 * @param {{ overrides:Record<string,string>, history:{past:string[],future:string[]}, limit:number }} s
 */
export function checkpoint(s) {
  const snap = snapshot(s.overrides);
  // Don't store no-ops (back-to-back identical snapshots).
  if (s.history.past.length && s.history.past[s.history.past.length - 1] === snap) return;
  s.history.past.push(snap);
  if (s.history.past.length > s.limit) s.history.past.shift();
  if (s.history.future.length) s.history.future.length = 0;
}

/** Undo one step. Returns true if anything was undone. */
export function undoStep(s) {
  endDrag(s); // a pending drag should commit before walking history
  if (!s.history.past.length) return false;
  const current = snapshot(s.overrides);
  const prev = s.history.past.pop();
  s.history.future.push(current);
  if (s.history.future.length > s.limit) s.history.future.shift();
  restore(s.overrides, prev);
  s.persist?.();
  return true;
}

/** Redo one step. Returns true if anything was redone. */
export function redoStep(s) {
  endDrag(s);
  if (!s.history.future.length) return false;
  const current = snapshot(s.overrides);
  const next = s.history.future.pop();
  s.history.past.push(current);
  if (s.history.past.length > s.limit) s.history.past.shift();
  restore(s.overrides, next);
  s.persist?.();
  return true;
}

/**
 * Transient drag-tick mutation. Mutates `overrides` in place so reactive
 * subscribers (live preview, ContrastBadge, slider track fill) update
 * immediately, but DOES NOT push history or persist to storage. The
 * pre-drag override map is snapshotted lazily on the first call so that a
 * subsequent `endDrag` can record exactly one history entry for the whole
 * drag, regardless of how many ticks the slider fired.
 *
 * Keyboard arrow-key edits work the same way: the first arrow press snapshots
 * via this function, subsequent ticks mutate, and the eventual `change` event
 * (on focus-loss / Enter) flushes via `endDrag`.
 *
 * @param {string} name token custom-property name
 * @param {string|number} value new value (will go through `s.sanitize`)
 */
export function dragSet(s, name, value) {
  if (s._dragSnap == null) {
    s._dragSnap = snapshot(s.overrides);
  }
  const safe = s.sanitize(value);
  if (safe === '') {
    delete s.overrides[name];
  } else {
    s.overrides[name] = safe;
  }
}

/**
 * Commit a pending drag: push its pre-drag snapshot onto the past stack
 * (so a single Ctrl+Z reverts the whole drag), drop the redo branch, and
 * persist once. No-op when no drag is pending or when nothing actually
 * changed since `dragSet` started.
 *
 * @returns {boolean} true if a history entry was recorded
 */
export function endDrag(s) {
  if (s._dragSnap == null) return false;
  const cur = snapshot(s.overrides);
  if (cur === s._dragSnap) {
    // The user touched the slider but ended up back at the original value.
    s._dragSnap = null;
    return false;
  }
  // Don't double-push if the immediately-preceding past entry is identical.
  if (!s.history.past.length || s.history.past[s.history.past.length - 1] !== s._dragSnap) {
    s.history.past.push(s._dragSnap);
    if (s.history.past.length > s.limit) s.history.past.shift();
  }
  s.history.future.length = 0;
  s._dragSnap = null;
  s.persist?.();
  return true;
}

/**
 * Set or clear a single token override. An empty/whitespace value (after
 * sanitisation) clears it.
 *
 * @param {{ overrides:Record<string,string>, history:any, limit:number, sanitize:(v:string)=>string, persist?:()=>void }} s
 * @param {string} name
 * @param {string} value
 */
export function setOne(s, name, value) {
  endDrag(s); // any pending drag commits first so its snapshot is preserved
  const safe = s.sanitize(value);
  if (safe === '') {
    if (!(name in s.overrides)) return false;
    checkpoint(s);
    delete s.overrides[name];
  } else {
    if (s.overrides[name] === safe) return false; // no-op
    checkpoint(s);
    s.overrides[name] = safe;
  }
  s.persist?.();
  return true;
}

/** Drop a single override. */
export function clearOne(s, name) {
  endDrag(s);
  if (!(name in s.overrides)) return false;
  checkpoint(s);
  delete s.overrides[name];
  s.persist?.();
  return true;
}

/** Drop every override (one history step). */
export function clearEvery(s) {
  endDrag(s);
  if (!Object.keys(s.overrides).length) return false;
  checkpoint(s);
  for (const k of Object.keys(s.overrides)) delete s.overrides[k];
  s.persist?.();
  return true;
}

/**
 * Replace the entire override set (used by CSS import). Unknown token names
 * (rejected by `isKnown`) are dropped so a stale paste can't poison the
 * catalogue.
 *
 * @returns {{ applied: number, skipped: string[] }}
 */
export function replaceAll(s, map) {
  endDrag(s);
  checkpoint(s);
  for (const k of Object.keys(s.overrides)) delete s.overrides[k];
  let applied = 0;
  const skipped = [];
  for (const [name, value] of Object.entries(map || {})) {
    const safe = s.sanitize(value);
    if (s.isKnown(name) && safe !== '') {
      s.overrides[name] = safe;
      applied += 1;
    } else {
      skipped.push(name);
    }
  }
  s.persist?.();
  return { applied, skipped };
}

/**
 * Bulk-set many tokens in a SINGLE history step. Pass `null` (or an empty
 * string) as a value to clear that token.
 *
 * Returns the count of tokens that actually changed; if nothing changed,
 * the history is left untouched.
 *
 * @param {Record<string, string|null>} patch
 */
export function patchMany(s, patch) {
  endDrag(s);
  if (!patch) return 0;
  let changed = 0;
  const planned = [];
  for (const [name, raw] of Object.entries(patch)) {
    if (!s.isKnown(name)) continue;
    const safe = raw == null ? '' : s.sanitize(raw);
    const had = name in s.overrides;
    if (safe === '' && !had) continue;
    if (safe !== '' && s.overrides[name] === safe) continue;
    planned.push({ name, safe });
    changed += 1;
  }
  if (!changed) return 0;
  checkpoint(s);
  for (const { name, safe } of planned) {
    if (safe === '') delete s.overrides[name];
    else s.overrides[name] = safe;
  }
  s.persist?.();
  return changed;
}

/**
 * Wipe the override store and replace it with the (already sanitised) preset
 * map, in a single history step.
 *
 * @param {Record<string,string>} sanitisedMap output of themes.sanitisePreset()
 */
export function applyThemeToState(s, sanitisedMap) {
  endDrag(s);
  checkpoint(s);
  for (const k of Object.keys(s.overrides)) delete s.overrides[k];
  for (const [k, v] of Object.entries(sanitisedMap || {})) s.overrides[k] = v;
  s.persist?.();
}
