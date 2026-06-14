/**
 * Centralized reactive state — WP REST API adapter.
 *
 * The exported interface is intentionally identical to the configurator's
 * configurator/src/lib/store.svelte.js so all synced components
 * (DomainPanel, Preview, TokenRow, OutputPanel, …) work unchanged.
 *
 * The only differences from the standalone configurator:
 *   • loadOverrides()  reads PHP hydration (window.slashedApp.overrides)
 *                      instead of localStorage
 *   • persist()        debounces a POST to /tokens/overrides (REST API)
 *                      and writes a local cache for page-transition speed
 *   • ui               has two extra WP fields: useManualCss, manualCssText
 *   • wpSettings       exposes plugin-level settings (bundle, version, …)
 */

import { allTokens, tokenByName } from './model.js';
import { sanitizeValue } from './css.js';
import { sanitisePreset, loadSavedThemes, persistSavedThemes, slugify } from './themes.js';
import { sanitiseUiState, UI_STORAGE_KEY } from './uiState.js';
import * as ops from './historyOps.js';
import { saveOverrides as apiSave } from './wp-api.js';

const LOCAL_CACHE_KEY = 'slashed-wp/overrides-cache/v1';
const HISTORY_LIMIT = 50;

const boot = typeof window !== 'undefined' && window.slashedApp ? window.slashedApp : {};

/**
 * Override map: token CSS custom-property name → user value.
 * Loaded from PHP hydration; persisted to WP REST API.
 * @type {Record<string, string>}
 */
export const overrides = $state(loadOverrides());

/** Persistence health — ok: false when a REST save fails. */
export const storage = $state({ ok: true });

const savedUi = loadUiState();
export const ui = $state({
  domain:        savedUi.domain    ?? 'home',
  mode:          savedUi.mode      ?? 'basic',
  query:         '',
  showInternal:  false,
  onlyModified:  false,
  usageFilter:   'all',
  previewTheme:  'light',
  previewMotion: 'normal',
  previewWidth:  'fluid',
  outputMode:    savedUi.outputMode ?? 'layer',
  uiTheme:       savedUi.uiTheme   ?? 'dark',
  sidebarOpen:   true,
  previewOpen:   typeof window === 'undefined' || !window.matchMedia('(max-width: 1100px)').matches,
  outputOpen:    typeof window === 'undefined' || !window.matchMedia('(max-width: 600px)').matches,
  // WP-specific
  useManualCss:  !!(boot.pluginSettings?.manual_css_mode),
  manualCssText: '',
});

/** @type {{ past: string[], future: string[] }} */
export const history = $state({ past: [], future: [] });

export const savedThemes = $state(loadSavedThemes());

/** Plugin-level WP settings (bundle, html_font_size, integrations, …). */
export const wpSettings = $state({ ...(boot.pluginSettings ?? {}) });

// ── Persistence ──────────────────────────────────────────────────────────────

function loadUiState() {
  if (typeof localStorage === 'undefined') return {};
  try { return sanitiseUiState(localStorage.getItem(UI_STORAGE_KEY)); } catch { return {}; }
}

function loadOverrides() {
  // Primary: PHP hydration — the authoritative DB state written at page render.
  const data = boot.overrides;
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const clean = {};
    for (const [k, v] of Object.entries(data)) {
      if (tokenByName.has(k) && typeof v === 'string') {
        const safe = sanitizeValue(v);
        if (safe !== '') clean[k] = safe;
      }
    }
    return clean;
  }
  // Fallback: stale local cache (Vite dev harness without backend)
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const clean = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (tokenByName.has(k) && typeof v === 'string') {
          const safe = sanitizeValue(v);
          if (safe !== '') clean[k] = safe;
        }
      }
      return clean;
    }
  } catch { /* ignore */ }
  return {};
}

let _persistTimer = null;

function persist() {
  // Write-through local cache for instant subsequent page-loads
  try { localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(overrides)); } catch { /* quota */ }
  // Debounced REST save so rapid slider drags don’t flood the API
  clearTimeout(_persistTimer);
  _persistTimer = setTimeout(async () => {
    try {
      await apiSave({ ...overrides });
      storage.ok = true;
    } catch {
      storage.ok = false;
    }
  }, 400);
}

// ── historyOps wiring ────────────────────────────────────────────────────────────

const opsState = {
  get overrides() { return overrides; },
  get history()   { return history; },
  limit:     HISTORY_LIMIT,
  sanitize:  sanitizeValue,
  isKnown:   (name) => tokenByName.has(name),
  persist,
  _dragSnap: null,
};

// ── History ───────────────────────────────────────────────────────────────────

export function undo() { return ops.undoStep(opsState); }
export function redo() { return ops.redoStep(opsState); }

// ── Override mutations ───────────────────────────────────────────────────────────

export function setOverride(name, value)   { ops.setOne(opsState, name, value); }
export function clearOverride(name)         { ops.clearOne(opsState, name); }
export function clearAll()                  { ops.clearEvery(opsState); }
export function replaceOverrides(map)       { return ops.replaceAll(opsState, map); }
export function patchOverrides(patch)       { return ops.patchMany(opsState, patch); }
export function dragSetOverride(name, val)  { ops.dragSet(opsState, name, val); }
export function endDrag()                   { return ops.endDrag(opsState); }

// ── Theme presets ───────────────────────────────────────────────────────────

export function applyTheme(preset) {
  const { map, applied, skipped } = sanitisePreset(preset?.overrides ?? {});
  ops.applyThemeToState(opsState, map);
  return { applied, skipped };
}

export function saveCurrentTheme(name) {
  const id = slugify(name);
  const display = String(name || '').trim() || 'Untitled';
  const count = Object.keys(overrides).length;
  const theme = {
    id, name: display, icon: '⥅',
    blurb: `${count} customised token${count === 1 ? '' : 's'}`,
    overrides: { ...overrides },
  };
  const next = savedThemes.filter((t) => t.id !== id);
  next.push(theme);
  savedThemes.length = 0;
  for (const t of next) savedThemes.push(t);
  return { id, persisted: persistSavedThemes(savedThemes) };
}

export function deleteSavedTheme(id) {
  const idx = savedThemes.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  savedThemes.splice(idx, 1);
  return persistSavedThemes(savedThemes);
}

// ── UI helpers ─────────────────────────────────────────────────────────────────

export function openOutputDrawer() {
  ui.outputOpen = true;
  if (typeof document === 'undefined') return;
  requestAnimationFrame(() => {
    document.querySelector('.out')?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  });
}

export function overrideCount() {
  return Object.keys(overrides).length;
}

export const tokenCount = allTokens.length;
