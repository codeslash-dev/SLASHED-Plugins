/**
 * Map Bricks element types to BEM-friendly element labels.
 *
 * Used by `BemPanel` to pre-fill descendant row names so the panel is
 * usable on first open without typing every name. The provenance of
 * the suggestion is tracked on each `row.suggestedFrom` so the UI can:
 *   - render suggestions as muted/italic until the user touches the input,
 *   - participate in sibling auto-numbering (suggested names get `-1`, `-2`
 *     while user-typed names stay as-typed and surface a duplicate error).
 *
 * The mapping is intentionally conservative: only well-known element
 * types map to a label, and "container-y" element types (section,
 * container, block, div) deliberately fall through to the generic
 * `fallback` so users don't end up with `card__container` everywhere.
 *
 * @module element-types
 */

/**
 * Bricks element type → BEM element label.
 *
 * Keys are the Bricks `element.name` values (NOT user-facing labels —
 * those live in `element.label`). Add to this map as new Bricks element
 * types ship; unknown types fall through to the caller-supplied fallback.
 *
 * Kept as a plain object (not a Set/Map) so admin overrides localized
 * from PHP (`window.slashedBricksEditor.rebemerElementMap`) can be
 * spread over it — see `mergedElementTypeMap()`.
 *
 * @type {Record<string, string>}
 */
export const ELEMENT_TYPE_LABEL_MAP = Object.freeze({
  // Typography
  heading: 'heading',
  'text-basic': 'text',
  text: 'text',
  'text-link': 'link',
  code: 'code',
  'post-title': 'title',
  'post-content': 'content',
  'post-excerpt': 'excerpt',
  'post-meta': 'meta',
  // Media
  image: 'image',
  icon: 'icon',
  'icon-box': 'icon',
  video: 'video',
  audio: 'audio',
  svg: 'svg',
  logo: 'logo',
  shape: 'shape',
  divider: 'divider',
  separator: 'separator',
  // Interactive
  button: 'button',
  'button-group': 'buttons',
  'nav-nested': 'nav',
  'nav-menu': 'nav',
  list: 'list',
  search: 'search',
  'social-icons': 'social',
  // Compound
  accordion: 'accordion',
  'accordion-nested': 'accordion',
  tabs: 'tabs',
  'tabs-nested': 'tabs',
  slider: 'slider',
  'slider-nested': 'slider',
  carousel: 'carousel',
  countdown: 'countdown',
  counter: 'counter',
  'progress-bar': 'progress',
  alert: 'alert',
  testimonials: 'testimonials',
  pricing: 'pricing',
  team: 'team',
  map: 'map',
  'google-maps': 'map',
  breadcrumbs: 'breadcrumbs',
  pagination: 'pagination',
  // Forms
  form: 'form',
  // Loops / dynamic
  posts: 'posts',
  'related-posts': 'posts',
  template: 'item',
  // Layout containers — deliberately NOT mapped so they fall back
  // to the caller-supplied `fallback` (typically 'item').
  // section / container / block / div remain unmapped.
});

/**
 * Read the user-defined element-type → BEM-name override map.
 *
 * Localized by `class-editor-data.php` onto `window.slashedBricksEditor`
 * from the `rebemer_element_map` plugin setting (sparse — only the
 * mappings the user changed). Returns a plain object (never frozen) so
 * `mergedElementTypeMap()` can spread it; returns `{}` when nothing is
 * configured or we're running outside the builder (tests / dev harness).
 *
 * @returns {Record<string, string>}
 */
export function getUserElementMap() {
  if (typeof window === 'undefined') return {};
  const map = window.slashedBricksEditor?.rebemerElementMap;
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}

/**
 * Built-in defaults with the user's overrides layered on top.
 *
 * The frozen `ELEMENT_TYPE_LABEL_MAP` is the base and is never mutated;
 * user entries win on key collision. Computed fresh per call so a save
 * in the admin SPA takes effect on the next panel open without a reload
 * of the editor bundle.
 *
 * @returns {Record<string, string>}
 */
export function mergedElementTypeMap() {
  return { ...ELEMENT_TYPE_LABEL_MAP, ...getUserElementMap() };
}

/**
 * Element types that are layout containers and should never seed a
 * named element label automatically. Listed explicitly so callers can
 * detect "this is a wrapper, suggest 'item' or skip" without juggling
 * the mapping table directly.
 *
 * @type {ReadonlySet<string>}
 */
export const LAYOUT_CONTAINER_TYPES = new Set([
  'section', 'container', 'block', 'div',
]);

/**
 * Suggest a BEM element label for a Bricks element type.
 *
 * Pure function — no dependencies on policy, DOM, or Bricks state.
 *
 * @param {string|undefined|null} elementType - Bricks `element.name`.
 * @param {string} [fallback='item'] - Label to use when the type is unknown
 *   or a layout container. Caller controls the fallback so block- vs
 *   element-context can differ (block uses 'block', element uses 'item').
 * @returns {string}
 */
export function suggestElementName(elementType, fallback = 'item') {
  if (!elementType || typeof elementType !== 'string') return fallback;
  if (LAYOUT_CONTAINER_TYPES.has(elementType)) return fallback;
  const mapped = mergedElementTypeMap()[elementType];
  return mapped || fallback;
}

/**
 * Whether a Bricks element type is a generic layout container.
 *
 * Useful when deciding whether to mark a row's seed name as
 * `'fallback'` (low confidence, user almost certainly wants to rename)
 * vs `'element-type'` (high confidence — the type told us exactly
 * what to call it).
 *
 * @param {string|undefined|null} elementType
 * @returns {boolean}
 */
export function isLayoutContainer(elementType) {
  return typeof elementType === 'string' && LAYOUT_CONTAINER_TYPES.has(elementType);
}

/**
 * Semantic label overrides for sole-child elements.
 *
 * When an element is the only sibling of its type within a parent,
 * these names read more naturally in BEM than the generic type label.
 * E.g. `card__title` reads better than `card__heading`.
 *
 * @type {Record<string, string>}
 */
export const SOLE_CHILD_LABEL_OVERRIDES = Object.freeze({
  heading: 'title',
  'text-basic': 'description',
  text: 'description',
  button: 'action',
  'button-group': 'actions',
  'text-link': 'link',
  logo: 'logo',
  image: 'image',
  icon: 'icon',
  'icon-box': 'icon',
  svg: 'icon',
  divider: 'divider',
});

/**
 * Suggest a BEM name for a layout container.
 *
 * Layout containers are named after their own Bricks type — a `container`
 * becomes `container`, a `section` becomes `section`, and so on — which is
 * predictable and matches how most people label wrappers. Unknown or empty
 * types fall back to the generic `'item'`.
 *
 * Pure function — no dependencies on policy, DOM, or Bricks state.
 *
 * @param {string|undefined|null} containerType - The container's own Bricks
 *   `element.name` (`container` / `section` / `div` / `block`).
 * @returns {string}
 */
export function suggestContainerName(containerType) {
  return (typeof containerType === 'string' && containerType) ? containerType : 'item';
}
