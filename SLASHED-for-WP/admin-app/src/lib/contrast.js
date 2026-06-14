/**
 * WCAG 2.x contrast ratio helpers.
 *
 * The configurator uses these to render an inline contrast badge next to
 * every color token: pass-or-fail at AA / AAA against the most-contrast text
 * colour (white or black) the token would face.
 *
 * The math is the WCAG 2.1 relative-luminance formula (sRGB → linear via the
 * piecewise gamma curve, then 0.2126·R + 0.7152·G + 0.0722·B). A future
 * upgrade could swap in APCA, but WCAG 2 is what most teams audit against
 * today and the math is unambiguous.
 */

/**
 * Parse a CSS `rgb(r g b[ / a])` or `rgb(r, g, b[, a])` string (the form
 * `getComputedStyle().color` returns) into `{r,g,b,a}` with channels in [0..1].
 * Returns `null` for anything else (e.g. `oklch(...)` — getComputedStyle
 * always serialises to rgb() in modern engines, but we guard anyway).
 *
 * @param {string} css
 * @returns {{r:number,g:number,b:number,a:number} | null}
 */
export function parseRgb(css) {
  if (!css || typeof css !== 'string') return null;
  const m = /^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)(?:[\s,/]+([0-9.]+%?))?\s*\)\s*$/i.exec(css);
  if (!m) return null;
  const r = parseFloat(m[1]) / 255;
  const g = parseFloat(m[2]) / 255;
  const b = parseFloat(m[3]) / 255;
  let a = 1;
  if (m[4] != null) {
    a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    if (!Number.isFinite(a)) a = 1;
  }
  return { r, g, b, a };
}

/**
 * Standard sRGB → linear-light gamma decode (per WCAG 2.x).
 * @param {number} c channel in [0..1]
 */
function gammaToLinear(c) {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Relative luminance of an sRGB color (channels in [0..1]).
 * @param {{r:number,g:number,b:number}} rgb
 */
export function relativeLuminance({ r, g, b }) {
  const R = gammaToLinear(r);
  const G = gammaToLinear(g);
  const B = gammaToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * WCAG 2.x contrast ratio between two relative luminances.
 * @param {number} l1
 * @param {number} l2
 */
export function contrastRatio(l1, l2) {
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Best WCAG ratio of the given color against pure white OR pure black,
 * whichever pairs better. The returned `against` says which one won so the UI
 * can preview text in that colour.
 *
 * @param {{r:number,g:number,b:number}} rgb
 * @returns {{ ratio: number, against: 'white'|'black' }}
 */
export function bestContrastVsBW(rgb) {
  const l = relativeLuminance(rgb);
  const vsWhite = contrastRatio(l, 1);   // luminance of pure white = 1
  const vsBlack = contrastRatio(l, 0);   // luminance of pure black = 0
  return vsWhite >= vsBlack
    ? { ratio: vsWhite, against: 'white' }
    : { ratio: vsBlack, against: 'black' };
}

/**
 * Map a contrast ratio to a WCAG badge.
 *
 * Thresholds (WCAG 2.1):
 *   - AAA  ≥ 7.0  (normal text)
 *   - AA   ≥ 4.5  (normal text)
 *   - AA-L ≥ 3.0  (large text / non-text UI)
 *   - fail otherwise
 *
 * @param {number} ratio
 * @returns {{ level: 'AAA'|'AA'|'AA-L'|'fail', label: string }}
 */
export function wcagLevel(ratio) {
  if (!Number.isFinite(ratio) || ratio <= 0) return { level: 'fail', label: 'fail' };
  if (ratio >= 7)   return { level: 'AAA', label: 'AAA' };
  if (ratio >= 4.5) return { level: 'AA',  label: 'AA' };
  if (ratio >= 3)   return { level: 'AA-L', label: 'AA Large' };
  return { level: 'fail', label: 'fail' };
}

/**
 * One-shot helper: given a computed `rgb()` string (from
 * `getComputedStyle`), return the contrast badge data ready for the UI.
 *
 * @param {string} computedCss
 * @returns {{ ratio: number, against: 'white'|'black', level: string, label: string } | null}
 */
export function contrastInfo(computedCss) {
  const rgb = parseRgb(computedCss);
  if (!rgb) return null;
  if (rgb.a < 0.5) return null; // too transparent for a meaningful contrast read
  const { ratio, against } = bestContrastVsBW(rgb);
  const { level, label } = wcagLevel(ratio);
  return { ratio: Math.round(ratio * 10) / 10, against, level, label };
}
