/**
 * Variable documentation hints for the Bricks builder variable picker.
 *
 * Each SLASHED variable row in the Bricks variable-picker dropdown gets
 * a small "?" info icon injected at the row's trailing edge. Hovering or
 * focusing that icon reveals a tooltip showing the variable name (with the
 * `--` prefix restored) and its category.
 *
 * Architecture mirrors class-hints.js:
 *   - Icon-triggered tooltip, not row-hover, so the hint never covers the
 *     picker's own affordances.
 *   - Reconcile on every pass — Bricks/Vue reuses `<li>` nodes when the
 *     user filters the picker list, so a row can change variable while
 *     keeping the same DOM node.
 *   - Pure resolver (DOM-free, unit-testable with `node --test`).
 *   - Graceful degradation: if Bricks restructures, the feature no-ops.
 *
 * @module variable-hints
 */

const ITEM_SELECTOR = 'li.variable-picker-item';
const BTN_CLASS     = 'slashed-var-hint-btn';
const TOOLTIP_ID    = 'slashed-var-hint';
const HOST_ID       = 'slashed-rebemer-host';
const DEBOUNCE_MS   = 50;

/**
 * Resolve a raw variable label to a hint, or null.
 *
 * Pure and DOM-free. Accepts the name as shown in the Bricks picker
 * (without leading `--`, e.g. "sf-color-primary") and returns the
 * matching hint, or null when the name is not a known SLASHED variable.
 *
 * @param {string} rawName
 * @param {Record<string, {category: string}>} hints
 * @returns {{ name: string, category: string } | null}
 */
export function resolveVariableHint(rawName, hints) {
  if (!rawName || !hints) return null;

  let name = String(rawName).trim();
  if (!name || /\s/.test(name)) return null;

  // Normalize: strip leading dashes so the key matches the hints map
  // (keyed without `--`, e.g. "sf-color-primary").
  const normalized = name.replace(/^-+/, '');
  if (!normalized) return null;

  if (!Object.prototype.hasOwnProperty.call(hints, normalized)) return null;

  const hint = hints[normalized];
  if (!hint) return null;

  return { name: normalized, category: hint.category || '' };
}

// ----- DOM glue (only runs in the browser) ---------------------------

let _hints      = {};
let _tooltip    = null;
let _controller = null;
let _observer   = null;
let _debounce   = null;
let _activeBtn  = null;

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
  el.className = 'slashed-var-hint';
  el.setAttribute('role', 'tooltip');
  el.hidden = true;
  el.innerHTML =
    '<code class="slashed-var-hint__name"></code>' +
    '<span class="slashed-var-hint__cat"></span>';
  host.appendChild(el);

  _tooltip = el;
  return el;
}

function position(el, target) {
  const r   = target.getBoundingClientRect();
  const tw  = el.offsetWidth;
  const th  = el.offsetHeight;
  const gap = 8;
  const vw  = document.documentElement.clientWidth;
  const vh  = document.documentElement.clientHeight;

  let top = r.bottom + gap;
  if (top + th > vh && r.top - gap - th >= 0) top = r.top - gap - th;

  let left = r.left + r.width / 2 - tw / 2;
  if (left + tw > vw - 4) left = Math.max(4, vw - 4 - tw);
  if (left < 4) left = 4;

  el.style.top  = `${Math.round(top)}px`;
  el.style.left = `${Math.round(left)}px`;
}

function showForButton(btn) {
  const name = btn.dataset.sfVar;
  const hint = name ? resolveVariableHint(name, _hints) : null;
  if (!hint) return;

  const el = ensureTooltip();
  el.querySelector('.slashed-var-hint__name').textContent = '--' + hint.name;
  const cat = el.querySelector('.slashed-var-hint__cat');
  cat.textContent = hint.category || '';
  cat.hidden = !hint.category;

  el.hidden = false;
  position(el, btn);
  _activeBtn = btn;
}

function hide() {
  if (_tooltip) _tooltip.hidden = true;
  _activeBtn = null;
}

function onBtnEnter(event) { showForButton(event.currentTarget); }
function onBtnLeave()      { hide(); }
function onBtnClick(event) {
  // Informational only — prevent picker from acting on the click.
  event.preventDefault();
  event.stopPropagation();
}
function onKeyDown(event) {
  if (event.key === 'Escape') hide();
}

/**
 * Read the variable name a picker row represents.
 *
 * Matches color-swatches.js strategy: prefer `span[title]` (canonical
 * Bricks markup), fall back to span text then full row text. Injected
 * elements (color swatch, hint button) carry no text nodes so they
 * never contaminate the result.
 *
 * @param {Element} li
 * @returns {string}
 */
function rowName(li) {
  const span =
    li.querySelector(':scope > span[title]') ||
    li.querySelector(':scope > span');
  if (span) {
    const title = span.getAttribute('title');
    if (title && title.trim()) return title.trim();
    return (span.textContent || '').trim();
  }
  return (li.textContent || '').trim();
}

function makeButton() {
  const btn = document.createElement('span');
  btn.className = BTN_CLASS;
  btn.setAttribute('role', 'button');
  btn.setAttribute('tabindex', '0');
  btn.setAttribute('aria-label', 'What is this variable?');
  // No text node: the "?" glyph is painted via CSS ::before so the
  // row's textContent stays clean for re-resolution on every pass.
  btn.addEventListener('mouseenter', onBtnEnter);
  btn.addEventListener('mouseleave', onBtnLeave);
  btn.addEventListener('focus',      onBtnEnter);
  btn.addEventListener('blur',       onBtnLeave);
  btn.addEventListener('click',      onBtnClick);
  return btn;
}

/**
 * One idempotent reconcile pass across all visible variable picker rows.
 *
 * Pass 1: refresh or remove buttons whose row's variable changed
 *         (Vue reuses nodes when the user filters the list).
 * Pass 2: inject buttons into eligible rows that have none.
 */
function reconcile() {
  // Pass 1: reap stale / update changed buttons.
  for (const btn of document.querySelectorAll('.' + BTN_CLASS)) {
    const li   = btn.closest('li');
    const hint = li ? resolveVariableHint(rowName(li), _hints) : null;
    if (!hint) {
      if (_activeBtn === btn) hide();
      btn.remove();
    } else if (btn.dataset.sfVar !== hint.name) {
      btn.dataset.sfVar = hint.name;
    }
  }

  // Pass 2: inject into eligible rows that lack a button.
  for (const li of document.querySelectorAll(ITEM_SELECTOR)) {
    if (li.classList.contains('title') || li.classList.contains('category')) continue;
    if (li.querySelector('.' + BTN_CLASS)) continue;
    const hint = resolveVariableHint(rowName(li), _hints);
    if (!hint) continue;
    const btn = makeButton();
    btn.dataset.sfVar = hint.name;
    li.appendChild(btn);
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
 * Cheap pre-filter: only schedule a pass when a mutation touches a
 * variable-picker row, ignoring canvas edits and structure-panel churn.
 *
 * @param {MutationRecord[]} records
 * @returns {boolean}
 */
function touchesPicker(records) {
  for (const m of records) {
    const t = m.target;
    if (t && t.nodeType === 1 && t.closest) {
      if (t.classList && t.classList.contains(BTN_CLASS)) continue;
      if (t.closest(ITEM_SELECTOR)) return true;
    }
    for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.classList && node.classList.contains(BTN_CLASS)) continue;
      if (
        (node.matches    && node.matches(ITEM_SELECTOR)) ||
        (node.querySelector && node.querySelector(ITEM_SELECTOR))
      ) return true;
    }
  }
  return false;
}

/**
 * Initialise variable hints.
 *
 * Safe to call with an empty map (no-ops) and idempotent (a second call
 * tears down the first). Pass an `AbortSignal` to have the observer
 * disconnected automatically when the host aborts.
 *
 * @param {Record<string, {category: string}>} hints  variableHints from PHP.
 * @param {{ signal?: AbortSignal }} [options]
 */
export function init(hints, options = {}) {
  destroy();

  _hints = hints && typeof hints === 'object' ? hints : {};
  if (Object.keys(_hints).length === 0) return;

  _controller = new AbortController();
  const { signal } = _controller;

  document.addEventListener('keydown', onKeyDown, { passive: true, signal });
  window.addEventListener('scroll', hide, { capture: true, passive: true, signal });

  _observer = new MutationObserver((records) => {
    if (_activeBtn && !_activeBtn.isConnected) hide();
    if (touchesPicker(records)) schedule();
  });
  _observer.observe(document.body, { childList: true, subtree: true });

  reconcile();

  if (options.signal) {
    if (options.signal.aborted) destroy();
    else options.signal.addEventListener('abort', destroy, { once: true });
  }
}

/**
 * Tear down listeners, the observer, the tooltip, and every injected button.
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
  } catch { /* ignore */ }
  if (_tooltip) {
    _tooltip.remove();
    _tooltip = null;
  }
  _activeBtn = null;
  _hints = {};
}
