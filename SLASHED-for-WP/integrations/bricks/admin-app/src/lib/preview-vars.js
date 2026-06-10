/**
 * Shared live-preview CSS-variable derivation for the WP admin app.
 *
 * The WP admin page does NOT load the SLASHED stylesheet (it would clobber
 * wp-admin's own UI), so the framework's `--sf-color-*` derivations can't
 * resolve here. This module recomputes the handful both the Live Preview and
 * the WCAG checker need, mirroring core/tokens.css verbatim, so BOTH features
 * resolve colors from ONE source of truth — what you preview is exactly what
 * the contrast checker measures.
 *
 * Returns a `;`-joined declaration string ready for a `style` attribute:
 *   - source light/dark brand+status colors  (`--sf-color-*-light` / `-dark`)
 *   - resolved active-mode colors             (`--c-*`)
 *   - auto-contrasting on-color text          (`--on-*`)
 *   - surfaces derived from base              (`--c-surface/bg/raised/inset`)
 *   - text hierarchy, borders, links          (mode-dependent formulas)
 *   - status tints                            (`--tint-*`)
 *   - font families + preview radius/shadow vars
 *
 * Pure aside from reading the passed-in `tokens` / `meta`; no DOM, no Svelte.
 */
import { sanitizeValue } from './export.js';

/** Brand color roles, in framework order (base is the surface source). */
export const BRAND_NAMES = ['primary', 'secondary', 'tertiary', 'action', 'neutral', 'base'];

/** Status color roles. */
export const STATUS_NAMES = ['success', 'warning', 'error', 'info', 'danger'];

// Auto-derivation formulas matching core/tokens.css verbatim. Module-level so
// they're defined once, not recreated per call.
const autoDarkStandard = (light) =>
  `oklch(from var(${light}) clamp(0.65, calc(0.95 - l * 0.5), 0.88) calc(c * 0.9) h)`;
const autoDarkBase = (light) =>
  `oklch(from var(${light}) clamp(0.16, calc(1.18 - l), 0.24) calc(c * 0.5) h)`;
const autoDark = (name) => {
  const light = `--sf-color-${name}-light`;
  return name === 'base' ? autoDarkBase(light) : autoDarkStandard(light);
};

/**
 * Build the preview CSS custom-property block.
 *
 * @param {object} tokens reactive token store (sections keyed by name)
 * @param {object} meta hydrated metadata (`defaults`, etc.)
 * @param {boolean} darkMode resolve the dark color mode when true
 * @returns {string} `;`-joined CSS declarations for a `style` attribute
 */
export function buildPreviewVars(tokens, meta, darkMode) {
  const pairs = [];
  const defaultColors = meta.defaults?.colors ?? {};
  const colors = tokens.colors ?? {};
  const typography = tokens.typography ?? {};
  const radius = tokens.radius ?? {};
  const shadows = tokens.shadows ?? {};
  const contrast = tokens.contrast ?? {};
  const m = darkMode ? 'dark' : 'light';

  // Contrast knobs — mirror framework defaults so derived tokens match what
  // the generator would emit.
  const TH = (() => {
    const v = contrast.contrast_threshold;
    const n = v !== undefined && v !== '' ? parseFloat(v) : parseFloat(meta.defaults?.contrast?.contrast_threshold ?? 0.6);
    return Number.isFinite(n) ? n : 0.6;
  })();
  const BIAS = (() => {
    const v = contrast.contrast_bias;
    const n = v !== undefined && v !== '' ? parseFloat(v) : parseFloat(meta.defaults?.contrast?.contrast_bias ?? 0);
    return Number.isFinite(n) ? n : 0;
  })();

  const darkEnabled = colors.dark_overrides_enabled !== '0';

  // 1. Source light/dark colors (swatch lookups read these by mode). Sanitize
  //    every user-entered value before it lands in the inline-style string.
  for (const name of BRAND_NAMES) {
    const v = sanitizeValue(colors[`brand_${name}`] ?? defaultColors.brand_hex_hints?.[name]);
    if (v) pairs.push(`--sf-color-${name}-light:${v}`);
    const storedDark = darkEnabled ? sanitizeValue(colors[`brand_dark_${name}`]) : '';
    pairs.push(`--sf-color-${name}-dark:${storedDark || autoDark(name)}`);
  }
  for (const name of STATUS_NAMES) {
    const v = sanitizeValue(colors[`status_${name}`] ?? defaultColors.status_hex_hints?.[name]);
    if (v) pairs.push(`--sf-color-${name}-light:${v}`);
    const storedDark = darkEnabled ? sanitizeValue(colors[`status_dark_${name}`]) : '';
    pairs.push(`--sf-color-${name}-dark:${storedDark || autoDark(name)}`);
  }

  // 2. Resolved active-mode color + auto-contrasting on-color text.
  const onColor = (cvar) =>
    `oklch(from ${cvar} clamp(0.1, sign(${TH} - l) * 999, 0.95) 0 0)`;
  for (const name of [...BRAND_NAMES, ...STATUS_NAMES]) {
    pairs.push(`--c-${name}:var(--sf-color-${name}-${m})`);
    pairs.push(`--on-${name}:${onColor(`var(--c-${name})`)}`);
  }

  // 3. Surfaces — derived from --c-base, matching tokens.css.
  pairs.push(`--c-surface:var(--c-base)`);
  pairs.push(`--c-bg:oklch(from var(--c-base) calc(l + 0.02) c h)`);
  pairs.push(`--c-raised:oklch(from var(--c-base) calc(l + 0.04) c h)`);
  pairs.push(`--c-inset:oklch(from var(--c-base) calc(l - 0.02) c h)`);

  // 4. Text hierarchy — opposite formula directions per mode.
  const neutralSrc = m === 'dark' ? 'var(--c-neutral)' : 'var(--sf-color-neutral-light)';
  if (m === 'dark') {
    pairs.push(`--c-text:oklch(from ${neutralSrc} clamp(0.70, calc(l + 0.25 + ${BIAS}), 1) c h)`);
    pairs.push(`--c-text-secondary:oklch(from ${neutralSrc} clamp(0.55, calc(l + 0.1 + ${BIAS}), 0.90) c h)`);
    pairs.push(`--c-border:oklch(from ${neutralSrc} clamp(0.25, calc(l - 0.3), 0.55) 0.005 h)`);
    pairs.push(`--c-border-subtle:oklch(from ${neutralSrc} clamp(0.20, calc(l - 0.38), 0.45) 0.005 h)`);
    pairs.push(`--c-link:oklch(from var(--c-action) clamp(0.68, l, 1) c h)`);
  } else {
    pairs.push(`--c-text:oklch(from ${neutralSrc} clamp(0.05, calc(l - 0.4 - ${BIAS}), 0.35) c h)`);
    pairs.push(`--c-text-secondary:oklch(from ${neutralSrc} clamp(0.15, calc(l - 0.25 - ${BIAS}), 0.45) c h)`);
    pairs.push(`--c-border:oklch(from ${neutralSrc} clamp(0.70, calc(l + 0.35), 0.95) 0.005 h)`);
    pairs.push(`--c-border-subtle:oklch(from ${neutralSrc} clamp(0.75, calc(l + 0.4), 0.97) 0.005 h)`);
    pairs.push(`--c-link:oklch(from var(--c-action) clamp(0, min(l - 0.07, 0.48), 1) c h)`);
  }
  pairs.push(`--c-text-muted:var(--c-neutral)`);

  // 5. Status tints (translucent fills for alerts).
  for (const name of STATUS_NAMES) {
    pairs.push(`--tint-${name}:oklch(from var(--c-${name}) l c h / 0.14)`);
  }

  // 6. Font families. Gate on the sanitized result so a value that sanitizes
  //    to empty doesn't emit a valueless `--sf-font-*:` declaration.
  const fontBody = sanitizeValue(typography.font_body);
  if (fontBody) pairs.push(`--sf-font-body:${fontBody}`);
  const fontHeading = sanitizeValue(typography.font_heading);
  if (fontHeading) pairs.push(`--sf-font-heading:${fontHeading}`);

  // 7. Radius + shadow preview vars.
  const rs = parseFloat(radius.radius_scale ?? meta.defaults?.radius?.radius_scale ?? 1) || 1;
  pairs.push(`--preview-radius-s:${Math.round(4 * rs)}px`);
  pairs.push(`--preview-radius-m:${Math.round(8 * rs)}px`);
  pairs.push(`--preview-radius-l:${Math.round(16 * rs)}px`);

  const ssRaw = shadows.shadow_strength;
  const ss = ssRaw !== undefined && ssRaw !== ''
    ? parseFloat(ssRaw)
    : parseFloat(meta.defaults?.shadows?.shadow_strength ?? 0.08);
  pairs.push(`--preview-shadow:0 2px 8px 0 rgba(0,0,0,${(ss * 2).toFixed(3)}),0 1px 3px 0 rgba(0,0,0,${ss.toFixed(3)})`);

  return pairs.join(';');
}
