/**
 * Shared system font-stack catalogue.
 *
 * ⚠ PARITY MODULE — kept byte-for-byte identical between the framework
 * configurator and the WordPress plugin admin app, with an identical unit-test
 * suite in both repos.
 *
 * Curated modern system-font stacks (after modern-font-stacks). These load no
 * web fonts — they map to fonts already present on the user's OS — so they are
 * the safest, fastest default for any `--sf-font-*` token.
 */

/** @type {Array<{label: string, value: string}>} */
export const SYSTEM_STACKS = [
  { label: 'System UI', value: 'system-ui, sans-serif' },
  {
    label: 'Neo-Grotesque',
    value:
      "Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif",
  },
  {
    label: 'Geometric Humanist',
    value: "Avenir, Montserrat, Corbel, 'URW Gothic', source-sans-pro, sans-serif",
  },
  {
    label: 'Classical Humanist',
    value: "Optima, Candara, 'Noto Sans', source-sans-pro, sans-serif",
  },
  {
    label: 'Humanist Sans',
    value:
      "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif",
  },
  {
    label: 'Industrial Sans',
    value:
      "'Bahnschrift', 'DIN Alternate', 'Franklin Gothic Medium', 'Nimbus Sans Narrow', sans-serif-condensed, sans-serif",
  },
  {
    label: 'Rounded Sans',
    value:
      "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT Bold', Calibri, source-sans-pro, sans-serif",
  },
  {
    label: 'Transitional Serif',
    value: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, serif",
  },
  {
    label: 'Old Style Serif',
    value: "'Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', P052, serif",
  },
  {
    label: 'Slab Serif',
    value:
      "Rockwell, 'Rockwell Nova', 'Roboto Slab', 'DejaVu Serif', 'Sitka Small', serif",
  },
  {
    label: 'Antique Serif',
    value:
      "Superclarendon, 'Bookman Old Style', 'URW Bookman', 'URW Bookman L', 'Georgia Pro', Georgia, serif",
  },
  {
    label: 'Didone Serif',
    value: "Didact Gothic, 'Bodoni MT', 'Bodoni 72', Didot, 'Playfair Display', serif",
  },
  {
    label: 'Monospace',
    value:
      "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
  },
  {
    label: 'Handwritten',
    value: "'Segoe Print', 'Bradley Hand', Chilanka, TSCu_Comic, casual, cursive",
  },
];

/**
 * Find the curated system stack matching a stored value (case-insensitive,
 * whitespace-normalised), or null when the value isn't one of them.
 *
 * @param {string} value
 * @returns {{label:string, value:string}|null}
 */
export function detectSystemStack(value) {
  if (!value) return null;
  const norm = String(value).replace(/\s+/g, ' ').trim().toLowerCase();
  return (
    SYSTEM_STACKS.find(
      (s) => s.value.replace(/\s+/g, ' ').trim().toLowerCase() === norm
    ) ?? null
  );
}

/**
 * True when a token name/namespace denotes a font-family token.
 *
 * Uses a narrow pattern so that sibling `font` tokens — weight scale
 * (--sf-font-weight-*), OpenType features (--sf-font-features),
 * numeric variant (--sf-font-numeric) and variation settings
 * (--sf-font-variation) — are NOT classified as font-family and therefore
 * do NOT get the System-stack picker + preview row.
 *
 * @param {object} token a catalogue token row
 * @returns {boolean}
 */
export function isFontFamilyToken(token) {
  if (!token) return false;
  // Explicit syntax annotation is the most reliable signal.
  if (/font-family/i.test(token.syntax || '')) return true;
  // Name pattern: --sf-font-* BUT NOT weight/features/numeric/variation tokens.
  if (/^--sf-font-(?!weight[-_]|features$|numeric$|variation$)/.test(token.name || '')) return true;
  return false;
}
