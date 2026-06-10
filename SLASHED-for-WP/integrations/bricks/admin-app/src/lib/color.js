/**
 * Shared color / WCAG utilities.
 *
 * ⚠ PARITY MODULE — this file is kept byte-for-byte identical between the
 * framework configurator (SLASHED/configurator) and the WordPress plugin
 * admin app (SLASHED-Plugins/.../admin-app). The pure functions are covered
 * by an identical unit-test suite in both repos so the two tools can never
 * drift on contrast maths, palette suggestions, or level thresholds.
 *
 * Everything here is framework-agnostic and (except `resolveToRgb`, which
 * needs a browser canvas) runs in plain Node — keeping it trivially testable.
 */

/* ────────────────────────────────────────────────────────────────────────
 * sRGB ↔ luminance ↔ contrast (WCAG 2.1)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Linearise one 0–255 sRGB channel.
 * @param {number} c channel value 0–255
 * @returns {number} linear-light value 0–1
 */
export function toLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Relative luminance of an [r,g,b] triplet per WCAG 2.1.
 * @param {[number,number,number]} rgb
 * @returns {number} luminance 0–1
 */
export function relativeLuminance([r, g, b]) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Contrast ratio between two colors (1–21).
 * @param {[number,number,number]} rgb1
 * @param {[number,number,number]} rgb2
 * @returns {number} ratio in the range 1–21
 */
export function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1);
  const l2 = relativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG level for a contrast ratio, evaluated for normal-size text.
 * @param {number} ratio
 * @returns {'AAA'|'AA'|'AA-large'|'fail'}
 */
export function wcagLevel(ratio) {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-large';
  return 'fail';
}

/**
 * WCAG level for large text (≥ 24px, or ≥ 18.66px bold).
 * @param {number} ratio
 * @returns {'AAA'|'AA'|'fail'}
 */
export function wcagLevelLarge(ratio) {
  if (ratio >= 4.5) return 'AAA';
  if (ratio >= 3) return 'AA';
  return 'fail';
}

/**
 * Stable CSS-class suffix for a level badge, shared by both UIs.
 * @param {string} level
 * @returns {string}
 */
export function levelClass(level) {
  if (level === 'AAA') return 'badge--aaa';
  if (level === 'AA') return 'badge--aa';
  if (level === 'AA-large') return 'badge--aa-large';
  return 'badge--fail';
}

/* ────────────────────────────────────────────────────────────────────────
 * RGB ↔ HSL (pure, no browser dependency)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Convert 0–255 RGB to [h(0–360), s(0–100), l(0–100)].
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {[number,number,number]}
 */
export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

/**
 * Convert HSL (h 0–360, s/l 0–100) to a 0–255 [r,g,b] triplet.
 *
 * Pure replacement for the old canvas round-trip so palette maths runs (and
 * unit-tests) without a DOM.
 *
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {[number,number,number]}
 */
export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/* ────────────────────────────────────────────────────────────────────────
 * Browser color resolution
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Resolve any CSS color string to [r,g,b] using an offscreen canvas, so hex,
 * rgb()/hsl(), oklch() — anything the browser parser accepts — works without a
 * bespoke parser. Returns null in non-browser environments, for unsupported
 * values, or fully-transparent colors.
 *
 * @param {string} cssValue
 * @returns {[number,number,number]|null}
 */
export function resolveToRgb(cssValue) {
  if (!cssValue || typeof document === 'undefined') return null;
  if (typeof CSS !== 'undefined' && CSS.supports && !CSS.supports('color', cssValue)) {
    return null;
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillStyle = cssValue;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    if (a === 0) return null;
    return [r, g, b];
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Accessible palette optimizer (pure maths)
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Search a hue+saturation line for the value that clears a target WCAG
 * contrast ratio against a fixed surface, returning the *softest* passing
 * value — the one closest to the surface that still clears the bar — so
 * generated text/action colors are never needlessly heavy.
 *
 * The search direction adapts to the surface luminance: on a light surface it
 * prefers darker values, on a dark surface lighter ones, so it produces a
 * legible color for ANY locked base (not just near-white surfaces). Falls back
 * to the opposite direction if the preferred one can't clear the target.
 *
 * @param {number} hue 0–360, preserved from the source color
 * @param {number} sat 0–100 saturation held constant while scanning lightness
 * @param {[number,number,number]} surfaceRgb background to contrast against
 * @param {number} target minimum contrast ratio to clear (e.g. 7 or 4.5)
 * @returns {{ color: string, rgb: [number,number,number], ratio: number, locked: false } | null}
 */
export function bestTextOnSurface(hue, sat, surfaceRgb, target) {
  const surfaceL = rgbToHsl(...surfaceRgb)[2];
  const preferDark = relativeLuminance(surfaceRgb) >= 0.5;
  let best = null; // softest passing value in the preferred direction
  let bestAny = null; // softest passing value in any direction (fallback)
  for (let l = 0; l <= 100; l += 0.25) {
    const rgb = hslToRgb(hue, sat, l);
    const ratio = contrastRatio(rgb, surfaceRgb);
    if (ratio < target) continue;
    if (!bestAny || ratio < bestAny.ratio) bestAny = { rgb, ratio, l };
    const inDir = preferDark ? l <= surfaceL : l >= surfaceL;
    if (inDir && (!best || ratio < best.ratio)) best = { rgb, ratio, l };
  }
  const pick = best || bestAny;
  if (!pick) return null;
  return {
    color: `hsl(${hue.toFixed(1)} ${sat.toFixed(1)}% ${pick.l.toFixed(2)}%)`,
    rgb: pick.rgb,
    ratio: pick.ratio,
    locked: false,
  };
}

/**
 * Suggest an accessible BASE / Neutral / Action palette.
 *
 * Each role can be LOCKED via `locked`: a locked color is treated as a fixed
 * anchor — never regenerated, only echoed back with its measured ratio so the
 * UI can keep the user's exact value. Unlocked roles are generated to clear
 * WCAG against the surface while preserving their input hue. This is what lets
 * a user lock one or two brand colors and have the rest generated to comply.
 *
 * The surface used for contrast is BASE: when BASE is locked the user's actual
 * color becomes the surface (so a dark brand background still yields a legible
 * neutral + action); when BASE is unlocked a very light, lightly-tinted surface
 * is proposed (the previous default behavior).
 *
 * Pure: takes and returns RGB so it is fully unit-testable (no canvas).
 *
 * @param {object} input
 * @param {[number,number,number]} input.baseRgb    current BASE/surface color
 * @param {[number,number,number]} input.neutralRgb current body-text color
 * @param {[number,number,number]} input.actionRgb  current action/link color
 * @param {{ base?: boolean, neutral?: boolean, action?: boolean }} [input.locked]
 *        roles to keep fixed instead of regenerating
 * @returns {{
 *   base:    { color: string|null, rgb: [number,number,number], ratio: number|null, locked: boolean },
 *   neutral: { color: string|null, rgb: [number,number,number], ratio: number, locked: boolean } | null,
 *   action:  { color: string|null, rgb: [number,number,number], ratio: number, locked: boolean } | null
 * } | null}
 */
export function suggestAccessiblePalette({ baseRgb, neutralRgb, actionRgb, locked = {} }) {
  if (!baseRgb || !neutralRgb || !actionRgb) return null;

  const lockBase = !!locked.base;
  const lockNeutral = !!locked.neutral;
  const lockAction = !!locked.action;

  const [bH, bS] = rgbToHsl(...baseRgb);
  const [nH, nS] = rgbToHsl(...neutralRgb);
  const [aH, aS] = rgbToHsl(...actionRgb);

  // BASE / surface: locked → the user's actual color is the surface; unlocked
  // → a very light surface that keeps the hue tint but caps saturation.
  let baseColor;
  let baseResolved;
  if (lockBase) {
    baseResolved = baseRgb;
    baseColor = null;
  } else {
    const baseS = Math.min(bS, 8);
    baseColor = `hsl(${bH.toFixed(1)} ${baseS.toFixed(1)}% 97%)`;
    baseResolved = hslToRgb(bH, baseS, 97);
  }

  // NEUTRAL: value reaching AAA (7:1) on the surface; locked → kept as-is.
  const neutral = lockNeutral
    ? { color: null, rgb: neutralRgb, ratio: contrastRatio(neutralRgb, baseResolved), locked: true }
    : bestTextOnSurface(nH, Math.min(nS, 15), baseResolved, 7);

  // ACTION: value reaching AA (4.5:1) on the surface, richer saturation;
  // locked → kept as-is.
  const action = lockAction
    ? { color: null, rgb: actionRgb, ratio: contrastRatio(actionRgb, baseResolved), locked: true }
    : bestTextOnSurface(aH, Math.max(aS, 80), baseResolved, 4.5);

  return {
    base: { color: baseColor, rgb: baseResolved, ratio: null, locked: lockBase },
    neutral,
    action,
  };
}
