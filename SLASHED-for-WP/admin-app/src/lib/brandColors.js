/**
 * Brand-color utilities for the light/dark pairing UI.
 *
 * The framework stores brand colors as `-light` knobs and derives the dark
 * variant automatically via `oklch(from L …)` relative-color math in the
 * `light-dark()` expression on `--sf-color-X`. Users can optionally override
 * the dark variant by setting `--sf-color-X-dark`.
 *
 * This module exposes the JavaScript equivalent of that auto-dark formula so
 * the configurator can preview the computed dark swatch without needing the
 * browser to resolve the full CSS expression.
 */

/**
 * Brand colors shown in the light/dark pairing section.
 * Ordered: surface colours first (base/neutral), then brand, then status.
 */
export const BRAND_COLOR_KEYS = [
  { key: 'base',      label: 'Base',      group: 'brand' },
  { key: 'neutral',   label: 'Neutral',   group: 'brand' },
  { key: 'primary',   label: 'Primary',   group: 'brand' },
  { key: 'secondary', label: 'Secondary', group: 'brand' },
  { key: 'tertiary',  label: 'Tertiary',  group: 'brand' },
  { key: 'action',    label: 'Action',    group: 'status' },
  { key: 'success',   label: 'Success',   group: 'status' },
  { key: 'warning',   label: 'Warning',   group: 'status' },
  { key: 'error',     label: 'Error',     group: 'status' },
  { key: 'info',      label: 'Info',      group: 'status' },
  { key: 'danger',    label: 'Danger',    group: 'status' },
];

/**
 * Parse a plain `oklch(L C H)` or `oklch(L C H / alpha)` string.
 * Returns null if the value is not in that form (e.g. it's a var() reference).
 * @param {string} value
 * @returns {{ l: number, c: number, h: number } | null}
 */
export function parseOklch(value) {
  if (!value) return null;
  const m = /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/[^)]+)?\s*\)$/i.exec(value.trim());
  if (!m) return null;
  const rawL = m[1];
  const l = rawL.endsWith('%') ? parseFloat(rawL) / 100 : parseFloat(rawL);
  return { l, c: parseFloat(m[2]), h: parseFloat(m[3]) };
}

/**
 * Compute the auto-dark OKLCH value from a light-mode OKLCH color, using the
 * same formula embedded in `core/tokens.css` for each brand color:
 *
 *   standard:  oklch(from L  clamp(0.65, 0.95 - l*0.5, 0.88)  c*0.9  h)
 *   base:      oklch(from L  clamp(0.16, 1.18 - l,     0.24)   c*0.5  h)
 *
 * Returns null when the input cannot be parsed as a plain oklch() literal
 * (e.g. it uses var() or another function) — callers should fall back to the
 * probe-host measurement in that case.
 *
 * @param {string} lightValue  CSS value of the `--sf-color-X-light` token
 * @param {string} colorKey    e.g. 'primary', 'base', 'neutral', …
 * @returns {string | null}    `oklch(L C H)` string or null
 */
export function computeAutoDark(lightValue, colorKey) {
  const parsed = parseOklch(lightValue);
  if (!parsed) return null;

  const { l, c, h } = parsed;
  let newL, newC;

  if (colorKey === 'base') {
    newL = Math.max(0.16, Math.min(0.24, 1.18 - l));
    newC = c * 0.5;
  } else {
    newL = Math.max(0.65, Math.min(0.88, 0.95 - l * 0.5));
    newC = c * 0.9;
  }

  return `oklch(${newL.toFixed(3)} ${newC.toFixed(3)} ${h})`;
}
