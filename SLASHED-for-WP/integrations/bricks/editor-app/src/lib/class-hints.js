/**
 * Class documentation hints for the Bricks builder.
 *
 * When the "Show class hints" plugin setting is enabled, each SLASHED
 * class row inside the Bricks UI (an applied class chip in the element's
 * CSS-class list, a class-autocomplete suggestion, or a row in the global
 * class manager) gets a small "?" info icon injected beside the row's own
 * action icons (remove, lock/unlock, copy:styles…). Hovering or focusing
 * **that icon only** reveals a styled tooltip describing what the class
 * does, plus its category.
 *
 * Design notes — why this looks the way it does:
 *
 *   - **Icon-triggered, not row-hover.** An earlier version showed the
 *     tooltip on hovering anywhere over a class row via a body-wide
 *     `mouseover` listener. That fought Bricks' own DOM and the tooltip
 *     constantly obscured the row's action icons. Instead we inject our
 *     own `?` button (reconciled, idempotent) and bind the tooltip to it,
 *     so the hint only appears on deliberate intent and never covers the
 *     controls.
 *
 *   - **Reconcile, don't stamp-once.** Bricks (Vue) reuses row nodes when
 *     a list is filtered, so a row that was `sf-stack` can become
 *     `sf-grid` — or a non-SLASHED class — while keeping the same DOM
 *     node. Every pass recomputes each row's class and adds / updates /
 *     removes its `?` button accordingly. The button carries no text node
 *     (its glyph is a CSS `::before`) so it never contaminates the row's
 *     `textContent` we read back to re-resolve the class.
 *
 *   - **Exact match on a known key only.** `resolveClassName()` rejects
 *     anything that isn't a single `sf-*` / `is-*` token present in the
 *     hint map, so multi-word rows (category headers, suggestions that
 *     also render a category label) are never tagged.
 *
 *   - **Styled tooltip, not the native `title` attribute.** `title` is
 *     slow to appear, unstyled, and mutating Bricks' nodes is invasive.
 *     We render our own element into the reBEMer host so it inherits the
 *     panel theme and never touches Bricks' DOM.
 *
 *   - **Graceful degradation.** If Bricks restructures and none of the
 *     known containers exist, the feature simply does nothing — matching
 *     the rest of the integration's "bail out silently" philosophy.
 *
 * @module class-hints
 */

const HOST_ID = 'slashed-rebemer-host';
const TOOLTIP_ID = 'slashed-class-hint';

// Containers inside which a class row is worth a "?" hint icon. The
// element settings panel (`#bricks-panel`) holds the per-element class
// list and the class autocomplete; the global class manager renders its
// own popup. Listed defensively — extras cost nothing and missing ones
// just mean no hint in that region.
const BRICKS_CONTAINERS = [
  '#bricks-panel',
  '.bricks-class-manager',
  '#bricks-class-manager',
  '[data-control="cssClasses"]',
];

// Class applied to every injected "?" info icon. The guard for "already
// has a button" and the teardown sweep both key off this.
const BTN_CLASS = 'rebemer-class-hint-btn';

// Coalesce churny Bricks mutation bursts (filtering the class list,
// adding/removing a class) into one reconcile.
const DEBOUNCE_MS = 50;

/**
 * Resolve a raw text string to a hint, or null.
 *
 * Pure and DOM-free so it can be unit tested with `node --test`.
 * Accepts the visible label of a class (with or without a leading dot),
 * and returns the matching hint enriched with the resolved `name`, or
 * `null` when the text is not a single known `sf-*` / `is-*` class.
 *
 * @param {string} raw - Candidate text (e.g. ".sf-stack" or "sf-stack").
 * @param {Record<string, {description: string, category: string}>} hints
 * @returns {{ name: string, description: string, category: string } | null}
 */
export function resolveClassName(raw, hints) {
  if (!raw || !hints) return null;

  let token = String(raw).trim();
  if (!token) return null;

  // A single class label has no internal whitespace. Rejecting
  // multi-token strings is what keeps us from matching whole rows.
  if (/\s/.test(token)) return null;

  // Strip a single leading dot (class lists sometimes render ".sf-x").
  if (token[0] === '.') token = token.slice(1);

  if (!token.startsWith('sf-') && !token.startsWith('is-')) return null;

  if (!Object.prototype.hasOwnProperty.call(hints, token)) return null;

  const hint = hints[token];
  if (!hint || typeof hint.description !== 'string') return null;

  return { name: token, description: hint.description, category: hint.category };
}

// ----- DOM glue (only runs in the browser) ---------------------------

let _hints = {};
let _tooltip = null;
let _controller = null;
let _observer = null;
let _debounce = null;
/** The `?` button the tooltip is currently anchored to, if any. */
let _activeBtn = null;

function ensureTooltip() {
  if (_tooltip && _tooltip.isConnected) return _tooltip;

  let host = document.getElementById(HOST_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    document.body.appendChild(host);
  }

  const el = document.createElement('div');
  el.id = TOOLTIP_ID;
  el.className = 'rebemer-class-hint';
  el.setAttribute('role', 'tooltip');
  el.hidden = true;
  el.innerHTML =
    '<code class="rebemer-class-hint__name"></code>' +
    '<span class="rebemer-class-hint__cat"></span>' +
    '<p class="rebemer-class-hint__desc"></p>';
  host.appendChild(el);

  _tooltip = el;
  return el;
}

function position(el, target) {
  const r = target.getBoundingClientRect();
  // Measure after making it visible-but-transparent so width/height read.
  const tw = el.offsetWidth;
  const th = el.offsetHeight;
  const gap = 8;
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;

  // Prefer below the target; flip above if it would overflow the viewport.
  let top = r.bottom + gap;
  if (top + th > vh && r.top - gap - th >= 0) top = r.top - gap - th;

  // Centre on the small icon, clamped into the viewport.
  let left = r.left + r.width / 2 - tw / 2;
  if (left + tw > vw - 4) left = Math.max(4, vw - 4 - tw);
  if (left < 4) left = 4;

  el.style.top = `${Math.round(top)}px`;
  el.style.left = `${Math.round(left)}px`;
}

/**
 * Show the tooltip anchored to a `?` button, reading the class name it
 * was tagged with and looking the hint up fresh (so a reused button that
 * changed class still shows the right copy).
 *
 * @param {HTMLElement} btn
 */
function showForButton(btn) {
  const name = btn.dataset.sfClass;
  const hint = name ? resolveClassName(name, _hints) : null;
  if (!hint) return;

  const el = ensureTooltip();
  el.querySelector('.rebemer-class-hint__name').textContent = `.${hint.name}`;
  const cat = el.querySelector('.rebemer-class-hint__cat');
  cat.textContent = hint.category || '';
  cat.hidden = !hint.category;
  el.querySelector('.rebemer-class-hint__desc').textContent = hint.description;

  el.hidden = false;
  position(el, btn);
  _activeBtn = btn;
}

function hide() {
  if (_tooltip) _tooltip.hidden = true;
  _activeBtn = null;
}

// Button-local handlers. The tooltip is bound to the `?` icon ONLY, so it
// never appears while the pointer is merely passing over the class row.
function onBtnEnter(event) { showForButton(event.currentTarget); }
function onBtnLeave() { hide(); }
function onBtnClick(event) {
  // The `?` is informational; swallow the click so it can't trigger
  // Bricks' own row actions (select/apply/remove).
  event.preventDefault();
  event.stopPropagation();
}
function onKeyDown(event) {
  if (event.key === 'Escape') hide();
}

/**
 * Resolve the single SLASHED class a row represents, or null.
 *
 * Reads the row's own text (icon buttons carry no text node, and our `?`
 * glyph is a CSS `::before`, so neither contaminates it). Falls back to
 * probing likely label children for rows that also render a category or
 * count alongside the name.
 *
 * @param {Element} row
 * @returns {{ name: string, description: string, category: string } | null}
 */
function resolveRow(row) {
  const direct = resolveClassName(row.textContent, _hints);
  if (direct) return direct;

  const labels = row.querySelectorAll('span, [contenteditable], .name, .label, a');
  for (const el of labels) {
    const hint = resolveClassName(el.textContent, _hints);
    if (hint) return hint;
  }
  return null;
}

/**
 * Choose where the `?` icon should sit so it reads as one of the row's
 * action icons. Prefers an explicit actions cluster; otherwise the row
 * itself (the icon then trails the existing controls).
 *
 * @param {Element} row
 * @returns {Element}
 */
function actionsHost(row) {
  return (
    row.querySelector('.actions, [class*="action"], [class*="icons"], [class*="controls"]') ||
    row
  );
}

function makeButton() {
  const btn = document.createElement('span');
  btn.className = BTN_CLASS;
  btn.setAttribute('role', 'button');
  btn.setAttribute('tabindex', '0');
  btn.setAttribute('aria-label', 'What does this class do?');
  // No text node: the "?" glyph is painted via CSS ::before so the row's
  // textContent stays clean for re-resolution.
  btn.addEventListener('mouseenter', onBtnEnter);
  btn.addEventListener('mouseleave', onBtnLeave);
  btn.addEventListener('focus', onBtnEnter);
  btn.addEventListener('blur', onBtnLeave);
  btn.addEventListener('click', onBtnClick);
  return btn;
}

/**
 * One reconcile pass: refresh existing `?` icons, drop stale ones, and
 * inject icons into newly-eligible class rows. Idempotent.
 */
function reconcile() {
  // Pass 1: refresh / reap existing icons. A row whose class changed (Vue
  // reuse) gets re-tagged; a row that's no longer a known SLASHED class
  // loses its icon.
  for (const btn of document.querySelectorAll('.' + BTN_CLASS)) {
    // Pass 2 only ever injects into <li> rows, so the row is the nearest
    // <li> ancestor.
    const row = btn.closest('li');
    const hint = row ? resolveRow(row) : null;
    if (!hint) {
      if (_activeBtn === btn) hide();
      btn.remove();
    } else if (btn.dataset.sfClass !== hint.name) {
      btn.dataset.sfClass = hint.name;
    }
  }

  // Pass 2: inject into eligible rows that lack an icon. Scope strictly to
  // the known Bricks containers and to <li> rows, which is what Bricks uses
  // for applied class chips, autocomplete suggestions, and class-manager
  // rows alike.
  const containers = document.querySelectorAll(BRICKS_CONTAINERS.join(','));
  for (const container of containers) {
    for (const row of container.querySelectorAll('li')) {
      if (row.querySelector('.' + BTN_CLASS)) continue;
      // Only tag innermost rows — a wrapper <li> around a single class
      // chip resolves to the same name and would double-inject.
      if (row.querySelector('li')) continue;
      const hint = resolveRow(row);
      if (!hint) continue;
      const btn = makeButton();
      btn.dataset.sfClass = hint.name;
      actionsHost(row).appendChild(btn);
    }
  }
}

function schedule() {
  if (_debounce !== null) return;
  _debounce = setTimeout(() => {
    _debounce = null;
    reconcile();
  }, DEBOUNCE_MS);
}

/**
 * Cheap pre-filter: only reconcile when a mutation touches one of the
 * Bricks containers (or adds nodes that contain one), so canvas edits and
 * unrelated builder churn don't wake the reconciler.
 *
 * @param {MutationRecord[]} records
 * @returns {boolean}
 */
function touchesContainers(records) {
  const sel = BRICKS_CONTAINERS.join(',');
  for (const m of records) {
    const t = m.target;
    // Ignore mutations we caused ourselves (injecting / removing icons).
    if (t && t.nodeType === 1) {
      if (t.classList && t.classList.contains(BTN_CLASS)) continue;
      if (t.closest && t.closest(sel)) return true;
    }
    for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.classList && node.classList.contains(BTN_CLASS)) continue;
      if ((node.matches && node.matches(sel)) ||
          (node.closest && node.closest(sel)) ||
          (node.querySelector && node.querySelector(sel))) return true;
    }
  }
  return false;
}

/**
 * Initialise class hints.
 *
 * Safe to call when disabled (no-ops) and idempotent (a second call
 * tears down the first). Pass an `AbortSignal` to have the listeners
 * removed automatically when the host aborts, matching how the reBEMer
 * entry point manages its own lifecycle.
 *
 * @param {boolean} enabled
 * @param {Record<string, {description: string, category: string}>} hints
 * @param {{ signal?: AbortSignal }} [options]
 */
export function init(enabled, hints, options = {}) {
  destroy();

  _hints = hints && typeof hints === 'object' ? hints : {};
  if (!enabled || Object.keys(_hints).length === 0) return;

  _controller = new AbortController();
  const { signal } = _controller;

  // Esc dismisses the tooltip; scroll hides it (it's fixed-positioned, so
  // chasing a moving anchor isn't worth it).
  document.addEventListener('keydown', onKeyDown, { passive: true, signal });
  window.addEventListener('scroll', hide, { capture: true, passive: true, signal });

  // The class lists live in panels without a single stable container across
  // their lifecycle, so observe body and filter with touchesContainers().
  _observer = new MutationObserver((records) => {
    // If the row anchoring the tooltip was removed (e.g. the class was
    // deleted while the hint was open), the tooltip would otherwise linger
    // pointing at nothing — drop it before reconciling.
    if (_activeBtn && !_activeBtn.isConnected) hide();
    if (touchesContainers(records)) schedule();
  });
  _observer.observe(document.body, { childList: true, subtree: true });

  reconcile();

  if (options.signal) {
    if (options.signal.aborted) destroy();
    else options.signal.addEventListener('abort', destroy, { once: true });
  }
}

/**
 * Tear down listeners, the observer, the tooltip, and every injected icon.
 */
export function destroy() {
  if (_debounce !== null) {
    clearTimeout(_debounce);
    _debounce = null;
  }
  if (_observer) {
    _observer.disconnect();
    _observer = null;
  }
  if (_controller) {
    _controller.abort();
    _controller = null;
  }
  try {
    document.querySelectorAll('.' + BTN_CLASS).forEach((node) => node.remove());
  } catch {
    /* ignore */
  }
  if (_tooltip) {
    _tooltip.remove();
    _tooltip = null;
  }
  _activeBtn = null;
  _hints = {};
}
