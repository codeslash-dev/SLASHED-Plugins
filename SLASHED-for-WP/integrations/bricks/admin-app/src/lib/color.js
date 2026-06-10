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

/**
 * Find the integer hue (0–359) on the color wheel that is maximally distant
 * from every hue already in use — i.e. the middle of the widest gap. Used to
 * place generated brand colors so they stay visually distinct from the ones
 * you locked. Distance is measured the short way around the circle.
 *
 * @param {number[]} usedHues hues (degrees) already taken
 * @returns {number} hue in [0, 359]
 */
export function farthestHue(usedHues) {
  if (!usedHues || usedHues.length === 0) return 0;
  const norm = usedHues.map((u) => ((u % 360) + 360) % 360);
  let bestHue = 0;
  let bestDist = -1;
  for (let h = 0; h < 360; h += 1) {
    let min = 360;
    for (const u of norm) {
      const raw = Math.abs(h - u);
      const d = Math.min(raw, 360 - raw);
      if (d < min) min = d;
    }
    if (min > bestDist) {
      bestDist = min;
      bestHue = h;
    }
  }
  return bestHue;
}

/**
 * Generate a full BRAND palette (primary / secondary / tertiary / action) from
 * a partial one — the "the client gave us one or two brand colors, fill in the
 * rest, WCAG-compliant" workflow.
 *
 * LOCKED roles are kept exactly as the user set them (echoed back with their
 * measured ratio). UNLOCKED roles are generated so they:
 *   1. sit in the widest hue gaps left by the locked colors, so the palette
 *      stays visually distinct and balanced around the wheel; and
 *   2. clear a WCAG contrast target against the surface (default AA 4.5:1), so
 *      each generated color is usable as an accessible accent/text/link.
 *
 * Generated colors take their saturation from the average of the locked
 * anchors (so the set feels cohesive), with a floor so they stay lively. Pure
 * RGB in / RGB out — no DOM — so it is fully unit-testable.
 *
 * @param {object} input
 * @param {Record<string,[number,number,number]>} input.roles resolved RGB per
 *        role; unresolvable roles may be omitted.
 * @param {[number,number,number]} input.surfaceRgb background to contrast against
 * @param {Record<string,boolean>} [input.locked] roles to keep fixed
 * @param {number} [input.target] minimum contrast vs surface (default 4.5 = AA)
 * @returns {Record<string, { color: string|null, rgb: [number,number,number], ratio: number, locked: boolean } | null> | null}
 */
export function suggestBrandPalette({ roles = {}, surfaceRgb, locked = {}, target = 4.5 }) {
  if (!surfaceRgb) return null;
  const order = ['primary', 'secondary', 'tertiary', 'action'];

  // Seed the scheme from the locked anchors' hues + saturations.
  const usedHues = [];
  const lockedSats = [];
  for (const role of order) {
    if (locked[role] && roles[role]) {
      const [h, s] = rgbToHsl(...roles[role]);
      usedHues.push(h);
      lockedSats.push(s);
    }
  }
  const avgLockedSat = lockedSats.length
    ? lockedSats.reduce((a, b) => a + b, 0) / lockedSats.length
    : null;

  const result = {};
  for (const role of order) {
    // Locked role: keep as-is, report its measured contrast vs the surface.
    if (locked[role] && roles[role]) {
      const rgb = roles[role];
      result[role] = { color: null, rgb, ratio: contrastRatio(rgb, surfaceRgb), locked: true };
      continue;
    }
    // Pick a hue in the widest gap (or this role's own hue if nothing taken).
    const hue = usedHues.length
      ? farthestHue(usedHues)
      : roles[role]
        ? rgbToHsl(...roles[role])[0]
        : 0;
    usedHues.push(hue);
    // Cohesive, lively saturation.
    let sat = avgLockedSat;
    if (sat == null) sat = roles[role] ? rgbToHsl(...roles[role])[1] : 70;
    sat = Math.max(sat, 45);
    // Most surface-friendly value on that hue that still clears the target.
    const hit = bestTextOnSurface(hue, sat, surfaceRgb, target);
    result[role] = hit
      ? { color: hit.color, rgb: hit.rgb, ratio: hit.ratio, locked: false }
      : null;
  }
  return result;
}

/**
 * The single, unified accessible-palette generator. ONE surface, ONE lock set,
 * everything generated coherently against each other so the foundation
 * (base + neutral) and the brand accents (primary / secondary / tertiary /
 * action) never drift apart.
 *
 * It composes the lower-level helpers rather than duplicating them:
 *   - the SURFACE is `base` (kept if locked, else a light tinted surface);
 *   - `neutral` becomes body text clearing AAA on that surface;
 *   - the brand accents are spread into the widest hue gaps left by the locked
 *     colors and each clears AA on that same surface.
 *
 * Any subset of roles can be locked; locked roles are echoed back untouched
 * with their measured ratio, the rest are generated. Roles whose RGB isn't
 * supplied are simply omitted from the result. Pure RGB in / out.
 *
 * @param {object} input
 * @param {{ base?:[number,number,number], neutral?:[number,number,number], primary?:[number,number,number], secondary?:[number,number,number], tertiary?:[number,number,number], action?:[number,number,number] }} input.roles
 * @param {Record<string,boolean>} [input.locked]
 * @param {number} [input.neutralTarget] body-text contrast target (default 7 = AAA)
 * @param {number} [input.accentTarget]  brand-accent contrast target (default 4.5 = AA)
 * @returns {Record<string, { color: string|null, rgb: [number,number,number], ratio: number|null, locked: boolean } | null> | null}
 */
export function suggestPalette({ roles = {}, locked = {}, neutralTarget = 7, accentTarget = 4.5 }) {
  if (!roles.base) return null;

  // 1. Surface = base. Locked → the user's base IS the surface; unlocked → a
  //    light, lightly-tinted surface (keeps the hue, caps saturation).
  const [bH, bS] = rgbToHsl(...roles.base);
  let surfaceRgb;
  let baseColor;
  if (locked.base) {
    surfaceRgb = roles.base;
    baseColor = null;
  } else {
    const s = Math.min(bS, 8);
    baseColor = `hsl(${bH.toFixed(1)} ${s.toFixed(1)}% 97%)`;
    surfaceRgb = hslToRgb(bH, s, 97);
  }

  const out = {};
  out.base = { color: baseColor, rgb: surfaceRgb, ratio: null, locked: !!locked.base };

  // 2. Neutral (body text) → AAA on the surface.
  if (roles.neutral) {
    if (locked.neutral) {
      out.neutral = { color: null, rgb: roles.neutral, ratio: contrastRatio(roles.neutral, surfaceRgb), locked: true };
    } else {
      const [nH, nS] = rgbToHsl(...roles.neutral);
      out.neutral = bestTextOnSurface(nH, Math.min(nS, 15), surfaceRgb, neutralTarget);
    }
  }

  // 3. Brand accents → distinct hues, AA on the SAME surface (shared logic).
  const brand = suggestBrandPalette({
    roles: {
      primary: roles.primary,
      secondary: roles.secondary,
      tertiary: roles.tertiary,
      action: roles.action,
    },
    surfaceRgb,
    locked: {
      primary: locked.primary,
      secondary: locked.secondary,
      tertiary: locked.tertiary,
      action: locked.action,
    },
    target: accentTarget,
  });
  for (const role of ['primary', 'secondary', 'tertiary', 'action']) {
    if (roles[role]) out[role] = brand[role];
  }

  return out;
}
