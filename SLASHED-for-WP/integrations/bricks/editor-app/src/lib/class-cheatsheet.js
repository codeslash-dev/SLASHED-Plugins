/**
 * Colour / surface class cheatsheet — pure, DOM-free data.
 *
 * A curated reference of the framework's colour- and surface-related utility
 * classes (`.sf-surface--*`, coloured `.sf-btn--*`, `.sf-marker--*`, text /
 * link colour helpers…), grouped into tabs for the Color System panel.
 *
 * Why a hand-curated list rather than the full class inventory:
 *   - The panel is a *colour* tool, so only colour/surface classes belong here
 *     — sizes, layout primitives, a11y helpers etc. would be noise.
 *   - These are stable core macros/components; a curated list with written
 *     descriptions gives a cleaner cheatsheet than the raw inventory (whose
 *     bundled descriptions are terse/auto-generated) and mirrors the curated
 *     Quick-Use pattern already used in color-model.js.
 *
 * Each class is a plain CSS class name (no `.`), copied verbatim to the
 * clipboard on click — a reference, not an apply-to-element action.
 *
 * @module class-cheatsheet
 */

/**
 * Tabs, in display order. Each group is one tab; `classes` are the rows shown
 * when that tab is active.
 *
 * @type {Array<{ id: string, label: string, blurb: string, classes: Array<{ name: string, desc: string }> }>}
 */
export const CLASS_CHEATSHEET_GROUPS = [
  {
    id: 'surfaces',
    label: 'Surfaces',
    blurb: 'Background + auto-contrasting text as one class. Apply to a section, card or wrapper.',
    classes: [
      { name: 'sf-surface',            desc: 'Generic semantic surface — sets --sf-surface-color as background with a contrasting text colour.' },
      { name: 'sf-surface--primary',   desc: 'Surface in the primary brand palette.' },
      { name: 'sf-surface--secondary', desc: 'Surface in the secondary brand palette.' },
      { name: 'sf-surface--tertiary',  desc: 'Surface in the tertiary brand palette.' },
      { name: 'sf-surface--action',    desc: 'Surface in the action palette (CTA / interactive).' },
      { name: 'sf-surface--neutral',   desc: 'Surface in the neutral (muted / grey) palette.' },
      { name: 'sf-surface--inverse',   desc: 'Always-inverted surface: dark in light mode, light in dark mode.' },
      { name: 'sf-surface--success',   desc: 'Surface in the success status palette.' },
      { name: 'sf-surface--warning',   desc: 'Surface in the warning status palette.' },
      { name: 'sf-surface--info',      desc: 'Surface in the info status palette.' },
      { name: 'sf-surface--danger',    desc: 'Surface in the danger status palette.' },
      { name: 'sf-surface-bg',         desc: 'Named background-surface preset composing the --sf-surface-bg-* token set (colour + image + overlay).' },
      { name: 'sf-bg-layer',           desc: 'Absolutely-positioned cover media sitting behind a parent’s content (auto-promotes the parent to a stacking context).' },
    ],
  },
  {
    id: 'buttons',
    label: 'Buttons',
    blurb: 'Colour family + fill style for .sf-btn elements. Combine one family with one style modifier.',
    classes: [
      { name: 'sf-btn--primary',   desc: 'Button in the primary brand colour family.' },
      { name: 'sf-btn--secondary', desc: 'Button in the secondary brand colour family.' },
      { name: 'sf-btn--tertiary',  desc: 'Button in the tertiary brand colour family.' },
      { name: 'sf-btn--action',    desc: 'Button in the action colour family (the unmodified default, named explicitly).' },
      { name: 'sf-btn--base',      desc: 'Button in the base (surface-neutral) colour family.' },
      { name: 'sf-btn--neutral',   desc: 'Button in the neutral colour family.' },
      { name: 'sf-btn--success',   desc: 'Button in the success (positive) colour family.' },
      { name: 'sf-btn--warning',   desc: 'Button in the warning (caution) colour family.' },
      { name: 'sf-btn--info',      desc: 'Button in the info colour family.' },
      { name: 'sf-btn--danger',    desc: 'Button in the danger (destructive) colour family.' },
      { name: 'sf-btn--outline',   desc: 'Outlined style: coloured border/text, transparent fill that fills with the family colour on hover.' },
      { name: 'sf-btn--soft',      desc: 'Soft tonal fill: a light wash of the family colour, muted on hover.' },
      { name: 'sf-btn--gradient',  desc: 'Paints the fill (or, with --outline, the border ring) with the family gradient.' },
    ],
  },
  {
    id: 'text',
    label: 'Text & links',
    blurb: 'Colour treatments for inline text and links.',
    classes: [
      { name: 'sf-text-gradient', desc: 'Clips a brand gradient to inline text (transparent text over a gradient background).' },
      { name: 'sf-text-protect',  desc: 'Translucent dark gradient behind text to keep it legible over a light / busy background image.' },
      { name: 'sf-link--subtle',  desc: 'Renders a link in the body text colour instead of the action colour; underline still shows on hover.' },
    ],
  },
  {
    id: 'markers',
    label: 'Markers',
    blurb: 'Colour the ::marker of list items.',
    classes: [
      { name: 'sf-marker--primary',   desc: 'Colours list ::markers with the primary brand colour.' },
      { name: 'sf-marker--secondary', desc: 'Colours list ::markers with the secondary brand colour.' },
      { name: 'sf-marker--tertiary',  desc: 'Colours list ::markers with the tertiary brand colour.' },
      { name: 'sf-marker--action',    desc: 'Colours list ::markers with the action colour.' },
    ],
  },
  {
    id: 'effects',
    label: 'Effects',
    blurb: 'Colour-driven motion.',
    classes: [
      { name: 'sf-color-pulse', desc: 'Gentle colour-pulse animation to draw attention to a changing value (respects reduced-motion).' },
    ],
  },
];

/**
 * Total number of classes across all groups.
 * @returns {number}
 */
export function cheatsheetCount() {
  return CLASS_CHEATSHEET_GROUPS.reduce((n, g) => n + g.classes.length, 0);
}

/**
 * Filter the cheatsheet by a free-text query, matching the class name or its
 * description (case-insensitive). Returns groups with only matching classes;
 * empty groups are dropped. An empty query returns all groups unchanged.
 *
 * @param {string} query
 * @returns {Array<{ id: string, label: string, blurb: string, classes: Array<{ name: string, desc: string }> }>}
 */
export function filterCheatsheet(query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return CLASS_CHEATSHEET_GROUPS;

  const out = [];
  for (const group of CLASS_CHEATSHEET_GROUPS) {
    const classes = group.classes.filter(
      (c) => c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)
    );
    if (classes.length) out.push({ ...group, classes });
  }
  return out;
}
