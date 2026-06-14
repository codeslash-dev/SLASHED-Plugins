/**
 * Live-preview variable injection.
 *
 * Builds a single block of custom-property declarations that seeds the scoped
 * preview root with EVERY framework default (from the synced catalogue) and
 * then layers the user's overrides on top. Because every `--sf-*` token is set
 * on the same element, inter-token `var()` references, `oklch(from …)` relative
 * colors and `light-dark()` all resolve exactly as they would under the real
 * framework — and it stays auto-synced, since the defaults come from the same
 * generated data the editor uses.
 *
 * DARK MODE — we resolve `light-dark()` ourselves (see ./lightdark.js) rather
 * than relying on `color-scheme`: per the framework's own core/themes.css,
 * inherited `light-dark()` custom properties are NOT re-evaluated when a nested
 * element flips `color-scheme`, so the preview stage (which is not :root) stayed
 * in light mode. Substituting each `light-dark(light, dark)` with the active
 * theme's branch reproduces the framework's `[data-theme="dark"]` re-declarations
 * exactly, on every engine.
 */
import { allTokens } from './model.js';
import { resolveLightDark } from './lightdark.js';

/**
 * @param {Record<string,string>} overrides token name -> value
 * @param {'light'|'dark'} theme preview color scheme
 * @returns {string} CSS declarations (no selector), newline-joined
 */
export function buildPreviewDeclarations(overrides, theme) {
  const lines = [];
  // `color-scheme` still drives native form controls / scrollbars and the few
  // tokens keyed off the framework's dark flag; we ALSO resolve light-dark()
  // ourselves below so inherited custom properties switch too.
  lines.push(`color-scheme: ${theme};`);
  lines.push(`--sf-is-dark: ${theme === 'dark' ? 1 : 0};`);

  for (const t of allTokens) {
    if (t.value == null || t.value === '') continue;
    // Skip the internal dark flag — handled explicitly above.
    if (t.name === '--sf-is-dark') continue;
    lines.push(`${t.name}: ${resolveLightDark(t.value, theme)};`);
  }
  for (const [name, value] of Object.entries(overrides)) {
    if (value == null || value === '') continue;
    lines.push(`${name}: ${resolveLightDark(value, theme)};`);
  }
  return lines.join('\n');
}
