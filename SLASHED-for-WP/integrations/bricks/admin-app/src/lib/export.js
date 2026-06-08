/**
 * CSS export generator for SLASHED design tokens.
 *
 * Client-side mirror of class-css-generator.php. Reads the reactive
 * `tokens` store and produces a standalone CSS string wrapped in
 * @layer slashed.overrides { :root { ... } } containing only non-empty
 * customized values.
 *
 * Used by SaveBar to offer an "Export CSS" download so users can ship
 * their overrides without a WordPress runtime dependency.
 */

/** Viewport range fallbacks — mirror Slashed_CSS_Generator::VIEWPORT_MIN/MAX. */
const VIEWPORT_MIN = 22.5;
const VIEWPORT_MAX = 90;

/** Floor/cap clamps — mirror Slashed_CSS_Generator::resolve_viewport_min/max(). */
const VIEWPORT_MIN_FLOOR = 10;
const VIEWPORT_MIN_CAP   = 60;
const VIEWPORT_MAX_FLOOR = 40;
const VIEWPORT_MAX_CAP   = 200;

/**
 * Resolve the fluid viewport range from the user's spacing settings,
 * falling back to the framework defaults — mirrors
 * Slashed_CSS_Generator::resolve_viewport_min/max() so the exported CSS
 * uses the exact same clamp() curve the server would generate for the
 * same settings.
 *
 * @param {Object} spacingSettings Spacing section settings.
 * @returns {{ min: number, max: number }}
 */
function resolveViewportRange(spacingSettings) {
  const raw = (key, fallback, floor, cap) => {
    const v = spacingSettings?.[key];
    if (!hasValue(v) || isNaN(parseFloat(v))) return fallback;
    return Math.max(floor, Math.min(cap, parseFloat(v)));
  };
  return {
    min: raw('viewport_min', VIEWPORT_MIN, VIEWPORT_MIN_FLOOR, VIEWPORT_MIN_CAP),
    max: raw('viewport_max', VIEWPORT_MAX, VIEWPORT_MAX_FLOOR, VIEWPORT_MAX_CAP),
  };
}

/**
 * Build a clamp() expression for fluid type scaling.
 *
 * @param {number} min Minimum size in rem.
 * @param {number} max Maximum size in rem.
 * @param {number} vpMin Viewport range minimum, in rem.
 * @param {number} vpMax Viewport range maximum, in rem.
 * @returns {string|null} The clamp() expression or null on invalid input.
 */
function buildClamp(min, max, vpMin, vpMax) {
  if (min <= 0 || max <= 0 || vpMax <= vpMin) return null;
  const range = vpMax - vpMin;
  const slope = (max - min) / range;
  const slopeRounded = parseFloat(slope.toFixed(6));
  const minRounded = parseFloat(min.toFixed(4));
  const maxRounded = parseFloat(max.toFixed(4));
  return `clamp(${minRounded}rem, calc(${slopeRounded} * (100vw - ${vpMin}rem) + ${minRounded}rem), ${maxRounded}rem)`;
}

/**
 * Locale-safe float formatter. Trims trailing zeros.
 *
 * @param {string|number} value Raw numeric input.
 * @returns {string}
 */
function formatFloat(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '0';
  // Up to 6 decimals, trim trailing zeros and dot.
  let out = num.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
  return out === '' ? '0' : out;
}

/**
 * Check if a value is non-empty.
 *
 * @param {*} v
 * @returns {boolean}
 */
function hasValue(v) {
  return v !== undefined && v !== null && v !== '';
}

/**
 * Generate CSS declarations for color tokens.
 *
 * @param {Object} settings Color section settings.
 * @returns {string[]} CSS declaration strings.
 */
function generateColorDeclarations(settings) {
  const declarations = [];

  // Brand colors (light): brand_primary -> --sf-color-primary-light.
  // The final family is `base` (source token --sf-color-base-light), NOT
  // `surface` — surface is a derived token with no -light source. Must stay
  // in sync with class-css-generator.php::generate_color_declarations().
  const brandColors = ['primary', 'secondary', 'tertiary', 'action', 'neutral', 'base'];
  for (const color of brandColors) {
    const key = `brand_${color}`;
    if (hasValue(settings[key])) {
      declarations.push(`--sf-color-${color}-light: ${settings[key]};`);
    }
  }

  // Status colors (light): status_success -> --sf-color-success-light.
  const statusColors = ['success', 'warning', 'error', 'info', 'danger'];
  for (const color of statusColors) {
    const key = `status_${color}`;
    if (hasValue(settings[key])) {
      declarations.push(`--sf-color-${color}-light: ${settings[key]};`);
    }
  }

  // Dark overrides are skipped when the toggle is explicitly disabled.
  // Default (key absent or '1') keeps previous behaviour: output dark overrides.
  const darkEnabled = settings.dark_overrides_enabled !== '0';

  if (darkEnabled) {
    for (const color of brandColors) {
      const key = `brand_dark_${color}`;
      if (hasValue(settings[key])) {
        declarations.push(`--sf-color-${color}-dark: ${settings[key]};`);
      }
    }
    for (const color of statusColors) {
      const key = `status_dark_${color}`;
      if (hasValue(settings[key])) {
        declarations.push(`--sf-color-${color}-dark: ${settings[key]};`);
      }
    }
  }

  return declarations;
}

/**
 * Generate CSS declarations for typography tokens.
 *
 * @param {Object} settings Typography section settings.
 * @param {{ min: number, max: number }} vpRange Fluid viewport range, in rem
 *   (shared with spacing — see resolveViewportRange()).
 * @returns {string[]} CSS declaration strings.
 */
function generateTypographyDeclarations(settings, vpRange) {
  const declarations = [];

  // Font families: font_body -> --sf-font-body.
  const fontStacks = ['body', 'heading', 'mono', 'display', 'humanist', 'geometric', 'slab'];
  for (const name of fontStacks) {
    const key = `font_${name}`;
    if (hasValue(settings[key])) {
      declarations.push(`--sf-font-${name}: ${settings[key]};`);
    }
  }

  // Scale multipliers.
  if (hasValue(settings.text_scale)) {
    declarations.push(`--sf-text-scale: ${settings.text_scale};`);
  }
  if (hasValue(settings.text_display_scale)) {
    declarations.push(`--sf-text-display-scale: ${settings.text_display_scale};`);
  }

  // Font sizes: size_X_min + size_X_max -> --sf-text-X with clamp().
  const sizes = ['2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl', 'display-s', 'display-m', 'display-l'];
  for (const size of sizes) {
    const minKey = `size_${size}_min`;
    const maxKey = `size_${size}_max`;
    const minVal = settings[minKey];
    const maxVal = settings[maxKey];
    if (hasValue(minVal) && hasValue(maxVal)) {
      const clamp = buildClamp(parseFloat(minVal), parseFloat(maxVal), vpRange.min, vpRange.max);
      if (clamp) {
        declarations.push(`--sf-text-${size}: ${clamp};`);
      }
    }
  }

  return declarations;
}

/**
 * Generate CSS declarations for spacing tokens.
 *
 * @param {Object} settings Spacing section settings.
 * @param {{ min: number, max: number }} vpRange Fluid viewport range, in rem
 *   (see resolveViewportRange()).
 * @returns {string[]} CSS declaration strings.
 */
function generateSpacingDeclarations(settings, vpRange) {
  const declarations = [];

  if (hasValue(settings.space_scale)) {
    declarations.push(`--sf-space-scale: ${settings.space_scale};`);
  }

  const steps = ['2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'];
  for (const step of steps) {
    const minVal = settings[`space_${step}_min`];
    const maxVal = settings[`space_${step}_max`];
    if (hasValue(minVal) && hasValue(maxVal)) {
      const clamp = buildClamp(parseFloat(minVal), parseFloat(maxVal), vpRange.min, vpRange.max);
      if (clamp) {
        declarations.push(`--sf-space-${step}: calc(${clamp} * var(--sf-space-scale));`);
      }
    }
  }

  const aliases = {
    gutter: '--sf-space-gutter',
    gap: '--sf-gap',
    content_gap: '--sf-content-gap',
    component_pad: '--sf-component-pad',
    section_pad: '--sf-section-pad',
  };

  for (const [key, property] of Object.entries(aliases)) {
    if (hasValue(settings[key])) {
      declarations.push(`${property}: ${settings[key]};`);
    }
  }

  return declarations;
}

/**
 * Generate CSS declarations for radius tokens.
 *
 * @param {Object} settings Radius section settings.
 * @returns {string[]} CSS declaration strings.
 */
function generateRadiusDeclarations(settings) {
  const declarations = [];

  if (hasValue(settings.radius_scale)) {
    declarations.push(`--sf-radius-scale: ${settings.radius_scale};`);
  }

  return declarations;
}

/**
 * Generate CSS declarations for shadow tokens.
 *
 * @param {Object} settings Shadows section settings.
 * @returns {string[]} CSS declaration strings.
 */
function generateShadowDeclarations(settings) {
  const declarations = [];

  if (hasValue(settings.shadow_strength)) {
    declarations.push(`--sf-shadow-strength: calc(${settings.shadow_strength} + var(--sf-is-dark) * 0.17);`);
  }

  if (hasValue(settings.glow_color)) {
    declarations.push(`--sf-shadow-glow-color: ${settings.glow_color};`);
  }

  return declarations;
}

/**
 * Generate CSS declarations for motion tokens.
 *
 * @param {Object} settings Motion section settings.
 * @returns {string[]} CSS declaration strings.
 */
function generateMotionDeclarations(settings) {
  const declarations = [];

  if (hasValue(settings.motion_scale)) {
    declarations.push(`--sf-motion-scale: ${settings.motion_scale};`);
  }

  // Duration values: duration_instant -> --sf-duration-instant: calc(Xms * var(--sf-motion-scale));
  const durations = ['instant', 'fast', 'normal', 'slow', 'slower'];
  for (const name of durations) {
    const key = `duration_${name}`;
    if (hasValue(settings[key])) {
      declarations.push(`--sf-duration-${name}: calc(${settings[key]}ms * var(--sf-motion-scale));`);
    }
  }

  return declarations;
}

/**
 * Generate CSS declarations for z-index tokens.
 *
 * @param {Object} settings Z-index section settings.
 * @returns {string[]} CSS declaration strings.
 */
function generateZindexDeclarations(settings) {
  const declarations = [];

  const levels = ['below', 'base', 'raised', 'low', 'mid', 'high', 'top', 'max'];
  for (const name of levels) {
    if (hasValue(settings[name])) {
      declarations.push(`--sf-z-${name}: ${parseInt(settings[name], 10)};`);
    }
  }

  return declarations;
}

/**
 * Generate CSS declarations for contrast tokens.
 *
 * @param {Object} settings Contrast section settings.
 * @returns {string[]} CSS declaration strings.
 */
function generateContrastDeclarations(settings) {
  const declarations = [];

  // Plain unitless numerics.
  const numerics = {
    contrast_bias: '--sf-contrast-bias',
    contrast_threshold: '--sf-contrast-threshold',
    opacity_disabled: '--sf-opacity-disabled',
  };
  for (const [key, property] of Object.entries(numerics)) {
    if (hasValue(settings[key])) {
      declarations.push(`${property}: ${formatFloat(settings[key])};`);
    }
  }

  // Pixel-typed focus ring metrics.
  const pixelMetrics = {
    focus_ring_width: '--sf-focus-ring-width',
    focus_ring_offset: '--sf-focus-ring-offset',
  };
  for (const [key, property] of Object.entries(pixelMetrics)) {
    if (hasValue(settings[key])) {
      declarations.push(`${property}: ${formatFloat(settings[key])}px;`);
    }
  }

  // Focus ring style: restricted enum.
  if (hasValue(settings.focus_ring_style)) {
    const allowed = ['solid', 'dashed', 'dotted', 'double', 'none'];
    if (allowed.includes(settings.focus_ring_style)) {
      declarations.push(`--sf-focus-ring-style: ${settings.focus_ring_style};`);
    }
  }

  return declarations;
}

/**
 * Generate the full CSS export string from all token sections.
 *
 * @param {Object} allTokens The full tokens store object (keyed by section).
 * @returns {string} CSS output or empty string if no overrides.
 */
export function generateExportCSS(allTokens) {
  const declarations = [];

  // Shared by typography and spacing — mirrors how Slashed_CSS_Generator
  // resolves the viewport range once and threads it into both generators,
  // so the exported CSS clamp() curves match what the server would emit
  // for the same settings.
  const vpRange = resolveViewportRange(allTokens.spacing);

  if (allTokens.colors && typeof allTokens.colors === 'object') {
    declarations.push(...generateColorDeclarations(allTokens.colors));
  }

  if (allTokens.typography && typeof allTokens.typography === 'object') {
    declarations.push(...generateTypographyDeclarations(allTokens.typography, vpRange));
  }

  if (allTokens.spacing && typeof allTokens.spacing === 'object') {
    declarations.push(...generateSpacingDeclarations(allTokens.spacing, vpRange));
  }

  if (allTokens.radius && typeof allTokens.radius === 'object') {
    declarations.push(...generateRadiusDeclarations(allTokens.radius));
  }

  if (allTokens.shadows && typeof allTokens.shadows === 'object') {
    declarations.push(...generateShadowDeclarations(allTokens.shadows));
  }

  if (allTokens.motion && typeof allTokens.motion === 'object') {
    declarations.push(...generateMotionDeclarations(allTokens.motion));
  }

  if (allTokens.zindex && typeof allTokens.zindex === 'object') {
    declarations.push(...generateZindexDeclarations(allTokens.zindex));
  }

  if (allTokens.contrast && typeof allTokens.contrast === 'object') {
    declarations.push(...generateContrastDeclarations(allTokens.contrast));
  }

  if (declarations.length === 0) return '';

  let css = '@layer slashed.overrides {\n\t:root {\n';
  for (const decl of declarations) {
    css += `\t\t${decl}\n`;
  }
  css += '\t}\n}';

  return css;
}

/**
 * Check whether any non-empty overrides exist across all token sections.
 *
 * @param {Object} allTokens The full tokens store object (keyed by section).
 * @returns {boolean}
 */
export function hasOverrides(allTokens) {
  if (!allTokens || typeof allTokens !== 'object') return false;

  for (const section of Object.values(allTokens)) {
    if (!section || typeof section !== 'object') continue;
    for (const value of Object.values(section)) {
      if (typeof value === 'object' && value !== null) {
        for (const v of Object.values(value)) {
          if (v !== '' && v !== null && v !== undefined) return true;
        }
      } else if (value !== '' && value !== null && value !== undefined) {
        return true;
      }
    }
  }

  return false;
}
