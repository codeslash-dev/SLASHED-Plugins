#!/usr/bin/env node
/**
 * Generates data/classes-hints.json — a map of .sf-* / .is-* class names to
 * short descriptions extracted from the section comments in the CSS source.
 *
 * Format:
 *   { "sf-stack": "Flex column with even vertical spacing between children.",
 *     "sf-stack--xs": "Flex column with even vertical spacing between children.",
 *     ... }
 *
 * Modifier classes (e.g. sf-stack--xl) inherit their parent's description.
 * Descriptions are the first non-blank line after the section heading comment.
 *
 * Usage:
 *   node scripts/gen-class-hints.js          — write data/classes-hints.json
 *   node scripts/gen-class-hints.js --check  — exit 1 if file is stale
 */

import fs   from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
// Class descriptions are parsed from the SLASHED framework's CSS source files,
// which live in a separate repo. Point SLASHED_FRAMEWORK_DIR at a local
// checkout; defaults to a sibling ../SLASHED checkout.
const FRAMEWORK = process.env.SLASHED_FRAMEWORK_DIR
  ? path.resolve(process.env.SLASHED_FRAMEWORK_DIR)
  : fs.existsSync(path.join(ROOT, '.framework'))
    ? path.join(ROOT, '.framework')
    : path.resolve(ROOT, '..', 'SLASHED');
const OUT  = path.join(ROOT, 'SLASHED-for-WP', 'data', 'classes-hints.json');

// Files to parse, in generation order. Must match FILE_META in gen-class-reference.js.
const SOURCE_FILES = [
  { file: 'core/layout.css',        category: 'Layout' },
  { file: 'core/macros.css',        category: 'Macros' },
  { file: 'core/states.css',        category: 'States' },
  { file: 'core/accessibility.css', category: 'Accessibility' },
  { file: 'core/motion.css',        category: 'Motion' },
  { file: 'core/print.css',         category: 'Print' },
  { file: 'optional/forms.css',     category: 'Forms' },
];

// Curated overrides — always win over auto-parsed CSS-comment descriptions.
// Use this for classes whose section comment produces a wrong/shared/truncated hint.
const OVERRIDE_HINTS = {
  // Bento container variants inherit the section description instead of getting their own.
  'sf-bento':          { description: 'Auto-fill bento grid for card dashboards. Children span 1 column by default; use span modifiers (sf-bento-wide, sf-bento-tall, sf-bento-full, sf-bento-featured) to break the grid.', category: 'Layout' },
  'sf-bento--2':       { description: 'Bento grid variant with a 2-column base layout.', category: 'Layout' },
  'sf-bento--3':       { description: 'Bento grid variant with a 3-column base layout.', category: 'Layout' },
  'sf-bento--6':       { description: 'Bento grid variant with a 6-column base layout.', category: 'Layout' },
  'sf-bento--compact': { description: 'Bento grid variant with shorter default row height.', category: 'Layout' },
  'sf-bento--tall':    { description: 'Bento grid variant with taller default row height.', category: 'Layout' },
  'sf-bento-wide':     { description: 'Span modifier for a bento item: spans 2 columns (wide card).', category: 'Layout' },
  'sf-bento-full':     { description: 'Span modifier for a bento item: stretches across all columns (full-width banner).', category: 'Layout' },
  'sf-bento-tall':     { description: 'Span modifier for a bento item: doubles the row height (tall card).', category: 'Layout' },
  'sf-bento-featured': { description: 'Span modifier for a bento item: takes up 2×2 cells (featured hero placement).', category: 'Layout' },
  // Surface section comment is multi-line; auto-parser only captures the first line.
  'sf-surface':           { description: 'Generic semantic surface: applies --sf-surface-color as the background and automatically sets a contrasting text color. Tone variants (--primary, --action, etc.) activate preset palettes.', category: 'Macros' },
  'sf-surface--primary':  { description: 'Surface variant using the primary brand color palette.', category: 'Macros' },
  'sf-surface--secondary':{ description: 'Surface variant using the secondary brand color palette.', category: 'Macros' },
  'sf-surface--tertiary': { description: 'Surface variant using the tertiary brand color palette.', category: 'Macros' },
  'sf-surface--action':   { description: 'Surface variant using the action color palette (button/CTA primary color).', category: 'Macros' },
  'sf-surface--neutral':  { description: 'Surface variant using the neutral palette (muted/gray).', category: 'Macros' },
  'sf-surface--inverse':  { description: 'Surface variant that inverts light/dark, creating an always-dark surface in light mode and always-light in dark mode.', category: 'Macros' },
  'sf-surface--success':  { description: 'Surface variant using the success status palette.', category: 'Macros' },
  'sf-surface--warning':  { description: 'Surface variant using the warning status palette.', category: 'Macros' },
  'sf-surface--error':    { description: 'Surface variant using the error status palette.', category: 'Macros' },
  'sf-surface--info':     { description: 'Surface variant using the info status palette.', category: 'Macros' },
  'sf-surface--danger':   { description: 'Surface variant using the danger status palette.', category: 'Macros' },
  // Overflow fade and no-tap-highlight section comments are parsed correctly
  // but the first line alone is incomplete.
  'sf-overflow-fade':     { description: 'Adds a gradient fade at the inline-end of an overflowing element to hint at hidden content. Use inside sf-reel or any scroll container.', category: 'Macros' },
  'sf-no-tap-highlight':  { description: 'Removes the mobile tap highlight color (-webkit-tap-highlight-color: transparent). Use on interactive elements with a custom active state.', category: 'Macros' },
};

// Manual descriptions for classes whose source format can't be auto-parsed.
// States use /* === SECTION === */ comments with no inline descriptions.
const MANUAL_HINTS = {
  'is-hidden':      { description: 'Hides the element (display: none). Toggled by JS or ARIA.', category: 'States' },
  'is-invisible':   { description: 'Makes the element invisible but still occupies space.', category: 'States' },
  'is-visible':     { description: 'Forces visibility: visible on a hidden element.', category: 'States' },
  'is-disabled':    { description: 'Marks the element as non-interactive. Reduces opacity and blocks pointer events.', category: 'States' },
  'is-readonly':    { description: 'Marks the element as read-only. Reduces opacity; pointer events still active.', category: 'States' },
  'is-loading':     { description: 'Indicates the element is in a loading state. Shows a spinner cursor.', category: 'States' },
  'is-current':     { description: 'Marks the element as the current item (e.g. active nav link).', category: 'States' },
  'is-active':      { description: 'Marks the element as active/selected.', category: 'States' },
  'is-selected':    { description: 'Marks the element as selected.', category: 'States' },
  'is-expanded':    { description: 'Marks the element as expanded (e.g. accordion open).', category: 'States' },
  'is-collapsed':   { description: 'Marks the element as collapsed.', category: 'States' },
  'is-open':        { description: 'Marks the element as open (e.g. dropdown visible).', category: 'States' },
  'is-closed':      { description: 'Marks the element as closed.', category: 'States' },
  'is-checked':     { description: 'Marks the element as checked.', category: 'States' },
  'is-indeterminate': { description: 'Marks a checkbox as indeterminate.', category: 'States' },
  'is-valid':       { description: 'Marks a form field as passing validation.', category: 'States' },
  'is-invalid':     { description: 'Marks a form field as failing validation.', category: 'States' },
  'is-required':    { description: 'Marks a form field as required.', category: 'States' },
  'is-error':       { description: 'Marks the element as being in an error state.', category: 'States' },
  'is-success':     { description: 'Marks the element as being in a success state.', category: 'States' },
  'is-warning':     { description: 'Marks the element as being in a warning state.', category: 'States' },
  'is-info':        { description: 'Marks the element as carrying informational state.', category: 'States' },
  'is-sticky':      { description: 'Applies position: sticky with top: 0.', category: 'States' },
  'is-fixed':       { description: 'Applies position: fixed.', category: 'States' },
  'is-pinned':      { description: 'Alias for sticky positioning.', category: 'States' },
  'is-scrolled':    { description: 'Applied by JS when the page has scrolled past a threshold.', category: 'States' },
  'is-truncated':   { description: 'Truncates text with an ellipsis (single line).', category: 'States' },
  'is-sr-only':     { description: 'Visually hidden but accessible to screen readers.', category: 'States' },
};

/**
 * Parse a CSS file and return a map of className → description.
 *
 * Strategy:
 *  1. Find every section-heading comment: `/* -- Title ----- \n   Description \n ... *\/`
 *  2. Record the first non-blank description line as the hint for that section.
 *  3. After the comment, all .sf-* / .is-* class selectors on their own line belong
 *     to that section until the next section comment.
 *  4. Modifier classes (e.g. sf-stack--xl) inherit the parent's description.
 */
function parseFile(rel, category) {
  const abs = path.join(FRAMEWORK, rel);
  if (!fs.existsSync(abs)) return {};

  const src = fs.readFileSync(abs, 'utf8');
  const hints = {};

  // Split into tokens: either a block comment or code.
  // We walk through in order, tracking current section description.
  let currentDesc = '';

  // Regex to find /* -- Heading ----- \n   Description \n ... */ blocks.
  // Captures the description line(s) inside.
  const sectionRe = /\/\*\s*--\s+([^\n]+?)[-\s]*\n([\s\S]*?)\*\//g;
  const classRe   = /\.((sf|is)-[\w-]+)/g;

  // Build a list of (offset, type, value) tokens.
  const tokens = [];
  let m;

  // Reset regex state
  sectionRe.lastIndex = 0;
  while ((m = sectionRe.exec(src)) !== null) {
    const title = m[1].trim();
    // Extract first non-blank, non-dashes line from body as description.
    const bodyLines = m[2].split('\n')
      .map(l => l.replace(/^\s*\*?\s*/, '').trim())
      .filter(l => l && !/^-+$/.test(l));
    const desc = bodyLines[0] || title;
    tokens.push({ offset: m.index, end: m.index + m[0].length, type: 'section', desc, title });
  }

  // Walk the file in order: between section markers, extract class names.
  for (let i = 0; i < tokens.length; i++) {
    const section = tokens[i];
    currentDesc = section.desc;

    const codeStart = section.end;
    const codeEnd   = i + 1 < tokens.length ? tokens[i + 1].offset : src.length;
    const code = src.slice(codeStart, codeEnd)
      // strip remaining block comments
      .replace(/\/\*[\s\S]*?\*\//g, '');

    classRe.lastIndex = 0;
    let cm;
    while ((cm = classRe.exec(code)) !== null) {
      const name = cm[1]; // e.g. "sf-stack" or "sf-stack--xl"
      hints[name] = { description: currentDesc, category };
    }
  }

  return hints;
}

function generate() {
  const all = {};
  for (const { file, category } of SOURCE_FILES) {
    Object.assign(all, parseFile(file, category));
  }
  // Manual hints fill gaps (states, non-standard comment formats).
  // They don't override auto-parsed entries unless the class wasn't found.
  for (const [name, hint] of Object.entries(MANUAL_HINTS)) {
    if (!all[name]) all[name] = hint;
  }
  // Curated overrides always win — correct wrong/shared/truncated descriptions.
  Object.assign(all, OVERRIDE_HINTS);
  return all;
}

const hints = generate();
const json  = JSON.stringify(hints, null, 2) + '\n';

const OUT_REL = path.relative(ROOT, OUT);

if (process.argv.includes('--check')) {
  if (!fs.existsSync(OUT)) {
    console.error(`[gen-class-hints] ${OUT_REL} not found — run: node scripts/gen-class-hints.js`);
    process.exit(1);
  }
  const stored = fs.readFileSync(OUT, 'utf8');
  if (JSON.stringify(JSON.parse(stored)) !== JSON.stringify(JSON.parse(json))) {
    console.error(`[gen-class-hints] ${OUT_REL} is stale — run: node scripts/gen-class-hints.js`);
    process.exit(1);
  }
  console.log(`[gen-class-hints] OK — ${Object.keys(hints).length} class hints`);
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
  console.log(`[gen-class-hints] → ${OUT_REL} (${Object.keys(hints).length} class hints)`);
}
