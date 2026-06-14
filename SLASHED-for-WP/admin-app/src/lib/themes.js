/**
 * Theme presets for the configurator.
 *
 * A theme is a CURATED set of token overrides — typically only the handful
 * of global knobs and brand-defining tokens that, between them, completely
 * change how the framework feels. The bulk of the cascade still derives from
 * those few inputs (e.g. `--sf-shadow-strength` drives 14 shadows, `--sf-
 * space-scale` drives 45 spacing tokens), so 6–12 lines per preset is enough.
 *
 * The default-knob VALUES below match `core/tokens.css` so a preset can
 * meaningfully override them rather than restate the framework default.
 *
 * Pure data + tiny pure functions; safely unit-testable.
 */

import { tokenByName } from './model.js';
import { sanitizeValue } from './css.js';

/**
 * @typedef {Object} ThemePreset
 * @property {string} id          short kebab-case id
 * @property {string} name        display name
 * @property {string} icon        single emoji rendered in the gallery card
 * @property {string} blurb       one-line description shown in the card body
 * @property {Record<string,string>} overrides token-name -> value
 */

/**
 * Built-in presets. The first preset (`default`) is special: applying it
 * means "clear every override and return to the framework baseline".
 *
 * @type {ThemePreset[]}
 */
export const PRESETS = [
  {
    id: 'default',
    name: 'Framework default',
    icon: '⚪',
    blurb: 'Clear every override and let the framework defaults take over.',
    overrides: {},
  },
  {
    id: 'bold',
    name: 'Bold',
    icon: '🔥',
    blurb: 'Saturated brand colors, larger type, snappier motion, stronger elevation.',
    overrides: {
      '--sf-color-primary-light': 'oklch(0.55 0.28 264)',
      '--sf-color-action-light': 'oklch(0.62 0.23 18)',
      '--sf-text-scale': '1.08',
      '--sf-text-display-scale': '1.15',
      '--sf-shadow-strength': 'calc(0.18 + var(--sf-is-dark) * 0.22)',
      '--sf-radius-scale': '1.1',
      '--sf-motion-scale': '0.85',
    },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    icon: '📰',
    blurb: 'Generous spacing, narrower prose, restrained shadows — long-form reading optimised.',
    overrides: {
      '--sf-font-body': 'Georgia, "Times New Roman", serif',
      '--sf-font-heading': 'Georgia, "Times New Roman", serif',
      '--sf-text-scale': '1.05',
      '--sf-space-scale': '1.15',
      '--sf-section-scale': '1.2',
      '--sf-shadow-strength': 'calc(0.04 + var(--sf-is-dark) * 0.08)',
      '--sf-radius-scale': '0.5',
      '--sf-tracking-normal': '0.005em',
    },
  },
  {
    id: 'soft',
    name: 'Soft',
    icon: '🫧',
    blurb: 'Lower chroma, larger radii, diffuse shadows — a calmer marketing look.',
    overrides: {
      '--sf-color-primary-light': 'oklch(0.62 0.12 250)',
      '--sf-color-secondary-light': 'oklch(0.7 0.06 200)',
      '--sf-radius-scale': '1.6',
      '--sf-shadow-strength': 'calc(0.06 + var(--sf-is-dark) * 0.1)',
      '--sf-space-scale': '1.05',
      '--sf-motion-scale': '1.1',
    },
  },
  {
    id: 'high-contrast',
    name: 'High-contrast',
    icon: '⚫',
    blurb: 'Maximum contrast for accessibility; reduced motion respected.',
    overrides: {
      '--sf-contrast-bias': '0.15',
      '--sf-contrast-threshold': '0.5',
      '--sf-color-primary-light': 'oklch(0.45 0.28 264)',
      '--sf-color-action-light': 'oklch(0.4 0.25 18)',
      '--sf-shadow-strength': 'calc(0.22 + var(--sf-is-dark) * 0.28)',
      '--sf-motion-scale': '0',
      '--sf-focus-ring-width': '3px',
    },
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    icon: '🧱',
    blurb: 'Sharp corners, heavy borders, no shadows — utilitarian and uncompromising.',
    overrides: {
      '--sf-radius-scale': '0',
      '--sf-shadow-strength': '0',
      '--sf-border-width-1': '2px',
      '--sf-border-width-2': '3px',
      '--sf-stroke-bold': '3px',
      '--sf-text-scale': '0.95',
      '--sf-tracking-normal': '0',
      '--sf-motion-scale': '0.6',
    },
  },
];

/** Quick lookup. */
export const PRESET_BY_ID = new Map(PRESETS.map((p) => [p.id, p]));

const STORAGE_KEY = 'slashed-configurator/saved-themes/v1';

/**
 * Filter a preset's overrides to ones present in the active token catalogue
 * AND whose values pass `sanitizeValue`. Stale token names from a future
 * framework rename get dropped here so an old preset can never poison the
 * override store.
 *
 * @param {Record<string,string>} overrides
 * @returns {{ map: Record<string,string>, applied: number, skipped: string[] }}
 */
export function sanitisePreset(overrides) {
  const map = {};
  const skipped = [];
  let applied = 0;
  for (const [name, raw] of Object.entries(overrides || {})) {
    if (!tokenByName.has(name)) {
      skipped.push(name);
      continue;
    }
    const safe = sanitizeValue(raw);
    if (safe === '') {
      skipped.push(name);
      continue;
    }
    map[name] = safe;
    applied += 1;
  }
  return { map, applied, skipped };
}

/**
 * Load user-saved themes from localStorage. Tolerates malformed data.
 *
 * @returns {ThemePreset[]}
 */
export function loadSavedThemes() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t.id === 'string' && typeof t.name === 'string' && t.overrides && typeof t.overrides === 'object')
      .map((t) => ({
        id: String(t.id),
        name: String(t.name),
        icon: typeof t.icon === 'string' ? t.icon : '⭐',
        blurb: typeof t.blurb === 'string' ? t.blurb : '',
        overrides: t.overrides,
      }));
  } catch {
    return [];
  }
}

/**
 * Persist the user-saved themes list. Returns `false` if storage is blocked.
 * @param {ThemePreset[]} themes
 */
export function persistSavedThemes(themes) {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(themes));
    return true;
  } catch {
    return false;
  }
}

/**
 * Stable id from a free-text name, suitable for a saved-theme slot key.
 * @param {string} name
 */
export function slugify(name) {
  return String(name || 'theme')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'theme';
}
