/**
 * Token catalogue model — pure transforms over the synced api-index data.
 *
 * No Svelte runes here: this module just shapes the baked-in
 * api-index.generated.json into the structures the UI walks (categories ->
 * groups -> tokens) and infers an edit control per token. Keeping it
 * rune-free means it is trivially unit-testable and re-usable.
 */
import data from '../data/api-index.generated.json' with { type: 'json' };
import { domainOf } from './domains.js';

/** Sync metadata (catalogue hash, counts — NOT frameworkVersion, which is injected at build time). */
export const sync = data._sync ?? {};

/**
 * Framework version, injected at Vite build time from the root package.json.
 * Declared as `string` via vite.config.js `define`, guaranteed to match
 * whatever package.json version was current when `vite build` ran.
 */
// eslint-disable-next-line no-undef
export const frameworkVersion = typeof __SLASHED_VERSION__ !== 'undefined' ? __SLASHED_VERSION__ : (sync.frameworkVersion ?? '');

/** Every token row from the synced catalogue. */
export const allTokens = Array.isArray(data.tokens) ? data.tokens : [];

/** Fast lookup: token name -> row. */
export const tokenByName = new Map(allTokens.map((t) => [t.name, t]));

/** Default value lookup: token name -> declared default value (string). */
export const defaultsByName = new Map(
  allTokens.map((t) => [t.name, t.value ?? ''])
);

/**
 * Domain id -> number of currently-overridden tokens it owns. Shared by the
 * Sidebar badges and the Home checklist so the two counts can never drift.
 * Unknown override names (stale storage) are skipped, matching loadOverrides.
 *
 * @param {Record<string, string>} overrides token name -> value
 * @returns {Record<string, number>}
 */
export function modifiedCountsByDomain(overrides) {
  const c = {};
  for (const name of Object.keys(overrides)) {
    const t = tokenByName.get(name);
    if (!t) continue;
    const id = domainOf(t);
    c[id] = (c[id] || 0) + 1;
  }
  return c;
}

/**
 * Compute the dependents-count map for an arbitrary token list.
 *
 * Pure function (no module-state side effects) so the unit tests can drive
 * it with synthetic inputs to verify edge cases — most importantly that a
 * token referencing itself (`--a: var(--a)`) does NOT inflate its own
 * count.
 *
 * For each token, we scan its `value` string for `var(--sf-foo)`
 * references, de-duped per token (so a single value mentioning the same
 * name twice still only contributes one), skipping self-references.
 *
 * @param {Array<{name:string, value?:string}>} tokens
 * @returns {Map<string, number>}
 */
export function buildDependentsByName(tokens) {
  const map = new Map();
  for (const t of tokens) map.set(t.name, 0);
  const VAR_RE = /var\(\s*(--[\w-]+)/g;
  for (const t of tokens) {
    if (!t.value) continue;
    const seen = new Set();
    for (const m of t.value.matchAll(VAR_RE)) {
      const ref = m[1];
      if (ref === t.name) continue; // self-reference doesn't count
      if (seen.has(ref)) continue;
      seen.add(ref);
      if (map.has(ref)) map.set(ref, map.get(ref) + 1);
    }
  }
  return map;
}

/**
 * Dependents map: token name -> count of OTHER tokens that reference it via
 * `var(--sf-foo)` in their default value.
 *
 * Built once from the baked api-index, immutable thereafter. Surfaced as a
 * "drives N" badge on each token row so the user can see at a glance how
 * far-reaching an edit will be — `--sf-radius-scale` drives 8 tokens, but
 * `--sf-color-bg` drives ~50.
 *
 * @type {Map<string, number>}
 */
export const dependentsByName = buildDependentsByName(allTokens);

/**
 * @param {string} name
 * @returns {number} how many other tokens reference this one via var(...)
 */
export function dependentsCount(name) {
  return dependentsByName.get(name) ?? 0;
}

/** Tiers present in the catalogue, ordered most- to least-public. */
export const TIER_ORDER = ['PUBLIC', 'PUBLIC-ADVANCED', 'INTERNAL'];

const COLOR_VALUE_RE =
  /(^|\b)(oklch|oklab|lch|lab|rgb|rgba|hsl|hsla|color|color-mix|light-dark)\s*\(|#[0-9a-fA-F]{3,8}\b|\b(transparent|currentColor)\b/;

const LENGTH_VALUE_RE =
  /^-?\d*\.?\d+(px|rem|em|ch|ex|vh|vw|vmin|vmax|%|s|ms|deg|turn|fr|dvh|dvw)$/;

const NUMBER_VALUE_RE = /^-?\d+(\.\d+)?$/;

const HEX_RE = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * True when a value has a space outside of any parentheses — i.e. it is a
 * composite/shorthand (box-shadow, transition, border shorthand…) rather than a
 * single CSS color. A real `<color>` keeps its spaces inside function parens
 * (`oklch(…)`, `rgb(…)`, `light-dark(…)`), so a top-level space is a reliable
 * "this is not just a color" signal.
 * @param {string} value
 * @returns {boolean}
 */
function hasTopLevelSpace(value) {
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    else if (depth === 0 && (ch === ' ' || ch === '\t')) return true;
  }
  return false;
}

/**
 * True when a token's role is 'consumption' — a derived output you READ in
 * component CSS (e.g. `color: var(--sf-color-primary)`), not SET in a
 * theme override. Consumption tokens reference `var(--sf-…)` in their value;
 * knob tokens are literal primitives you configure.
 * @param {object} token
 * @returns {boolean}
 */
export function isConsumptionToken(token) {
  return token?.role === 'consumption';
}

/**
 * Decide whether a token represents a color.
 * @param {object} token
 * @returns {boolean}
 */
export function isColorToken(token) {
  if (!token) return false;
  if (token.syntax && /<color>/.test(token.syntax)) return true;
  const v = (token.value || '').trim();
  // Composite values (e.g. `0 1px 2px oklch(…)` shadows, or CSS keyword lists
  // like `light dark` for color-scheme) contain a space at the top level and
  // are never a single colour — don't hand them the colour-swatch control.
  if (hasTopLevelSpace(v)) return false;
  if (token.namespace === 'color') return true;
  return COLOR_VALUE_RE.test(v);
}

/**
 * Infer the best edit control for a token from its declared default value.
 *
 * @param {object} token
 * @returns {{ control: 'color'|'number'|'length'|'text', unit: string, hexable: boolean }}
 *   control  - which editor component to render
 *   unit     - trailing unit for 'length' values (e.g. "px", "rem"), else ''
 *   hexable  - true when the default is a plain hex and a native <input type=color> fits
 */
export function inferControl(token) {
  const v = (token.value || '').trim();

  if (isColorToken(token)) {
    return { control: 'color', unit: '', hexable: HEX_RE.test(v) };
  }
  if (NUMBER_VALUE_RE.test(v)) {
    return { control: 'number', unit: '', hexable: false };
  }
  const lenMatch = LENGTH_VALUE_RE.exec(v);
  if (lenMatch) {
    return { control: 'length', unit: lenMatch[1], hexable: false };
  }
  return { control: 'text', unit: '', hexable: false };
}

/**
 * Group tokens into category -> [{ group, tokens[] }], preserving alphabetical
 * token order and producing a deterministic category/group ordering.
 *
 * @param {object[]} tokens token rows (already filtered for the current view)
 * @returns {Array<{ category: string, count: number, groups: Array<{ name: string, tokens: object[] }> }>}
 */
export function groupTokens(tokens) {
  /** @type {Map<string, Map<string, object[]>>} */
  const cats = new Map();
  for (const t of tokens) {
    const cat = t.category || 'Other';
    const grp = t.group || 'General';
    if (!cats.has(cat)) cats.set(cat, new Map());
    const groups = cats.get(cat);
    if (!groups.has(grp)) groups.set(grp, []);
    groups.get(grp).push(t);
  }

  const result = [];
  for (const [category, groups] of cats) {
    const groupList = [];
    let count = 0;
    for (const [name, list] of groups) {
      groupList.push({ name, tokens: list, description: list[0]?.description || '' });
      count += list.length;
    }
    groupList.sort((a, b) => a.name.localeCompare(b.name));
    result.push({ category, count, groups: groupList });
  }
  // Order categories by the canonical CATEGORY_ORDER, then alphabetically.
  result.sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a.category);
    const ib = CATEGORY_ORDER.indexOf(b.category);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
    return a.category.localeCompare(b.category);
  });
  return result;
}

/** Preferred display order for the known token categories. */
export const CATEGORY_ORDER = [
  'Core tokens',
  'Layout tokens',
  'Macro tokens',
  'Palette tokens',
  'Sizes-extended tokens',
  'Color fallback (legacy HSL)',
];

/**
 * Match a token against a free-text query (name, description, group, value).
 * @param {object} token
 * @param {string} query lower-cased query
 * @returns {boolean}
 */
export function matchesQuery(token, query) {
  if (!query) return true;
  const haystack = `${token.name} ${token.note} ${token.description} ${token.group} ${token.value} ${token.namespace}`.toLowerCase();
  return haystack.includes(query);
}
