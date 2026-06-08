/**
 * Allowlist of Bricks element-settings keys that are safe to lift up
 * from an element into a global class during a `migrate` operation.
 *
 * Why an allowlist (not a denylist)
 * ---------------------------------
 * Bricks ships hundreds of control names and adds new ones every
 * minor release. Migrating an unknown key risks lifting state that
 * doesn't belong on a class (e.g. dynamic-data tokens, content text,
 * loop bindings, conditional visibility). The threat model in
 * docs/rebemer.md §12 explicitly chose allowlist over denylist for
 * exactly this reason: when Bricks introduces a new style key we want
 * the safe failure mode (key stays on the element, panel surfaces a
 * warning) rather than the unsafe one (silently lifted into a class).
 *
 * Adding entries
 * --------------
 * Only add a key here when:
 *   1. It is a pure presentational style setting (no content, no
 *      logic, no dynamic binding).
 *   2. Lifting it into a global class produces the same visual result
 *      it produced as an inline element setting.
 *   3. It is namespaced like other Bricks style controls (leading `_`).
 *
 * @module migrate-keys
 */

/**
 * @type {ReadonlySet<string>}
 */
export const MIGRATE_ALLOWLIST = new Set([
  // Box model
  '_padding', '_padding_top', '_padding_right', '_padding_bottom', '_padding_left',
  '_margin', '_margin_top', '_margin_right', '_margin_bottom', '_margin_left',
  '_width', '_widthMin', '_widthMax', '_minWidth', '_maxWidth',
  '_height', '_heightMin', '_heightMax', '_minHeight', '_maxHeight',
  '_aspectRatio',
  '_overflow', '_overflowX', '_overflowY',
  // Color & background
  '_color',
  '_background', '_backgroundColor', '_backgroundImage',
  '_backgroundSize', '_backgroundPosition', '_backgroundRepeat',
  '_backgroundAttachment', '_backgroundBlendMode',
  // Typography
  '_typography',
  '_fontFamily', '_fontSize', '_fontWeight', '_fontStyle',
  '_lineHeight', '_letterSpacing', '_wordSpacing',
  '_textAlign', '_textTransform', '_textDecoration', '_textDecorationColor',
  '_textShadow', '_textIndent', '_whiteSpace',
  '_listStyleType', '_listStylePosition',
  // Borders & outline
  '_border', '_borderRadius',
  '_borderColor', '_borderStyle', '_borderWidth',
  '_outline', '_outlineColor', '_outlineStyle', '_outlineWidth', '_outlineOffset',
  // Effects
  '_boxShadow', '_filter', '_backdropFilter',
  '_opacity', '_blendMode',
  '_transform', '_transformOrigin',
  '_transition', '_animation',
  // Layout (flex / grid / display)
  '_display',
  '_flexDirection', '_flexWrap', '_flexGrow', '_flexShrink', '_flexBasis',
  '_alignItems', '_alignSelf', '_alignContent',
  '_justifyContent', '_justifyItems', '_justifySelf',
  '_gap', '_rowGap', '_columnGap',
  '_gridTemplateColumns', '_gridTemplateRows',
  '_gridGap', '_gridAutoFlow', '_gridAutoColumns', '_gridAutoRows',
  '_gridColumn', '_gridRow', '_gridArea',
  // Position
  '_position', '_top', '_right', '_bottom', '_left', '_zIndex',
  // Object fit
  '_objectFit', '_objectPosition',
  // Cursor / interaction
  '_cursor', '_pointerEvents', '_userSelect',
]);

/**
 * Pick the subset of element-settings keys that are safe to migrate.
 *
 * Pure helper — does not mutate the input.
 *
 * @param {object|null|undefined} settings - element.settings blob.
 * @returns {string[]} Sorted list of allowlisted keys present on the element.
 */
export function pickMigratableKeys(settings) {
  if (!settings || typeof settings !== 'object') return [];
  const keys = [];
  for (const key of Object.keys(settings)) {
    if (MIGRATE_ALLOWLIST.has(key)) keys.push(key);
  }
  keys.sort();
  return keys;
}

/**
 * Pick the keys that are present on the element but NOT in the allowlist.
 *
 * Used by the panel to surface "this would be migrated but isn't on the
 * allowlist" warnings, so the user sees what the operation deliberately
 * skips. Excludes well-known meta keys (cssGlobalClasses, cssId, etc.)
 * that are always per-element by design.
 *
 * @param {object|null|undefined} settings
 * @returns {string[]}
 */
const META_KEYS = new Set([
  '_cssGlobalClasses', '_cssClasses', '_cssId', '_attributes',
  '_hidden', '_hidden_lg', '_hidden_md', '_hidden_sm', '_hidden_xl',
  '_name', '_label', '_id', 'tag', 'children', 'parent',
]);

export function pickSkippedKeys(settings) {
  if (!settings || typeof settings !== 'object') return [];
  const keys = [];
  for (const key of Object.keys(settings)) {
    if (MIGRATE_ALLOWLIST.has(key)) continue;
    if (META_KEYS.has(key)) continue;
    if (key.startsWith('_hidden_')) continue;
    keys.push(key);
  }
  keys.sort();
  return keys;
}
