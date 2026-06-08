/**
 * Color System model — pure, DOM-free, unit-tested.
 *
 * Turns the flat inventory localised by class-rebemer-enqueue.php
 * (`colorPanel.variables` + `colorPanel.light` / `colorPanel.dark` hex maps)
 * into the ordered, grouped model the ColorPanel renders.
 *
 * Why a model layer:
 *   - The inventory is a flat list of ~275 `--sf-color-*` names with no
 *     inherent grouping. Rendering it raw would be a wall of swatches.
 *   - The framework organises colour by *family* (the six brand families and
 *     five status families) and, within each, by *kind*: a base swatch, a
 *     numeric tint/shade scale (50–950), translucent alpha steps (a5–a95),
 *     and named semantic aliases (hover, subtle, …). Everything that isn't a
 *     family token (text, bg, border, link, …) collects into one "Semantic"
 *     group. This grouping mirrors the way the framework itself organises
 *     colour (see core/tokens.css and docs/tokens.md), so the panel stays
 *     conceptually aligned with the token system.
 *   - Each swatch carries BOTH its light and dark hex so the panel can show
 *     the adaptive pair at a glance — the differentiator over a single-mode
 *     palette browser.
 *
 * Everything here is data-shaping only; no Bricks, no DOM. The DOM/Bricks
 * glue lives in the Svelte components and bricks-api.js.
 *
 * @module color-model
 */

const PREFIX = '--sf-color-';

// These family lists mirror the PHP side (class-color-resolver.php
// `$default_sources` and class-inventory.php's brand/status arrays). They
// change rarely; if you add or rename a family, update all three in sync.

/** Brand families, in canonical display order. */
export const BRAND_FAMILIES = ['primary', 'secondary', 'tertiary', 'action', 'neutral', 'base'];

/** Status families, in canonical display order. */
export const STATUS_FAMILIES = ['success', 'warning', 'error', 'info', 'danger'];

/** Alpha steps, most → least transparent. */
const ALPHA_STEPS = ['a5', 'a10', 'a20', 'a30', 'a40', 'a50', 'a60', 'a70', 'a80', 'a90', 'a95'];

/** Named semantic aliases, ordered light → dark → translucent. */
const ALIAS_ORDER = [
  'superlight', 'xlight', 'lighter', 'darker', 'xdark', 'superdark',
  'hover', 'active', 'strong', 'subtle', 'muted', 'ghost',
];

/**
 * Preferred ordering for the catch-all "Semantic" group. Tokens whose key
 * starts with one of these prefixes sort in this order; anything else falls
 * to the end, alphabetically. Keeps the most-reached-for page tokens (text,
 * surfaces, borders, links) at the top.
 */
const SEMANTIC_PREFIX_ORDER = [
  'text', 'heading', 'bg', 'surface', 'inset', 'raised', 'overlay', 'inverse',
  'border', 'link', 'code', 'selection', 'mark', 'dim',
];
// Note: 'surface' in SEMANTIC_PREFIX_ORDER refers to --sf-color-surface (the semantic alias
// for --sf-color-base). The brand family itself is now 'base' in BRAND_FAMILIES.

const SET = (arr) => new Set(arr);
const ALL_FAMILIES = SET([...BRAND_FAMILIES, ...STATUS_FAMILIES]);

/**
 * Role + when-to-use copy per group, so the panel reads as a guided system
 * rather than an anonymous swatch wall. `tagline` is the one-line role shown
 * next to the group name; `use` is the short "reach for this when…" hint.
 */
export const FAMILY_INFO = {
  primary:   { tagline: 'Brand identity & main emphasis', use: 'Headlines, primary buttons, key brand moments.' },
  secondary: { tagline: 'Supporting brand tone', use: 'Secondary surfaces and muted brand accents.' },
  tertiary:  { tagline: 'Accent / highlight', use: 'Badges, tags, decorative highlights.' },
  action:    { tagline: 'Interactive & links', use: 'Links, focus rings, anything clickable.' },
  neutral:   { tagline: 'Text, icons & dividers', use: 'Body text, borders, neutral UI chrome.' },
  base:      { tagline: 'Page & surface backgrounds', use: 'Page background and raised surfaces.' },
  success:   { tagline: 'Positive / confirmation', use: 'Success messages and valid state.' },
  warning:   { tagline: 'Caution', use: 'Warnings and at-risk / pending state.' },
  error:     { tagline: 'Form & validation errors', use: 'Invalid inputs and error messages.' },
  info:      { tagline: 'Informational', use: 'Tips and neutral notices.' },
  danger:    { tagline: 'Destructive actions', use: 'Delete / remove and irreversible actions.' },
  semantic:  { tagline: 'Ready-made role tokens', use: 'Pre-wired roles that already adapt to light/dark.' },
};

/**
 * Purpose-based subsections for the catch-all Semantic group, in display
 * order. The first matcher a token's key satisfies wins; anything unmatched
 * collects into "Other". This is what lets a user scan "Text", "Surfaces",
 * "Borders", "Links"… instead of one long alphabetical list.
 */
const SEMANTIC_SUBGROUPS = [
  { id: 'text-on', label: 'Text on color', match: (k) => k.startsWith('text--on') },
  { id: 'text', label: 'Text', match: (k) => k === 'text' || k === 'heading' || k.startsWith('text-') },
  // Interactive bg states (bg--hover/active/…) before surfaces so the plain
  // surface tokens (bg, surface, inset, raised, overlay, inverse) stay clean.
  { id: 'state', label: 'Interactive states', match: (k) => k.startsWith('bg--') },
  { id: 'surface', label: 'Surfaces & backgrounds', match: (k) => ['bg', 'surface', 'inset', 'raised', 'overlay', 'inverse'].some((p) => k === p || k.startsWith(p + '-')) },
  { id: 'border', label: 'Borders', match: (k) => k === 'border' || k.startsWith('border-') },
  { id: 'link', label: 'Links', match: (k) => k === 'link' || k.startsWith('link-') },
  { id: 'select', label: 'Selection & marks', match: (k) => k.startsWith('selection') || k.startsWith('mark') || k === 'dim' },
  { id: 'code', label: 'Code', match: (k) => k.startsWith('code') },
];

/**
 * Classify a single `--sf-color-*` variable.
 *
 * Pure. Returns the structured descriptor used to bucket the token into its
 * family + section, or null for anything that isn't a colour token we render
 * (e.g. `--sf-color-scheme`, or a `-light` source duplicate of its base).
 *
 * @param {string} varName e.g. "--sf-color-primary-50" or "--sf-color-text--muted".
 * @returns {{ family: string, kind: 'base'|'scale'|'alpha'|'alias'|'semantic', step: (number|string|null), key: string } | null}
 */
export function classifyVar(varName) {
  if (typeof varName !== 'string' || varName.indexOf(PREFIX) !== 0) return null;

  const key = varName.slice(PREFIX.length);
  if (!key) return null;

  // Non-colour token that shares the namespace.
  if (key === 'scheme') return null;

  const firstDash = key.indexOf('-');
  const family = firstDash === -1 ? key : key.slice(0, firstDash);

  if (!ALL_FAMILIES.has(family)) {
    // Everything that isn't a brand/status family is a page-level semantic
    // token (text, bg, border, link, …).
    return { family: 'semantic', kind: 'semantic', step: null, key };
  }

  const suffix = firstDash === -1 ? '' : key.slice(firstDash + 1);

  if (suffix === '') {
    return { family, kind: 'base', step: null, key };
  }

  // The `-light` source token duplicates the base swatch — skip to avoid a
  // visual dupe (the base swatch already represents the resolved colour).
  if (suffix === 'light') return null;

  if (/^[0-9]+$/.test(suffix)) {
    return { family, kind: 'scale', step: Number(suffix), key };
  }
  if (/^a[0-9]+$/.test(suffix)) {
    return { family, kind: 'alpha', step: suffix, key };
  }
  return { family, kind: 'alias', step: suffix, key };
}

/**
 * Whether a token is translucent (its swatch needs a checkerboard underlay).
 *
 * @param {{ kind: string, key: string }} info
 * @returns {boolean}
 */
function isTranslucent(info) {
  if (info.kind === 'alpha') return true;
  // Named alpha-ish aliases and semantic overlays that resolve to a
  // translucent value in the framework.
  return /(?:^|-)(?:subtle|muted|ghost|translucent|overlay|dim|underline)$/.test(info.key);
}

/**
 * Human label for a swatch, given its classification.
 *
 * @param {{ family: string, kind: string, step: (number|string|null), key: string }} info
 * @returns {string}
 */
export function swatchLabel(info) {
  switch (info.kind) {
    case 'base':
      return capitalize(info.family);
    case 'scale':
      return String(info.step);
    case 'alpha':
      return String(info.step).toUpperCase();
    case 'alias':
      return capitalize(String(info.step));
    case 'semantic':
    default:
      return humanizeKey(info.key);
  }
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Humanize a full token key for the semantic group.
 *   "text--secondary" → "Text · Secondary"
 *   "border--subtle"  → "Border · Subtle"
 *   "bg--hover"        → "Bg · Hover"
 */
function humanizeKey(key) {
  const parts = key.split('--');
  return parts
    .map((p) => p.split('-').map(capitalize).join(' '))
    .join(' · ');
}

/**
 * Build one swatch descriptor.
 *
 * @param {string} varName
 * @param {object} info classification
 * @param {Record<string,string>} light
 * @param {Record<string,string>} dark
 * @returns {{ var: string, name: string, label: string, light: string, dark: string, alpha: boolean } | null}
 */
function buildSwatch(varName, info, light, dark) {
  const l = light[varName];
  if (typeof l !== 'string' || !l) return null; // no preview value → skip
  const d = (typeof dark[varName] === 'string' && dark[varName]) ? dark[varName] : l;
  return {
    var: varName,
    name: varName.slice(2), // drop the leading "--" for display ("sf-color-…")
    label: swatchLabel(info),
    light: l,
    dark: d,
    alpha: isTranslucent(info),
  };
}

/**
 * Section sort comparator within a family.
 */
function compareInFamily(a, b) {
  // base first, then scale (numeric), then alias (curated), then alpha.
  const rank = { base: 0, scale: 1, alias: 2, alpha: 3 };
  if (rank[a.info.kind] !== rank[b.info.kind]) return rank[a.info.kind] - rank[b.info.kind];
  if (a.info.kind === 'scale') return a.info.step - b.info.step;
  if (a.info.kind === 'alpha') return ALPHA_STEPS.indexOf(a.info.step) - ALPHA_STEPS.indexOf(b.info.step);
  if (a.info.kind === 'alias') {
    const ai = ALIAS_ORDER.indexOf(a.info.step);
    const bi = ALIAS_ORDER.indexOf(b.info.step);
    const ar = ai === -1 ? 999 : ai;
    const br = bi === -1 ? 999 : bi;
    if (ar !== br) return ar - br;
    // Both unranked → lexical tiebreaker for a stable, reproducible order.
    return String(a.info.step).localeCompare(String(b.info.step));
  }
  return 0;
}

/**
 * Semantic group sort comparator.
 */
function compareSemantic(a, b) {
  const ai = SEMANTIC_PREFIX_ORDER.findIndex((p) => a.info.key === p || a.info.key.startsWith(p + '-'));
  const bi = SEMANTIC_PREFIX_ORDER.findIndex((p) => b.info.key === p || b.info.key.startsWith(p + '-'));
  const ar = ai === -1 ? SEMANTIC_PREFIX_ORDER.length : ai;
  const br = bi === -1 ? SEMANTIC_PREFIX_ORDER.length : bi;
  if (ar !== br) return ar - br;
  return a.info.key.localeCompare(b.info.key);
}

/**
 * Build the full grouped colour model.
 *
 * @param {string[]} variables Ordered `--sf-color-*` names from the inventory.
 * @param {Record<string,string>} light Light-mode hex map.
 * @param {Record<string,string>} dark  Dark-mode hex map.
 * @returns {{ groups: Array<{ id: string, label: string, type: 'brand'|'status'|'semantic', count: number, sections: Array<{ id: string, label: string, swatches: object[] }> }> }}
 */
export function buildColorModel(variables, light, dark) {
  const vars = Array.isArray(variables) ? variables : [];
  const lightMap = light && typeof light === 'object' ? light : {};
  const darkMap = dark && typeof dark === 'object' ? dark : {};

  // family id → { base:[], scale:[], alias:[], alpha:[] } | semantic: []
  const byFamily = new Map();
  const semantic = [];

  for (const varName of vars) {
    const info = classifyVar(varName);
    if (!info) continue;
    const swatch = buildSwatch(varName, info, lightMap, darkMap);
    if (!swatch) continue;
    const entry = { swatch, info };

    if (info.family === 'semantic') {
      semantic.push(entry);
      continue;
    }
    if (!byFamily.has(info.family)) byFamily.set(info.family, []);
    byFamily.get(info.family).push(entry);
  }

  const groups = [];

  const pushFamily = (family, type) => {
    const entries = byFamily.get(family);
    if (!entries || entries.length === 0) return;
    entries.sort(compareInFamily);

    // Split into the three rendered sections.
    const scale = entries.filter((e) => e.info.kind === 'base' || e.info.kind === 'scale');
    const alias = entries.filter((e) => e.info.kind === 'alias');
    const alpha = entries.filter((e) => e.info.kind === 'alpha');

    const sections = [];
    if (scale.length) sections.push({ id: 'scale', label: 'Shades & tints', swatches: scale.map((e) => e.swatch) });
    if (alpha.length) sections.push({ id: 'alpha', label: 'Transparent', swatches: alpha.map((e) => e.swatch) });
    if (alias.length) sections.push({ id: 'alias', label: 'Semantic', swatches: alias.map((e) => e.swatch) });

    const info = FAMILY_INFO[family] || {};
    groups.push({
      id: family,
      label: capitalize(family),
      type,
      count: entries.length,
      tagline: info.tagline || '',
      use: info.use || '',
      sections,
    });
  };

  for (const f of BRAND_FAMILIES) pushFamily(f, 'brand');
  for (const f of STATUS_FAMILIES) pushFamily(f, 'status');

  if (semantic.length) {
    semantic.sort(compareSemantic);

    // Bucket the page-level tokens into purpose-based subsections so the
    // group reads as "Text / Surfaces / Borders / Links / …" rather than one
    // long list. Unmatched tokens fall to a trailing "Other" section.
    const buckets = new Map(SEMANTIC_SUBGROUPS.map((g) => [g.id, []]));
    const other = [];
    for (const entry of semantic) {
      const sub = SEMANTIC_SUBGROUPS.find((g) => g.match(entry.info.key));
      if (sub) buckets.get(sub.id).push(entry.swatch);
      else other.push(entry.swatch);
    }

    const sections = [];
    for (const sub of SEMANTIC_SUBGROUPS) {
      const swatches = buckets.get(sub.id);
      if (swatches.length) sections.push({ id: sub.id, label: sub.label, swatches });
    }
    if (other.length) sections.push({ id: 'other', label: 'Other', swatches: other });

    const info = FAMILY_INFO.semantic || {};
    groups.push({
      id: 'semantic',
      label: 'Semantic',
      type: 'semantic',
      count: semantic.length,
      tagline: info.tagline || '',
      use: info.use || '',
      sections,
    });
  }

  return { groups };
}

/**
 * Filter a built model by a free-text query, returning a new model whose
 * groups/sections only contain matching swatches (empty sections and groups
 * are dropped). Matches against the token name and the human label,
 * case-insensitively. An empty query returns the model unchanged.
 *
 * @param {{ groups: object[] }} model
 * @param {string} query
 * @returns {{ groups: object[] }}
 */
export function filterModel(model, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return model;
  if (!model || !Array.isArray(model.groups)) return { groups: [] };

  const groups = [];
  for (const group of model.groups) {
    const sections = [];
    for (const section of group.sections) {
      const swatches = section.swatches.filter(
        (s) => s.name.toLowerCase().includes(q) || s.label.toLowerCase().includes(q) || group.label.toLowerCase().includes(q)
      );
      if (swatches.length) sections.push({ ...section, swatches });
    }
    if (sections.length) {
      const count = sections.reduce((n, s) => n + s.swatches.length, 0);
      groups.push({ ...group, sections, count });
    }
  }
  return { groups };
}

/**
 * The CSS value applied/copied for a swatch — always the live framework
 * variable so the result tracks theme + dark mode, never a baked hex.
 *
 * @param {{ var: string }} swatch
 * @returns {string}
 */
export function swatchValue(swatch) {
  return `var(${swatch.var})`;
}

/**
 * The hex to render for a swatch given the preview mode.
 *
 * @param {{ light: string, dark: string }} swatch
 * @param {'light'|'dark'} mode
 * @returns {string}
 */
export function swatchHex(swatch, mode) {
  return mode === 'dark' ? swatch.dark : swatch.light;
}

// ─── Quick Use model ───────────────────────────────────────────────────────

/**
 * Curated token list for the Quick Use section, organised by design role.
 * Optimised for business / portfolio / e-commerce / landing-page builds.
 * Missing tokens (the theme doesn't define them) are silently skipped.
 */
const QUICK_USE_GROUPS = [
  {
    id: 'typography',
    label: 'Typography',
    tokens: [
      { var: '--sf-color-heading',            label: 'Heading' },
      { var: '--sf-color-text',               label: 'Text' },
      { var: '--sf-color-text--muted',        label: 'Text · Muted' },
      { var: '--sf-color-text--secondary',    label: 'Text · Secondary' },
      { var: '--sf-color-text--on-primary',   label: 'On Primary' },
      { var: '--sf-color-text--on-secondary', label: 'On Secondary' },
    ],
  },
  {
    id: 'surfaces',
    label: 'Surfaces',
    tokens: [
      { var: '--sf-color-bg',      label: 'Background' },
      { var: '--sf-color-surface', label: 'Surface' },
      { var: '--sf-color-raised',  label: 'Raised' },
      { var: '--sf-color-inset',   label: 'Inset' },
      { var: '--sf-color-overlay', label: 'Overlay' },
      { var: '--sf-color-inverse', label: 'Inverse' },
    ],
  },
  {
    id: 'structure',
    label: 'Structure',
    tokens: [
      { var: '--sf-color-border',         label: 'Border' },
      { var: '--sf-color-border--subtle', label: 'Border · Subtle' },
      { var: '--sf-color-border--strong', label: 'Border · Strong' },
      { var: '--sf-color-link',           label: 'Link' },
      { var: '--sf-color-link--hover',    label: 'Link · Hover' },
    ],
  },
  {
    id: 'brand',
    label: 'Brand',
    tokens: [
      { var: '--sf-color-primary',   label: 'Primary' },
      { var: '--sf-color-secondary', label: 'Secondary' },
      { var: '--sf-color-tertiary',  label: 'Tertiary' },
      { var: '--sf-color-action',    label: 'Action' },
      { var: '--sf-color-neutral',   label: 'Neutral' },
      { var: '--sf-color-base',      label: 'Base' },
    ],
  },
  {
    id: 'feedback',
    label: 'Feedback',
    tokens: [
      { var: '--sf-color-success',         label: 'Success' },
      { var: '--sf-color-success-subtle',  label: 'Success · Subtle' },
      { var: '--sf-color-warning',         label: 'Warning' },
      { var: '--sf-color-warning-subtle',  label: 'Warning · Subtle' },
      { var: '--sf-color-error',           label: 'Error' },
      { var: '--sf-color-error-subtle',    label: 'Error · Subtle' },
      { var: '--sf-color-info',            label: 'Info' },
      { var: '--sf-color-danger',          label: 'Danger' },
    ],
  },
];

/**
 * Build the Quick Use model — a curated ~30-token subset organised by design
 * role rather than token family. Only tokens present in the light hex map are
 * included; the rest are silently skipped so the panel adapts to whatever
 * subset a given theme defines.
 *
 * @param {string[]} _variables  (unused — kept for interface parity with buildColorModel)
 * @param {Record<string,string>} light  Light-mode hex map.
 * @param {Record<string,string>} dark   Dark-mode hex map.
 * @returns {{ groups: Array<{ id: string, label: string, swatches: object[] }> }}
 */
export function buildQuickUseModel(_variables, light, dark) {
  const lightMap = light && typeof light === 'object' ? light : {};
  const darkMap  = dark  && typeof dark  === 'object' ? dark  : {};

  const groups = [];
  for (const groupDef of QUICK_USE_GROUPS) {
    const swatches = [];
    for (const token of groupDef.tokens) {
      const l = lightMap[token.var];
      if (!l) continue;
      const d = darkMap[token.var] || l;
      swatches.push({
        var:   token.var,
        name:  token.var.slice(2),
        label: token.label,
        light: l,
        dark:  d,
        alpha: /overlay|subtle|ghost|muted|dim|alpha/i.test(token.var),
      });
    }
    if (swatches.length) groups.push({ id: groupDef.id, label: groupDef.label, swatches });
  }
  return { groups };
}
