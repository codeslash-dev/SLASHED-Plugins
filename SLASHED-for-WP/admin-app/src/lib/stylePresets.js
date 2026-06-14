/**
 * Style preset rows — one-click looks for the Basic borders/shadows panels.
 *
 * Each preset is a small override patch applied via `patchOverrides()`
 * (single history step, one Ctrl+Z fully reverts). A `null` value clears
 * that token back to the framework default, which gives two invariants:
 *
 *   1. every list has a "default" preset whose patch is all-nulls — the
 *      framework look is always one click away;
 *   2. presets null the tokens they DON'T set, so applying preset B after
 *      preset A can never leave A's leftovers masking B (e.g. a previous
 *      "None" shadow pinning the steps to `none`).
 *
 * Values stay engine-aware: radius presets keep `* var(--sf-radius-scale)`
 * so the Power knob remains live, and shadow presets steer the framework's
 * own `--sf-shadow-strength` lever (default 0.08) while preserving its
 * automatic dark-mode boost (`+ var(--sf-is-dark) * 0.17`).
 *
 * Every patch key must exist in the catalogue and every non-null value must
 * survive sanitizeValue — enforced by tests/style-presets.test.js.
 *
 * @typedef {{ id: string, label: string, hint: string, patch: Record<string, string|null> }} StylePreset
 */

/** Framework default: radius 4/8/12px (× --sf-radius-scale). @type {StylePreset[]} */
export const BORDER_STYLE_PRESETS = [
  {
    id: 'sharp',
    label: 'Sharp',
    hint: 'No rounding anywhere — brutalist corners.',
    patch: {
      '--sf-radius-s': '0px',
      '--sf-radius-m': '0px',
      '--sf-radius-l': '0px',
    },
  },
  {
    id: 'subtle',
    label: 'Subtle',
    hint: 'Half the default rounding — barely-there corners.',
    patch: {
      '--sf-radius-s': 'calc(2px * var(--sf-radius-scale))',
      '--sf-radius-m': 'calc(4px * var(--sf-radius-scale))',
      '--sf-radius-l': 'calc(6px * var(--sf-radius-scale))',
    },
  },
  {
    id: 'rounded',
    label: 'Rounded',
    hint: 'The framework default (4/8/12px).',
    patch: {
      '--sf-radius-s': null,
      '--sf-radius-m': null,
      '--sf-radius-l': null,
    },
  },
  {
    id: 'pill',
    label: 'Pill',
    hint: 'Heavy rounding; large surfaces go fully capsule-shaped.',
    patch: {
      '--sf-radius-s': 'calc(10px * var(--sf-radius-scale))',
      '--sf-radius-m': 'calc(20px * var(--sf-radius-scale))',
      '--sf-radius-l': '9999px',
    },
  },
];

/** Framework default strength: 0.08 (+0.17 in dark mode). @type {StylePreset[]} */
export const SHADOW_STYLE_PRESETS = [
  {
    id: 'none',
    label: 'None',
    hint: 'Flat design — no elevation shadows at all.',
    patch: {
      '--sf-shadow-s': 'none',
      '--sf-shadow-m': 'none',
      '--sf-shadow-l': 'none',
      '--sf-shadow-xl': 'none',
      '--sf-shadow-strength': null,
    },
  },
  {
    id: 'subtle',
    label: 'Subtle',
    hint: 'Half-strength shadows; the dark-mode boost stays intact.',
    patch: {
      '--sf-shadow-strength': 'calc(0.04 + var(--sf-is-dark) * 0.17)',
      '--sf-shadow-s': null,
      '--sf-shadow-m': null,
      '--sf-shadow-l': null,
      '--sf-shadow-xl': null,
    },
  },
  {
    id: 'soft',
    label: 'Soft',
    hint: 'The framework default (strength 0.08).',
    patch: {
      '--sf-shadow-strength': null,
      '--sf-shadow-s': null,
      '--sf-shadow-m': null,
      '--sf-shadow-l': null,
      '--sf-shadow-xl': null,
    },
  },
  {
    id: 'strong',
    label: 'Strong',
    hint: 'Double-strength shadows for pronounced depth.',
    patch: {
      '--sf-shadow-strength': 'calc(0.16 + var(--sf-is-dark) * 0.17)',
      '--sf-shadow-s': null,
      '--sf-shadow-m': null,
      '--sf-shadow-l': null,
      '--sf-shadow-xl': null,
    },
  },
];

/** Preset lists by Basic domain id (consumed by DomainPanel). */
export const STYLE_PRESETS_BY_DOMAIN = {
  borders: { title: 'Corner style', presets: BORDER_STYLE_PRESETS },
  shadows: { title: 'Shadow style', presets: SHADOW_STYLE_PRESETS },
};

/**
 * Whether a preset is currently active: every null key is un-overridden and
 * every value key matches the live override exactly.
 *
 * @param {StylePreset} preset
 * @param {Record<string, string>} overrides
 * @returns {boolean}
 */
export function presetActive(preset, overrides) {
  return Object.entries(preset.patch).every(([name, value]) =>
    value === null ? overrides[name] == null : overrides[name] === value
  );
}
