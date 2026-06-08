/**
 * Convert a free-form string into a BEM-safe slug.
 * Lowercase, ASCII-only, kebab-case.
 *
 * @param {string} input
 * @returns {string}
 */
export function slugify(input) {
  if (!input) return '';
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')   // strip combining marks
    .replace(/[^\x00-\x7f]/g, '')      // drop remaining non-ASCII
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')       // non-alnum → single dash
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');          // trim edge dashes
}
