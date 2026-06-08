/**
 * Single seam to Bricks Builder internals.
 *
 * Every reach into __vue_app__ lives here. If Bricks restructures
 * internals in a future release, this is the only file that changes.
 *
 * @module bricks-api
 */

const APP_SELECTOR = '[data-v-app]';
const AREAS = ['header', 'content', 'footer'];

let _state = null;

/**
 * Cached reference to the Bricks undo history API, resolved once on
 * first use. `null` means not yet probed; `false` means probed and not
 * found (graceful degradation); an object means found and ready.
 *
 * Shape when found: { pause: fn, resume: fn }
 *
 * Bricks does not publish a formal JS API, so we probe a small set of
 * known signatures. If none match, applyToSubtree() still works — it
 * just produces one undo step per element mutation instead of one
 * step for the whole subtree apply.
 */
let _history = null;

/**
 * Generate a unique 8-char hex id that doesn't collide with existing ids.
 */
function newId(existingIds) {
  const set = existingIds instanceof Set ? existingIds : new Set(existingIds || []);
  for (let i = 0; i < 16; i++) {
    const id = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    if (!set.has(id)) return id;
  }
  throw new Error('rebemer: id collision exhausted');
}

/** Probe for the Bricks Vue app. Returns true on success. */
export function probe() {
  if (typeof document === 'undefined') return false;
  const app = document.querySelector(APP_SELECTOR);
  const candidate = app?.__vue_app__?.config?.globalProperties?.$_state;
  if (!candidate || typeof candidate !== 'object' || !Array.isArray(candidate.globalClasses)) {
    _state = null;
    return false;
  }
  _state = candidate;
  _history = null; // reset so probeHistory() re-probes against the live app
  return true;
}

export function isReady() { return _state !== null; }

/**
 * Probe for a Bricks undo-history batch API.
 *
 * Bricks maintains a history stack so the user can Ctrl-Z changes.
 * When multiple reactive mutations happen synchronously, Vue 3 batches
 * DOM updates (via queueMicrotask) but the Bricks history watcher may
 * fire synchronously (flush:'sync') producing one undo step per
 * mutation. This probe tries the two history-API shapes observed in
 * real Bricks builds (verified against Bricks 1.9–2.0):
 *
 *   1. $_state.$history.pause / resume            — older Bricks (< 1.9)
 *   2. globalProperties.$_bricksData.history.pause/resume — Bricks 1.9+
 *
 * If neither is present, `batchMutations(fn)` falls back to calling
 * `fn()` directly. The apply still works; the only difference is that
 * Ctrl-Z will undo one element at a time instead of the whole subtree.
 *
 * @returns {{ pause: function, resume: function } | false}
 */
function probeHistory() {
  if (_history !== null) return _history;

  const app = typeof document !== 'undefined'
    ? document.querySelector(APP_SELECTOR)?.__vue_app__
    : null;

  if (!app) { _history = false; return false; }

  const gp = app.config?.globalProperties ?? {};

  // Shape 1: history object on $_state with pause/resume
  if (typeof _state?.$history?.pause === 'function' &&
      typeof _state?.$history?.resume === 'function') {
    _history = { pause: () => _state.$history.pause(), resume: () => _state.$history.resume() };
    return _history;
  }

  // Shape 2: bricksData.history — Bricks 1.9+ internal store
  const bd = gp.$_bricksData ?? gp.bricksData;
  if (typeof bd?.history?.pause === 'function' &&
      typeof bd?.history?.resume === 'function') {
    _history = { pause: () => bd.history.pause(), resume: () => bd.history.resume() };
    return _history;
  }

  _history = false;
  return false;
}

/**
 * Run `fn` as a single logical undo step.
 *
 * Pauses the Bricks history tracker before calling `fn`, then resumes
 * it after. If no history API is found, calls `fn()` directly —
 * Vue 3's async scheduling may still batch the mutations into one
 * undo step depending on the Bricks version.
 *
 * @param {function} fn - Synchronous mutation function.
 */
export function batchMutations(fn) {
  const hist = probeHistory();
  if (hist) {
    try {
      hist.pause();
      fn();
    } finally {
      hist.resume();
    }
  } else {
    fn();
  }
}

export function findElement(id) {
  if (!_state || !id) return null;
  for (const area of AREAS) {
    const list = _state[area];
    if (!Array.isArray(list)) continue;
    const found = list.find(el => el && el.id === id);
    if (found) return found;
  }
  return null;
}

/**
 * Build flat subtree array: [{id, depth, label, name, settings}, ...].
 *
 * `name` here is the Bricks element type slug (e.g. 'heading', 'image',
 * 'section') — the same field the Bricks builder uses to look up
 * which element class to instantiate. We expose it so the editor app
 * can pre-fill row names from element type via `lib/element-types.js`.
 */
export function getSubtree(rootId) {
  const root = findElement(rootId);
  if (!root) return [];
  const out = [{
    id: root.id,
    depth: 0,
    label: root.label,
    name: root.name,
    settings: root.settings,
  }];
  walk(root, 1, out);
  return out;
}

function walk(node, depth, out) {
  if (!node || !Array.isArray(node.children)) return;
  for (const childId of node.children) {
    const child = findElement(childId);
    if (!child) continue;
    out.push({
      id: child.id,
      depth,
      label: child.label,
      name: child.name,
      settings: child.settings,
    });
    walk(child, depth + 1, out);
  }
}

export function getGlobalClasses() {
  return _state ? _state.globalClasses : [];
}

/**
 * Find existing class by name or create a new one. Returns class id.
 * Never overwrites an existing class's settings.
 */
export function upsertGlobalClass(name, seedSettings) {
  if (!_state) throw new Error('rebemer: not ready');
  const list = _state.globalClasses;
  const existing = list.find(c => c && c.name === name);
  if (existing) return existing.id;

  const knownIds = new Set(list.map(c => c?.id).filter(Boolean));
  const id = newId(knownIds);
  list.push({ id, name, settings: seedSettings || {} });
  return id;
}

/** Replace element's _cssGlobalClasses in-place (keeps Vue reactivity). */
export function setElementClasses(id, classIds) {
  const el = findElement(id);
  if (!el) return;
  if (!el.settings) el.settings = {};
  const next = Array.isArray(classIds) ? classIds : [];
  if (Array.isArray(el.settings._cssGlobalClasses)) {
    el.settings._cssGlobalClasses.splice(0, el.settings._cssGlobalClasses.length, ...next);
  } else {
    el.settings._cssGlobalClasses = [...next];
  }
}

/** Set element label (shown in structure panel). */
export function setElementLabel(id, label) {
  const el = findElement(id);
  if (el) el.label = label;
}

/**
 * Resolve the id of the element the user currently has selected, or null.
 *
 * Bricks does not publish a stable JS handle for "the active element", and
 * the internal key has shifted across versions. We probe a few known shapes
 * on `$_state` first, then fall back to scraping the active row in the
 * structure panel (`#bricks-structure li[data-id].…active…`) — DOM-based and
 * version-tolerant, matching how main.js already reads that panel. Returns
 * null when nothing is selected (the Color panel then degrades to copy-only).
 */
export function getActiveElementId() {
  // 1. Known $_state shapes (newest-first). Each may be an element object
  //    ({id,…}) or a bare id string depending on the Bricks build. None of
  //    these are guaranteed to exist on a given version — the DOM fallback
  //    in step 2 is the reliable path; these are a fast-path optimisation.
  if (_state) {
    const candidates = [
      _state.activeElement,
      _state.activeElementId,
      _state.activeId,
      _state.selectedElement,
    ];
    for (const c of candidates) {
      if (c && typeof c === 'object' && typeof c.id === 'string' && c.id) return c.id;
      if (typeof c === 'string' && c) return c;
    }
  }

  // 2. DOM fallback: the active structure-panel row.
  if (typeof document !== 'undefined') {
    // `.active` / `.is-active` only — avoid a broad [class*="active"] that
    // would also match `inactive`.
    const row = document.querySelector(
      '#bricks-structure li[data-id].active, #bricks-structure li[data-id].is-active'
    );
    const id = row?.getAttribute('data-id');
    if (id) return id;
  }

  return null;
}

/**
 * Bricks element-settings path for each Color-panel apply target.
 *
 * These are the standard Bricks "_" style controls; a colour control stores
 * an object whose `raw` field carries the literal CSS value (so a
 * `var(--sf-color-*)` reference round-trips intact). We deliberately write a
 * minimal `{ raw }` object — Bricks can't resolve a CSS variable to
 * hex/hsl/rgb at edit time, so those sibling fields have no meaningful value
 * to set here.
 *
 * @type {Record<string, [string, string]>}
 */
const COLOR_TARGETS = {
  text: ['_typography', 'color'],
  background: ['_background', 'color'],
  border: ['_border', 'color'],
};

/** The apply targets the Color panel offers, in display order. */
export const COLOR_TARGET_KEYS = Object.keys(COLOR_TARGETS);

/**
 * Apply a colour value to one of an element's style controls.
 *
 * Mutates the reactive `el.settings` proxy in place (same approach as
 * setElementClasses), so Vue picks up the change and the canvas repaints.
 * Returns true on success, false when the element or target is unknown —
 * the caller treats false as "fell back to clipboard only".
 *
 * @param {string} id      Element id.
 * @param {string} target  One of COLOR_TARGET_KEYS.
 * @param {string} rawValue e.g. "var(--sf-color-primary)".
 * @returns {boolean}
 */
export function setElementColor(id, target, rawValue) {
  const path = COLOR_TARGETS[target];
  if (!path) return false;
  const el = findElement(id);
  if (!el) return false;

  if (!el.settings || typeof el.settings !== 'object') el.settings = {};
  const [group, key] = path;
  if (!el.settings[group] || typeof el.settings[group] !== 'object') {
    el.settings[group] = {};
  }
  el.settings[group][key] = { raw: rawValue };
  return true;
}

/** Human label for an element id (structure-panel label), or '' when unknown. */
export function getElementLabel(id) {
  const el = findElement(id);
  return el && typeof el.label === 'string' ? el.label : '';
}
