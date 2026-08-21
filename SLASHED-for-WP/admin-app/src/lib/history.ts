/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Undo-history coalescing.
 *
 * A slider drag fires `input` on every tick, so without coalescing a single
 * gesture pushes dozens of near-identical snapshots onto the undo stack and one
 * Ctrl+Z rewinds a single pixel of movement. These pure helpers let the store
 * merge a run of consecutive edits to the *same* token into one history entry:
 * the first change opens a group, subsequent same-token changes within a short
 * window extend it (no new snapshot), and any different edit — or a pause —
 * starts a fresh group.
 */

/** The single-token key currently being coalesced, and when it last changed. */
export interface CoalesceState {
  key: string | null;
  time: number;
}

export const NO_COALESCE: CoalesceState = { key: null, time: 0 };

/** Keys whose value differs between two flat override maps. */
export function changedKeys(
  prev: Record<string, string>,
  next: Record<string, string>,
): string[] {
  const all = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const out: string[] = [];
  for (const k of all) {
    if (prev[k] !== next[k]) out.push(k);
  }
  return out;
}

/**
 * Whether this change should be merged into the current history group rather
 * than pushed as a new undo step. True only when the change touches exactly one
 * token, it's the same token as the open group, and it arrived within
 * `windowMs` of the previous change (a continuous gesture).
 */
export function shouldCoalesce(
  state: CoalesceState,
  changed: string[],
  now: number,
  windowMs = 600,
): boolean {
  if (changed.length !== 1) return false;
  if (state.key === null || state.key !== changed[0]) return false;
  return now - state.time <= windowMs;
}
