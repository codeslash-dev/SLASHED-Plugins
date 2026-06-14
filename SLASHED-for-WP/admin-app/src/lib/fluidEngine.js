/**
 * The framework's LIVE fluid engine — scalar-writing support.
 *
 * core/tokens.css derives every fluid step at use-time from a handful of
 * registered scalars (pow() inside clamp(); see tokens.css ~lines 244–298 and
 * 848–940):
 *
 *   --sf-text-{2xs…4xl}         ← --sf-text-base-{min,max} · --sf-text-ratio-{min,max}
 *   --sf-text-display-{s,m,l}   ← --sf-text-display-base-{min,max} · the TYPE ratios
 *   --sf-space-{2xs…4xl}        ← --sf-space-base-{min,max} · --sf-space-ratio-{min,max}
 *   (all of them)               ← --sf-fluid-{min,max}-vw — ONE shared viewport range
 *
 * So the scale generator writes those scalars instead of baking per-step
 * clamp() expressions: 4–6 numbers in the export instead of 9 walls of
 * calc(), and the engine stays live for later tweaks (including the
 * --sf-*-scale power knobs, which multiply the derived steps).
 *
 * Two cascade-critical rules encoded in buildEnginePatch():
 *   1. a scalar equal to its framework default is CLEARED (null), keeping
 *      the override CSS minimal and the apply idempotent;
 *   2. the ramp's per-step tokens are always nulled in the same patch —
 *      a previously baked clamp() override would otherwise mask the scalars.
 *
 * scale.js is a byte-parity module (mirrors the WP plugin) — engine
 * knowledge lives here, never there.
 *
 * Pure data + pure functions; unit-tested in tests/fluid-engine.test.js,
 * which also pins every default to the live catalogue value.
 */
import { TEXT_STEPS, SPACE_STEPS } from './scale.js';

/**
 * The shared viewport range — referenced by every fluid ramp in the
 * framework (text, display, space, custom fluid slots, header height).
 * Editing it moves all of them; the generator UI must say so.
 */
export const VIEWPORT_SCALARS = {
  vpMin: { token: '--sf-fluid-min-vw', default: 22.5 },
  vpMax: { token: '--sf-fluid-max-vw', default: 90 },
};

/**
 * Per-ramp engine definitions.
 *
 *   scalars      knob key → { token, default } (framework @property values)
 *   sharedRatios true when the ramp reuses the TYPE ratios instead of owning
 *                its own pair (the display ramp) — those knobs render
 *                read-only and are never written by this ramp
 *   stepTokens   the derived per-step tokens this ramp produces (nulled on
 *                apply so stale baked overrides can't mask the scalars)
 */
export const ENGINES = {
  type: {
    scalars: {
      baseMin:  { token: '--sf-text-base-min',  default: 1 },
      baseMax:  { token: '--sf-text-base-max',  default: 1.25 },
      ratioMin: { token: '--sf-text-ratio-min', default: 1.25 },
      ratioMax: { token: '--sf-text-ratio-max', default: 1.333 },
    },
    sharedRatios: false,
    stepTokens: TEXT_STEPS.map((s) => `--sf-text-${s.name}`),
  },
  display: {
    scalars: {
      baseMin: { token: '--sf-text-display-base-min', default: 2.4 },
      baseMax: { token: '--sf-text-display-base-max', default: 3 },
    },
    sharedRatios: true, // ratios come from the type scale (--sf-text-ratio-*)
    stepTokens: ['--sf-text-display-s', '--sf-text-display-m', '--sf-text-display-l'],
  },
  space: {
    scalars: {
      baseMin:  { token: '--sf-space-base-min',  default: 1 },
      baseMax:  { token: '--sf-space-base-max',  default: 2 },
      ratioMin: { token: '--sf-space-ratio-min', default: 1.25 },
      ratioMax: { token: '--sf-space-ratio-max', default: 1.333 },
    },
    sharedRatios: false,
    stepTokens: SPACE_STEPS.map((s) => `--sf-space-${s.name}`),
  },
};

/** Every token a ramp needs in the catalogue for scalar-writing to work. */
export function engineTokens(kind) {
  const e = ENGINES[kind];
  if (!e) return [];
  return [
    ...Object.values(e.scalars).map((s) => s.token),
    VIEWPORT_SCALARS.vpMin.token,
    VIEWPORT_SCALARS.vpMax.token,
  ];
}

/**
 * Format a knob number as a plain CSS value string.
 *
 * Rounds to at most 4 decimals, then deliberately strips trailing zeros via
 * parseFloat ("1.2500" → "1.25", "1.0000" → "1"): the trimmed form keeps the
 * exported CSS clean and matches how the framework writes its own defaults,
 * and `entry()` compares numerically so formatting never affects the
 * default-detection.
 */
function num(v) {
  return String(parseFloat(Number(v).toFixed(4)));
}

/** Default-aware entry: clear when the knob sits at the framework default. */
function entry(scalar, value) {
  const v = parseFloat(Number(value).toFixed(4));
  return v === scalar.default ? null : num(v);
}

/**
 * Build the override patch for one ramp, suitable for `patchOverrides()`
 * (single history step).
 *
 * @param {'type'|'display'|'space'} kind
 * @param {{ baseMin:number, baseMax:number, ratioMin?:number, ratioMax?:number, vpMin:number, vpMax:number }} knobs
 * @returns {Record<string, string|null>}
 */
export function buildEnginePatch(kind, knobs) {
  const e = ENGINES[kind];
  if (!e) return {};
  const patch = {};

  patch[e.scalars.baseMin.token] = entry(e.scalars.baseMin, knobs.baseMin);
  patch[e.scalars.baseMax.token] = entry(e.scalars.baseMax, knobs.baseMax);
  if (!e.sharedRatios) {
    patch[e.scalars.ratioMin.token] = entry(e.scalars.ratioMin, knobs.ratioMin);
    patch[e.scalars.ratioMax.token] = entry(e.scalars.ratioMax, knobs.ratioMax);
  }

  // The viewport range is shared across every ramp; same default-aware rule.
  patch[VIEWPORT_SCALARS.vpMin.token] = entry(VIEWPORT_SCALARS.vpMin, knobs.vpMin);
  patch[VIEWPORT_SCALARS.vpMax.token] = entry(VIEWPORT_SCALARS.vpMax, knobs.vpMax);

  // Clear any previously baked per-step clamp() overrides for this ramp —
  // they would shadow the live derivation and make the scalars look dead.
  for (const t of e.stepTokens) patch[t] = null;

  return patch;
}

/**
 * Patch that returns one ramp to the framework default: clears the ramp's
 * own scalars and per-step tokens. The shared viewport range is deliberately
 * left alone (other ramps may rely on it) — clear it via resetViewportPatch.
 *
 * @param {'type'|'display'|'space'} kind
 * @returns {Record<string, string|null>}
 */
export function resetEnginePatch(kind) {
  const e = ENGINES[kind];
  if (!e) return {};
  const patch = {};
  for (const s of Object.values(e.scalars)) patch[s.token] = null;
  for (const t of e.stepTokens) patch[t] = null;
  return patch;
}

/** Patch clearing the shared viewport range back to the framework default. */
export function resetViewportPatch() {
  return {
    [VIEWPORT_SCALARS.vpMin.token]: null,
    [VIEWPORT_SCALARS.vpMax.token]: null,
  };
}
