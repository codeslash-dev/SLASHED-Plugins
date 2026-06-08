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
 * Kept as a plain object (not a Set/Map) so the mapping is easy to
 * filter from PHP via `wp_localize_script` payloads in a future
 * iteration.
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
  // Media
  image: 'image',
  icon: 'icon',
  'icon-box': 'icon',
  video: 'video',
  audio: 'audio',
  svg: 'svg',
  logo: 'logo',
  shape: 'shape',
  // Interactive
  button: 'button',
  'button-group': 'buttons',
  'nav-nested': 'nav',
  'nav-menu': 'nav',
  list: 'list',
  // Compound
  accordion: 'accordion',
  tabs: 'tabs',
  slider: 'slider',
  carousel: 'carousel',
  countdown: 'countdown',
  counter: 'counter',
  testimonials: 'testimonials',
  pricing: 'pricing',
  team: 'team',
  // Forms
  form: 'form',
  // Loops / dynamic
  posts: 'posts',
  template: 'item',
  // Layout containers — deliberately NOT mapped so they fall back
  // to the caller-supplied `fallback` (typically 'item').
  // section / container / block / div remain unmapped.
});

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
  const mapped = ELEMENT_TYPE_LABEL_MAP[elementType];
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
  'text-link': 'link',
  logo: 'logo',
  image: 'image',
});

/**
 * Suggest a BEM name for a layout container based on the Bricks type
 * strings of its direct children.
 *
 * Inspects what kind of content the container holds and returns a
 * semantically appropriate name. Falls back to position-among-siblings
 * when children give no clear signal.
 *
 * @param {string[]} childTypes - Bricks `element.name` values of direct children.
 * @param {number} positionAmongContainerSiblings - 0-based index among layout-container siblings.
 * @param {number} totalContainerSiblings - Total layout-container siblings at this level.
 * @returns {string}
 */
export function suggestContainerName(childTypes, positionAmongContainerSiblings, totalContainerSiblings) {
  const types = new Set(childTypes.filter(Boolean));

  const has = (...ts) => ts.some(t => types.has(t));

  const hasButton  = has('button', 'button-group');
  const hasHeading = has('heading');
  const hasText    = has('text-basic', 'text');
  const hasImage   = has('image');
  const hasNav     = has('nav-nested', 'nav-menu');
  const hasForm    = has('form');
  const hasIcon    = has('icon', 'icon-box');
  const hasList    = has('list');

  if (hasForm)                                          return 'form';
  if (hasNav)                                           return 'nav';
  if (hasButton && !hasHeading && !hasText)             return 'actions';
  if (hasImage && !hasText && !hasHeading && !hasButton) return 'media';
  if (hasHeading && !hasText && !hasButton)             return 'header';
  if (hasText && !hasHeading && !hasButton)             return 'body';
  if (hasHeading && hasText)                            return 'content';
  if (hasHeading && hasButton)                          return 'header';
  if (hasIcon && !hasText && !hasHeading)               return 'icon-group';
  if (hasList)                                          return 'list-wrap';

  // Position-based fallback when children give no clear signal
  if (totalContainerSiblings > 1) {
    if (positionAmongContainerSiblings === 0)                              return 'header';
    if (positionAmongContainerSiblings === totalContainerSiblings - 1)    return 'footer';
    return 'body';
  }

  return 'content';
}
