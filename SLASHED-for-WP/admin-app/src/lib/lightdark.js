/**
 * `light-dark()` resolution helpers — pure, no Svelte / DOM / catalogue deps,
 * so they are trivially unit-testable.
 *
 * WHY THIS EXISTS — per the framework's core/themes.css, `light-dark()`
 * resolves when a custom property is *declared* (on :root), not when it is
 * *inherited*. The configurator's live preview / WCAG probes declare tokens on
 * a NESTED stage element and only flip `color-scheme`, which does NOT
 * re-evaluate inherited `light-dark()` values — so dark mode never switched.
 * The framework itself works around this by re-declaring every mode-sensitive
 * token under `[data-theme="dark"]` with the explicit dark formula; these
 * helpers do the equivalent by substituting each `light-dark(light, dark)`
 * with the branch for the active theme before injection.
 */

/**
 * Split a string on top-level commas, honouring nested parentheses and quoted
 * strings so commas inside `oklch(…)`, `var(--x, fallback)`, `calc(…)` etc. are
 * not treated as argument separators.
 *
 * @param {string} str
 * @returns {string[]} the top-level comma-separated parts (trimmed)
 */
export function splitTopLevelArgs(str) {
  const parts = [];
  let depth = 0;
  let quote = '';
  let cur = '';
  for (let i = 0; i < str.length; i += 1) {
    const ch = str[i];
    if (quote) {
      if (ch === quote && str[i - 1] !== '\\') quote = '';
      cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur.trim());
  return parts;
}

/**
 * Resolve every `light-dark(light, dark)` occurrence in a CSS value to the
 * branch for the requested theme. Handles nesting (a chosen branch may itself
 * contain another `light-dark()`) and arbitrary surrounding/expression context
 * (e.g. inside `oklch(from light-dark(…) …)`), matching parentheses correctly.
 * Values without `light-dark()` are returned unchanged.
 *
 * @param {string} value a CSS value (custom-property declaration value)
 * @param {'light'|'dark'} theme
 * @returns {string} the value with all light-dark() calls resolved
 */
export function resolveLightDark(value, theme) {
  if (typeof value !== 'string') return value;
  const idx = value.toLowerCase().indexOf('light-dark(');
  if (idx === -1) return value;

  const open = idx + 'light-dark('.length;
  let depth = 1;
  let quote = '';
  let i = open;
  for (; i < value.length && depth > 0; i += 1) {
    const ch = value[i];
    if (quote) {
      if (ch === quote && value[i - 1] !== '\\') quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '(') depth += 1;
    else if (ch === ')') depth -= 1;
  }
  // `i` now points just past the matching ')'. If unbalanced, bail out safely.
  if (depth !== 0) return value;

  const inner = value.slice(open, i - 1);
  const before = value.slice(0, idx);
  const after = value.slice(i);
  const args = splitTopLevelArgs(inner);
  const chosen = theme === 'dark' ? (args[1] ?? args[0] ?? '') : (args[0] ?? '');

  // Recurse into the chosen branch (it may nest light-dark()) and into the
  // remainder of the string (there may be more light-dark() calls after).
  return before + resolveLightDark(chosen, theme) + resolveLightDark(after, theme);
}
