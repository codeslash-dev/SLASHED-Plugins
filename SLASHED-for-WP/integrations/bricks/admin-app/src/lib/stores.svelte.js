/**
 * Centralized reactive state for the admin SPA.
 *
 * Svelte 5 runes ($state) make module-level state reactive when the
 * file ends in .svelte.js. Components that read `tokens.colors.brand_primary`
 * automatically re-render when it changes, and the live-preview derived
 * CSS recomputes for free.
 *
 * Hydrated once at module load from window.slashedApp. The shape
 * mirrors the `slashed_tokens` wp_option exactly:
 *
 *   tokens.<section>.<key> = string
 *
 * For colors, the merged key (e.g. `brand_primary`) holds whichever of
 * hex / raw the user last set - same as PHP's sanitize_color_section
 * already produces. The ColorRow component owns the hex/raw split locally
 * so the store stays a flat key-value map.
 */

const bootstrap = typeof window !== 'undefined' && window.slashedApp
  ? window.slashedApp
  : { defaults: {}, settings: {}, tabs: {}, rest: { url: '', nonce: '' } };

/** Read-only metadata: factory defaults, available tabs, REST handshake, inventory, plugin settings. */
export const meta = {
  defaults: bootstrap.defaults || {},
  tabs: bootstrap.tabs || {},
  rest: bootstrap.rest || { url: '', nonce: '' },
  inventory: bootstrap.inventory || { variables: [], sf_classes: [], is_classes: [] },
  pluginSettings: bootstrap.pluginSettings || {},
  versions: bootstrap.versions || { plugin: '', framework: '' },
  activeIntegrations: bootstrap.activeIntegrations || { bricks: true, gutenberg: true },
  bricksFonts: bootstrap.bricksFonts || [],
};

/** Reactive token state. Mutating any nested key triggers re-renders. */
export const tokens = $state(structuredClone(bootstrap.settings || {}));

/** Reactive UI state: active tab, dirty flag, save status, last error. */
export const ui = $state({
  activeTab: firstTabSlug(meta.tabs) || 'colors',
  dirty: false,
  saving: false,
  lastSavedAt: null,
  error: '',
});

/**
 * Pick the first key from the registered tabs object.
 *
 * Used as the initial `ui.activeTab` so the SPA opens on whichever tab
 * the PHP side declared first (currently "colors"). Returns `null` for
 * the empty case so the consumer can fall back to its own default.
 *
 * @param {Object<string, string>} tabs - Tab slug → display label map.
 * @returns {string|null}
 */
function firstTabSlug(tabs) {
  for (const slug in tabs) return slug;
  return null;
}

/**
 * Mark the form dirty. Called from any component on input.
 * Idempotent; cheap to call on every keystroke.
 */
export function markDirty() {
  ui.dirty = true;
  ui.error = '';
}

/**
 * Drop a section's local overrides so PHP defaults take over again
 * the next time the page is loaded or saved.
 *
 * Does NOT mark dirty — callers own the dirty/clean transition so the
 * reset handler can set dirty=false immediately after without a flicker.
 */
export function clearSection(section) {
  if (tokens[section]) {
    delete tokens[section];
  }
}

/**
 * Resolve the fluid viewport range, in pixels, used by every fluid
 * `clamp()` formula the framework emits.
 *
 * The range is owned by the Spacing tab's "Fluid Scale Viewport Range"
 * (`tokens.spacing.viewport_min` / `viewport_max`, stored in `rem`) and
 * is the single source of truth shared by the Spacing and Typography
 * live-scale previews — so the previewed scale always matches what the
 * generated CSS would actually clamp between. Falls back to the PHP
 * defaults (22.5rem → 90rem) when the user hasn't overridden them.
 *
 * Reading `tokens` here keeps the result reactive: callers that wrap a
 * `$derived` around this recompute when the viewport fields change.
 *
 * @returns {{ minRem: number, maxRem: number, minPx: number, maxPx: number }}
 */
export function viewportRangePx() {
  const sp  = tokens.spacing ?? {};
  const def = meta.defaults?.spacing ?? {};

  const read = (key, fallback) => {
    const v = sp[key];
    const n = v !== undefined && v !== '' ? parseFloat(v) : parseFloat(def[key] ?? fallback);
    return Number.isFinite(n) ? n : fallback;
  };

  const minRem = read('viewport_min', 22.5);
  const maxRem = read('viewport_max', 90);
  // Guard against an inverted/zero range so the previews never divide by
  // zero or run the slider backwards while the user is mid-edit.
  const safeMax = maxRem > minRem ? maxRem : minRem + 0.5;

  return {
    minRem,
    maxRem: safeMax,
    minPx: Math.round(minRem * 16),
    maxPx: Math.round(safeMax * 16),
  };
}

/**
 * Read a single field from a (possibly absent) section.
 *
 * Returns an empty string when the section or key isn't present so
 * callers can bind directly to an `<input>` without null-checking.
 *
 * @param {string} section Section slug, e.g. "contrast".
 * @param {string} key     Token key, e.g. "contrast_bias".
 * @returns {string} Stored value as a string, or '' if unset.
 */
export function readField(section, key) {
  const slice = tokens[section];
  if (!slice) return '';
  const v = slice[key];
  return v === undefined || v === null ? '' : String(v);
}

/**
 * Persist a single field, lazily creating the section slice and
 * deleting the key when the value is "empty" (empty string / null /
 * undefined) so PHP defaults can take over again.
 *
 * Mirrors the contract of `ColorRow.commit()`: any non-empty value is
 * stored as a string, any empty value drops the override entirely, and
 * every write marks the form dirty so SaveBar reacts. Centralising
 * this pattern keeps every field component a thin shell around a
 * single store mutation — no duplicated empty/null branching across
 * RangeField, NumberField, TextField, SelectField.
 *
 * @param {string} section Section slug, e.g. "typography".
 * @param {string} key     Token key, e.g. "font_body".
 * @param {string|number|null|undefined} value Raw input value.
 */
export function writeField(section, key, value) {
  if (!tokens[section]) tokens[section] = {};
  const isEmpty =
    value === '' || value === null || value === undefined ||
    (typeof value === 'string' && value.trim() === '');
  if (isEmpty) {
    delete tokens[section][key];
  } else {
    tokens[section][key] = String(value);
  }
  markDirty();
}
