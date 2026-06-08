/**
 * Minimal BEM name validator.
 * Lowercase kebab-case, starts with a letter, no CSS keywords.
 *
 * @module validate
 */

const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

const CSS_KEYWORDS = new Set([
  'auto', 'inherit', 'initial', 'unset', 'revert', 'revert-layer', 'none',
]);

/**
 * @param {string} name — already slugified
 * @returns {{ok:true} | {ok:false, reason:string}}
 */
export function validateName(name) {
  if (!name) return { ok: false, reason: 'Name is empty.' };
  if (CSS_KEYWORDS.has(name)) return { ok: false, reason: `"${name}" is a CSS keyword.` };
  if (!NAME_RE.test(name)) return { ok: false, reason: 'Use lowercase letters, digits, and hyphens.' };
  return { ok: true };
}
