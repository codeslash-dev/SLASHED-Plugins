/**
 * reBEMer entry point — runs inside the Bricks builder main panel.
 *
 * Responsibilities:
 *   1. Probe the Bricks Vue app (with retries; Bricks mounts after our
 *      script in some load orders). Bail out silently on incompatible
 *      builds — the badge is never injected and no UI is shown.
 *   2. Watch the structure panel via a narrowly-scoped MutationObserver
 *      and inject one <BemBadge> per `li[data-id]`.
 *   3. Mount a single <BemPanel> on badge activation. Subsequent
 *      activations replace the existing panel.
 *   4. Tear everything down via a single AbortController on unload.
 *
 * Imperative on purpose: there is no Svelte App component above this
 * level because Bricks owns the structure-panel DOM and we have to
 * mount badges into elements Bricks controls. A single Svelte tree
 * couldn't follow Bricks' re-renders without fighting it.
 */
import { mount, unmount } from 'svelte';
import * as api from './lib/bricks-api.js';
import * as classHints from './lib/class-hints.js';
import * as colorSwatches from './lib/color-swatches.js';
import BemBadge from './components/BemBadge.svelte';
import BemPanel from './components/BemPanel.svelte';
import ColorApp from './components/ColorApp.svelte';
import ColorPanel from './components/ColorPanel.svelte';
import './styles/panel.css';

const STRUCTURE_PANEL_SELECTOR = '#bricks-structure';
const ITEM_SELECTOR = 'li[data-id]';
const HOST_ID = 'slashed-rebemer-host';
const PROBE_INTERVAL_MS = 400;
const PROBE_MAX_ATTEMPTS = 25; // ≈10s total grace before we give up

const log = (level, ...args) => console[level]('[reBEMer]', ...args);

const controller = new AbortController();
const { signal } = controller;

/** @type {Map<string, { instance: any, host: HTMLElement }>} */
const badgeInstances = new Map();

/** @type {{ instance: any, node: HTMLElement } | null} */
let activePanel = null;

/** @type {{ instance: any, node: HTMLElement } | null} */
let colorApp = null;

/** @type {{ instance: any, node: HTMLElement } | null} */
let colorPickerPanel = null;


function ensureHost() {
  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    document.body.appendChild(host);
  }
  return host;
}

/** Config injected by class-rebemer-enqueue.php via wp_localize_script. */
let cfg = null;

function start() {
  // Class documentation tooltips are independent of the reBEMer badge
  // pipeline below: they hook the Bricks settings panel / class manager,
  // not the structure panel, so they run even if the Vue probe fails.
  cfg = window.slashedBricksEditor;
  if (cfg && typeof cfg === 'object') {
    classHints.init(cfg.showClassHints, cfg.classHints, { signal });
    colorSwatches.init(cfg.showColorSwatches, cfg.colorHexMap, {
      signal,
      onOpenPanel: cfg.showColorPanel
        ? (target) => openColorPickerPanel(target)
        : undefined,
    });
  }

  let attempts = 0;
  const tryProbe = () => {
    if (signal.aborted) return;
    if (api.probe()) {
      onProbed();
      return;
    }
    if (++attempts >= PROBE_MAX_ATTEMPTS) {
      log('warn', 'Bricks Vue app not detected after grace window — reBEMer disabled on this page.');
      return;
    }
    setTimeout(tryProbe, PROBE_INTERVAL_MS);
  };
  tryProbe();
}

function onProbed() {
  // Color System panel: mount once the Bricks app is confirmed (apply needs
  // the live state). Independent of the structure-panel badge pipeline — the
  // launcher is reachable from anywhere in the builder.
  mountColorApp();

  // The structure panel may not be in the DOM yet on first paint;
  // observe body once for its arrival, then narrow to the panel.
  const existing = document.querySelector(STRUCTURE_PANEL_SELECTOR);
  if (existing) {
    onStructurePanelReady(existing);
    return;
  }

  const bodyObs = new MutationObserver(() => {
    const panelEl = document.querySelector(STRUCTURE_PANEL_SELECTOR);
    if (panelEl) {
      bodyObs.disconnect();
      onStructurePanelReady(panelEl);
    }
  });
  bodyObs.observe(document.body, { childList: true, subtree: true });
  signal.addEventListener('abort', () => bodyObs.disconnect(), { once: true });
}


function onStructurePanelReady(panelEl) {
  // Debounce churny mutation bursts (Bricks rebuilds the tree on
  // drag/drop, on import, on undo). 50 ms is enough to coalesce a
  // typical burst without feeling laggy.
  let debounceHandle = null;
  const schedule = () => {
    if (debounceHandle !== null) return;
    debounceHandle = setTimeout(() => {
      debounceHandle = null;
      refreshBadges(panelEl);
    }, 50);
  };

  const obs = new MutationObserver(schedule);
  obs.observe(panelEl, { childList: true, subtree: true });
  signal.addEventListener('abort', () => {
    obs.disconnect();
    if (debounceHandle !== null) clearTimeout(debounceHandle);
  }, { once: true });

  refreshBadges(panelEl);
}

function refreshBadges(panelEl) {
  // Pass 1: reap stale entries whose host node has been detached.
  // Bricks rerenders inner subtrees (e.g. `.structure-item` rebuilds
  // on label edits, drag/drop, undo) without removing the outer <li>,
  // so a host that was alive can become detached while the <li>
  // stays. Catching that here is what keeps us from leaking unmounted
  // Svelte instances or, worse, never re-injecting the badge on a
  // resurrected row (semantic-review issue #5).
  for (const [id, entry] of badgeInstances) {
    if (!entry.host.isConnected) {
      try { unmount(entry.instance); } catch (err) { log('warn', 'badge unmount failed', err); }
      badgeInstances.delete(id);
    }
  }

  // Pass 2: mount badges for any <li> without a live host inside it.
  // We use the map state as the source of truth (previously this used
  // a dataset flag on the <li>, which lived on the outer node and
  // never got cleared when only the inner subtree was rebuilt — so
  // re-injection was permanently blocked after the first detach).
  const items = panelEl.querySelectorAll(ITEM_SELECTOR);
  for (const li of items) {
    const id = li.getAttribute('data-id');
    if (!id) continue;
    const existing = badgeInstances.get(id);
    if (existing && existing.host.isConnected && li.contains(existing.host)) continue;
    injectBadgeInto(li);
  }
}


function injectBadgeInto(li) {
  const elementId = li.getAttribute('data-id');
  if (!elementId) return;

  // Bricks structure-panel row layout:
  //
  //   <li data-id="…">
  //     <div class="structure-item">
  //       <div class="title">…element label…</div>
  //       <ul class="actions">…icon buttons…</ul>     ← inject BEFORE this
  //     </div>
  //   </li>
  //
  // We want the badge to read as a small inline word between the
  // title and the action icons — NOT a chip overlaid on the row,
  // and NOT a leading icon inside the actions cluster (where it
  // would compete for space with Bricks' own buttons).
  //
  // Selector chain is defensive: if Bricks restructures we want a
  // sane fallback rather than a missing badge.
  //   1. Prefer the `.structure-item` wrapper that holds title + actions.
  //   2. Inside it, insert immediately before the actions list. If no
  //      actions list exists (rare — happens for read-only items)
  //      append at the end so the badge still appears after the title.
  //   3. If `.structure-item` itself isn't present, fall back to the
  //      <li> with the same insertion rule, so legacy/forked Bricks
  //      builds still get a badge.
  const item = li.querySelector(':scope > .structure-item') || li;
  const actions =
    item.querySelector(':scope > ul.actions') ||
    item.querySelector(':scope > .actions') ||
    item.querySelector(':scope > .structure-item-actions');

  const host = document.createElement('span');
  host.className = 'rebemer-badge-host';
  if (actions) {
    item.insertBefore(host, actions);
  } else {
    item.appendChild(host);
  }

  const labelNode = item.querySelector(':scope > .title, :scope > .structure-item-title, :scope > .name, :scope .label');
  const label = labelNode ? labelNode.textContent.trim() : '';

  const instance = mount(BemBadge, {
    target: host,
    props: { elementId, label, onActivate: openPanel },
  });

  // Clean up any prior instance for this element id (can happen on
  // rapid tree rebuilds where the same data-id reappears on a new node).
  const existing = badgeInstances.get(elementId);
  if (existing) {
    try { unmount(existing.instance); } catch (err) { log('warn', 'badge remount cleanup failed', err); }
    if (existing.host.isConnected) existing.host.remove();
  }

  badgeInstances.set(elementId, { instance, host });
}

function mountColorApp() {
  if (colorApp) return; // already mounted
  const src = cfg && cfg.colorPanel;
  if (!cfg?.showColorPanel || !src || !Array.isArray(src.variables) || src.variables.length === 0) {
    return; // disabled, or no token data to show
  }
  const node = document.createElement('div');
  ensureHost().appendChild(node);
  colorApp = {
    instance: mount(ColorApp, { target: node, props: { source: src } }),
    node,
  };
}

function unmountColorApp() {
  if (!colorApp) return;
  try { unmount(colorApp.instance); } catch (err) { log('warn', 'color app unmount failed', err); }
  colorApp.node.remove();
  colorApp = null;
}

/**
 * Write a colour value into a Bricks colour input by setting its native
 * value and dispatching an 'input' event. Bricks/Vue's v-model picks up
 * the event and updates the reactive state for whichever field owns the
 * input — gradient stops, box-shadow colours, text/background/border and
 * any other [data-control="color"] field all use the same <input> structure.
 *
 * Uses the native HTMLInputElement value setter to bypass any Vue getter
 * wrapper on the property, then fires a bubbling 'input' event so Vue's
 * event listener updates its reactive state.
 *
 * @param {HTMLInputElement|null} inputEl
 * @param {string} value  e.g. "var(--sf-color-primary)"
 * @returns {boolean}
 */
function applyToColorInput(inputEl, value) {
  if (!inputEl || !inputEl.isConnected) return false;
  try {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set;
    if (nativeSetter) nativeSetter.call(inputEl, value);
    else inputEl.value = value;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Find the right-edge x-coordinate of the Bricks settings panel so the
 * picker ColorPanel can dock flush against it. Tries closest() first on the
 * triggering element (most reliable), then falls back to document queries.
 * Returns null when no panel is detected; the ColorPanel CSS falls back to
 * --cp-dock-left: 320px in that case.
 *
 * @param {Element|null} anchorEl  Element inside the Bricks settings panel.
 * @returns {number|null}
 */
function getBricksPanelRight(anchorEl) {
  const selectors = [
    '#bricks-panel-inner',
    '#bricks-panel',
    '[id^="bricks-panel"]',
  ];
  if (anchorEl) {
    for (const sel of selectors) {
      const el = anchorEl.closest(sel);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 100) return Math.ceil(r.right);
      }
    }
  }
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 100) return Math.ceil(r.right);
    }
  }
  return null;
}

/**
 * Open a contextual ColorPanel bound to a specific Bricks colour input.
 * The panel docks to the right edge of the Bricks settings panel so it
 * feels attached rather than floating. The chosen var() is written directly
 * into the live input via a native input event so Vue updates the correct
 * reactive field regardless of its type.
 *
 * @param {Element} colorInputEl  [data-control="text"].color-input wrapper element
 */
function openColorPickerPanel(colorInputEl) {
  closeColorPickerPanel();
  const src = cfg?.colorPanel;
  if (!src || !Array.isArray(src.variables) || src.variables.length === 0) return;

  const dockedLeft = getBricksPanelRight(colorInputEl);

  const node = document.createElement('div');
  ensureHost().appendChild(node);
  colorPickerPanel = {
    instance: mount(ColorPanel, {
      target: node,
      props: {
        source: src,
        dockedLeft,
        onPickValue: (value) => {
          // Re-query at pick time so we always write to the live input even if
          // Bricks re-rendered the control after the button was clicked.
          // Some Bricks controls (border, box-shadow) omit the explicit
          // type="text" attribute on their inputs, so fall back to any
          // non-structural input after the explicit match.
          const inputEl =
            colorInputEl?.querySelector('input[type="text"]') ??
            colorInputEl?.querySelector('input:not([type="hidden"],[type="submit"],[type="button"],[type="checkbox"],[type="radio"],[type="file"])');
          const ok = applyToColorInput(inputEl, value);
          if (ok) {
            const varName = value.match(/^var\((--[^)]+)\)/)?.[1];
            const hex = varName ? (cfg?.colorHexMap?.[varName] ?? null) : null;

            // Show the picked colour on the SF icon dot.
            const btn = colorInputEl?.querySelector('.slashed-sf-color-btn');
            if (btn) {
              const dot = btn.querySelector('.slashed-sf-color-btn__dot');
              if (dot) {
                if (hex) { dot.style.background = hex; dot.style.removeProperty('box-shadow'); }
                else     { dot.style.removeProperty('background'); }
              }
              btn.classList.toggle('slashed-sf-color-btn--active', !!hex);
            }

            // Patch Bricks' colour preview swatch after Vue's nextTick settles.
            // The swatch is the 2nd <span> child of .bricks-control-preview;
            // when no resolvable colour is set Bricks hides it (display:none)
            // and marks the parent with class "empty". Override both using the
            // server-resolved hex from the colour map.
            if (hex) {
              const colorControl = colorInputEl?.closest('[data-control="color"]');
              requestAnimationFrame(() => {
                if (!colorControl) return;
                const preview = colorControl.querySelector('.bricks-control-preview');
                if (!preview) return;
                // Target the swatch span by excluding Bricks' two named spans
                // (.color-value-tooltip and .bricks-svg-wrapper). Falls back to
                // position [1] for unknown future Bricks DOM variants.
                const swatchSpan =
                  preview.querySelector(':scope > span:not(.color-value-tooltip):not(.bricks-svg-wrapper)') ??
                  preview.querySelectorAll(':scope > span')[1];
                if (swatchSpan) {
                  swatchSpan.style.display = 'block';
                  swatchSpan.style.background = hex;
                  // bricks-control-transparency-pattern uses color:currentColor
                  // for its background — set color too so both paths are covered.
                  swatchSpan.style.setProperty('color', hex, 'important');
                }
                preview.classList.remove('empty');
              });
            }
          }
          return ok;
        },
        onPick: closeColorPickerPanel,
        onClose: closeColorPickerPanel,
      },
    }),
    node,
  };
}

function closeColorPickerPanel() {
  if (!colorPickerPanel) return;
  try { unmount(colorPickerPanel.instance); } catch (err) { log('warn', 'color picker panel unmount failed', err); }
  colorPickerPanel.node.remove();
  colorPickerPanel = null;
}

function openPanel(elementId) {
  closePanel();
  const node = document.createElement('div');
  ensureHost().appendChild(node);
  activePanel = {
    instance: mount(BemPanel, {
      target: node,
      props: { rootId: elementId, onClose: closePanel },
    }),
    node,
  };
}

function closePanel() {
  if (!activePanel) return;
  try { unmount(activePanel.instance); } catch (err) { log('warn', 'panel unmount failed', err); }
  activePanel.node.remove();
  activePanel = null;
}


window.addEventListener('beforeunload', () => {
  controller.abort();
  closePanel();
  unmountColorApp();
  closeColorPickerPanel();
  classHints.destroy();
  colorSwatches.destroy();
  for (const { instance } of badgeInstances.values()) {
    try { unmount(instance); } catch { /* ignore */ }
  }
  badgeInstances.clear();
}, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
