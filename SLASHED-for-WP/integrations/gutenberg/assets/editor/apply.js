/**
 * Block-editor apply layer — the only module that talks to wp.data.
 *
 * Keeps every @wordpress/data interaction in one place so the UI in panel.js
 * stays presentation-only. All writes go through updateBlockAttributes on the
 * currently selected block; when no block is selected the caller falls back to
 * copying the value to the clipboard.
 *
 * Values written are always live framework references (var(--sf-*)) — never a
 * baked hex — so the result tracks the active theme and dark mode exactly like
 * the rest of the framework.
 *
 * @module apply
 */

/** @returns {object|null} The wp.data stores, or null if unavailable. */
function stores() {
  const wp = window.wp;
  if (!wp || !wp.data) return null;
  const select = wp.data.select('core/block-editor');
  const dispatch = wp.data.dispatch('core/block-editor');
  if (!select || !dispatch) return null;
  return { select, dispatch };
}

/**
 * The client id of the currently selected block, or null. When a multi-select
 * is active the first selected block is used.
 *
 * @returns {string|null}
 */
export function selectedClientId() {
  const s = stores();
  if (!s) return null;
  const id = s.select.getSelectedBlockClientId();
  if (id) return id;
  const multi = s.select.getMultiSelectedBlockClientIds?.() || [];
  return multi.length ? multi[0] : null;
}

/** @returns {string[]} All selected client ids (single or multi). */
export function selectedClientIds() {
  const s = stores();
  if (!s) return [];
  const multi = s.select.getMultiSelectedBlockClientIds?.() || [];
  if (multi.length) return multi;
  const id = s.select.getSelectedBlockClientId();
  return id ? [id] : [];
}

/**
 * A short human label for the selected block (for the panel's context line).
 *
 * @returns {string}
 */
export function selectedBlockLabel() {
  const s = stores();
  if (!s) return '';
  const ids = selectedClientIds();
  if (!ids.length) return '';
  if (ids.length > 1) return `${ids.length} blocks`;
  const block = s.select.getBlock(ids[0]);
  if (!block) return '';
  const wp = window.wp;
  const type = wp?.blocks?.getBlockType?.(block.name);
  return type?.title || block.name || '';
}

/**
 * Deep-merge a style fragment into each selected block's `style` attribute.
 *
 * Existing style keys are preserved; only the provided leaf is overwritten.
 *
 * @param {object} fragment e.g. { color: { background: 'var(--sf-color-primary)' } }
 * @returns {boolean} true if at least one block was updated.
 */
function mergeStyle(fragment) {
  const s = stores();
  if (!s) return false;
  const ids = selectedClientIds();
  if (!ids.length) return false;

  for (const id of ids) {
    const block = s.select.getBlock(id);
    const current = (block && block.attributes && block.attributes.style) || {};
    const next = deepMerge(current, fragment);
    s.dispatch.updateBlockAttributes(id, { style: next });
  }
  return true;
}

/** Recursive plain-object merge (arrays/scalars overwrite). */
function deepMerge(base, patch) {
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') {
      out[k] = deepMerge(out[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Apply a color value to a named target on the selected block(s).
 *
 * @param {'background'|'text'|'border'} target
 * @param {string} value e.g. "var(--sf-color-primary)"
 * @returns {boolean}
 */
export function applyColor(target, value) {
  if (target === 'border') {
    return mergeStyle({ border: { color: value } });
  }
  // 'background' | 'text' → style.color.{background|text}
  return mergeStyle({ color: { [target]: value } });
}

/**
 * Apply a gradient to the selected block(s) (style.color.gradient).
 *
 * @param {string} value e.g. "var(--sf-gradient-brand)"
 * @returns {boolean}
 */
export function applyGradient(value) {
  return mergeStyle({ color: { gradient: value } });
}

/**
 * Apply a font size to the selected block(s) (style.typography.fontSize).
 *
 * @param {string} value e.g. "var(--sf-text-l)"
 * @returns {boolean}
 */
export function applyFontSize(value) {
  return mergeStyle({ typography: { fontSize: value } });
}

/**
 * Whether the selected block currently carries a class.
 *
 * @param {string} className
 * @returns {boolean}
 */
export function hasClass(className) {
  const s = stores();
  if (!s) return false;
  const ids = selectedClientIds();
  if (!ids.length) return false;
  return ids.every((id) => {
    const block = s.select.getBlock(id);
    const cn = (block && block.attributes && block.attributes.className) || '';
    return splitClasses(cn).includes(className);
  });
}

/**
 * Toggle a class on the selected block(s)' className attribute.
 *
 * @param {string} className
 * @returns {boolean|null} new active state, or null if nothing selected.
 */
export function toggleClass(className) {
  const s = stores();
  if (!s) return null;
  const ids = selectedClientIds();
  if (!ids.length) return null;

  // Decide the target state from the first block, then apply uniformly so a
  // mixed selection converges to a single consistent state.
  const first = s.select.getBlock(ids[0]);
  const firstHas = splitClasses((first?.attributes?.className) || '').includes(className);
  const addClass = !firstHas;

  for (const id of ids) {
    const block = s.select.getBlock(id);
    const list = splitClasses((block?.attributes?.className) || '');
    const idx = list.indexOf(className);
    if (addClass && idx === -1) list.push(className);
    if (!addClass && idx !== -1) list.splice(idx, 1);
    s.dispatch.updateBlockAttributes(id, { className: list.join(' ') });
  }
  return addClass;
}

/** Split a className string into a clean token array. */
function splitClasses(cn) {
  return String(cn).split(/\s+/).map((c) => c.trim()).filter(Boolean);
}

/**
 * Copy text to the clipboard, with a synchronous fallback for older browsers.
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
