/**
 * Color swatches for the Bricks variable-picker dropdown.
 *
 * SLASHED color tokens are registered with Bricks' Variable Manager as
 * empty-valued variables (see includes/class-variables.php) so the
 * framework's adaptive `light-dark()` definitions in `:root` stay the
 * single source of truth and nothing the plugin injects competes with
 * them. The cost of that fidelity is that Bricks has no value to render
 * a colour swatch from in the variable picker — entries show as plain
 * text.
 *
 * This module paints the swatch back in, builder-side only, without ever
 * touching `:root`. Each `--sf-color-*` entry in the picker dropdown gets
 * a small coloured square using a server-resolved hex map (localised from
 * `Slashed_Bricks_Inventory::get_color_hex_map()`), because the builder
 * panel does not load the SLASHED stylesheet and so cannot resolve
 * `var(--sf-color-*)` itself.
 *
 * Design notes — mirrors the rest of the integration's philosophy:
 *
 *   - **Additive and fail-silent.** Bricks renders the list, names and
 *     the canvas hover-preview natively; we only prepend a swatch. If the
 *     markup ever changes or anything throws, you lose the square — never
 *     the picker.
 *
 *   - **Reconcile, don't stamp-once.** Bricks (Vue) reuses `<li>` nodes
 *     when the list is filtered via the search box, so a row that was
 *     "sf-color-action" can become "sf-color-primary" — or a non-colour
 *     variable — while keeping the same DOM node. Every pass recomputes
 *     each row's desired colour and adds / updates / removes its swatch
 *     accordingly, which is reuse-safe where a one-time marker would go
 *     stale.
 *
 *   - **Scoped to colour tokens only.** `resolveSwatchColor()` returns a
 *     colour only for `--sf-color-*` names present in the hex map, so the
 *     same observer is harmless in the spacing / typography pickers.
 *
 * @module color-swatches
 */

const ITEM_SELECTOR = 'li.variable-picker-item';
const SWATCH_CLASS  = 'slashed-var-swatch';
const SF_BTN_CLASS  = 'slashed-sf-color-btn';
const DEBOUNCE_MS   = 50;

const log = (level, ...args) => console[level]('[slashed-swatches]', ...args);

/**
 * Resolve the swatch colour for a variable label, or null.
 *
 * Pure and DOM-free so it can be unit tested with `node --test`. Accepts
 * the variable name as shown in the picker (Bricks omits the leading
 * `--`, e.g. "sf-color-primary") and returns the resolved hex from the
 * map, or null when the name is not a single known `--sf-color-*` token.
 *
 * @param {string} rawName - e.g. "sf-color-primary" or "--sf-color-primary".
 * @param {Record<string, string>} hexMap - Map keyed by "--sf-color-*".
 * @returns {string | null}
 */
export function resolveSwatchColor(rawName, hexMap) {
  if (!rawName || !hexMap) return null;

  let name = String(rawName).trim();
  if (!name || /\s/.test(name)) return null;

  // The picker renders names without the leading `--`; normalise so the
  // lookup key matches the hex map (which is keyed by the full property).
  if (name.slice(0, 2) !== '--') name = '--' + name.replace(/^-+/, '');

  if (name.indexOf('--sf-color-') !== 0) return null;

  const hex = hexMap[name];
  return typeof hex === 'string' && hex ? hex : null;
}

// ----- DOM glue (only runs in the browser) ---------------------------

let _enabled = false;
let _hexMap = {};
let _onOpenPanel = null;
let _observer = null;
let _debounce = null;
let _controller = null;

/**
 * Inject the "SF Colors" button into a Bricks colour control.
 *
 * Bricks colour-field markup (from live DOM):
 *   <div data-control="color">
 *     <div class="dynamic-tag-picker-button" data-balloon="Color picker">…</div>
 *     <div class="bricks-control-preview">…palette icon…</div>
 *     <div class="input-wrapper">
 *       <div data-control="text" class="… color-input">
 *         <input …/>
 *         <div class="variable-picker-button" data-balloon="Variables">…</div>
 *         <div class="dynamic-tag-picker-button" data-balloon="Dynamic data">…</div>
 *       </div>
 *     </div>
 *   </div>
 *
 * We insert our button after .variable-picker-button, keeping it visually
 * right next to the Variables icon. Idempotent via SF_BTN_CLASS guard.
 *
 * @param {Element} colorControl  element matching [data-control="color"]
 */
function injectSFButton(colorControl) {
  if (!_onOpenPanel) return;
  const colorInput = colorControl.querySelector('[data-control="text"].color-input');
  if (!colorInput) return;

  let btn = colorInput.querySelector('.' + SF_BTN_CLASS);
  if (!btn) {
    btn = document.createElement('div');
    btn.className = SF_BTN_CLASS;
    btn.setAttribute('data-balloon', 'SLASHED Colors');
    btn.setAttribute('data-balloon-pos', 'top-right');
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    const dot = document.createElement('span');
    dot.className = SF_BTN_CLASS + '__dot';
    dot.setAttribute('aria-hidden', 'true');
    btn.appendChild(dot);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      // Pass the wrapper so the picker re-queries the live input at pick time,
      // avoiding a stale reference if Bricks re-renders the control.
      if (_onOpenPanel) _onOpenPanel(colorInput);
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === ' ') { e.preventDefault(); btn.click(); }
      else if (e.key === 'Enter') btn.click();
    });

    // Insert right after the Variables icon, before Dynamic data (if present).
    // Falls back to appending when there's no Variables icon or it's the last child.
    const varBtn = colorInput.querySelector('.variable-picker-button');
    if (varBtn && varBtn.nextSibling) {
      colorInput.insertBefore(btn, varBtn.nextSibling);
    } else {
      colorInput.appendChild(btn);
    }
  }

  // Sync the dot to the live input value on every pass — not just on fresh
  // injection. The colour can change through paths that don't tear out our
  // button (Bricks' own colour palette, dynamic data, a manual edit); when it
  // does, the swatch must follow. If the value is no longer one of our
  // `--sf-color-*` variables the dot resets to the default colourful state.
  syncSFButtonState(btn, colorInput);
}

/**
 * Reflect the colour input's current value on the SF button's dot.
 *
 * When the input holds a known `--sf-color-*` variable the dot becomes the
 * solid resolved-hex square (active). Otherwise it resets to the default
 * colourful conic-gradient dot, so picking a colour through Bricks' own UI
 * no longer leaves a stale SF swatch behind.
 *
 * @param {Element} btn         the `.slashed-sf-color-btn` element
 * @param {Element} colorInput  the `[data-control="text"].color-input` wrapper
 */
function syncSFButtonState(btn, colorInput) {
  const dot = btn.querySelector('.' + SF_BTN_CLASS + '__dot');
  const liveInput =
    colorInput.querySelector('input[type="text"]') ??
    colorInput.querySelector('input:not([type="hidden"],[type="submit"],[type="button"],[type="checkbox"],[type="radio"],[type="file"])');
  const currentVal = liveInput?.value ?? '';
  const varName = currentVal.match(/^var\((--[^)]+)\)/)?.[1];
  const hex = varName ? (_hexMap[varName] ?? null) : null;

  if (dot) {
    if (hex) {
      dot.style.background = hex;
      dot.style.removeProperty('box-shadow');
    } else {
      dot.style.removeProperty('background');
    }
  }
  btn.classList.toggle(SF_BTN_CLASS + '--active', !!hex);
}

/**
 * Read the variable name a picker row represents.
 *
 * The row layout is:
 *   <li class="variable-picker-item">
 *     <span title="sf-color-primary">sf-color-primary</span>
 *     <span class="option-value"></span>
 *   </li>
 * The first span's `title` holds the canonical name; fall back to its
 * text, then the row text, so a minor markup shift still resolves.
 *
 * @param {Element} li
 * @returns {string}
 */
function itemName(li) {
  const span =
    li.querySelector(':scope > span[title]') || li.querySelector(':scope > span');
  if (span) {
    const title = span.getAttribute('title');
    if (title && title.trim()) return title.trim();
    return (span.textContent || '').trim();
  }
  return (li.textContent || '').trim();
}

/**
 * Add, update, or remove a single row's swatch to match its current
 * variable. Idempotent and safe to run on every pass.
 *
 * @param {Element} li
 */
function reconcile(li) {
  // Category / group headers (`.title`, `.category`) are not variables.
  if (li.classList.contains('title') || li.classList.contains('category')) {
    const stale = li.querySelector(':scope > .' + SWATCH_CLASS);
    if (stale) stale.remove();
    return;
  }

  const color = resolveSwatchColor(itemName(li), _hexMap);
  let swatch = li.querySelector(':scope > .' + SWATCH_CLASS);

  if (!color) {
    if (swatch) swatch.remove();
    return;
  }

  if (!swatch) {
    swatch = document.createElement('span');
    swatch.className = SWATCH_CLASS;
    swatch.setAttribute('aria-hidden', 'true');
    li.insertBefore(swatch, li.firstChild);
  }

  if (swatch.dataset.color !== color) {
    swatch.style.setProperty('--slashed-swatch-color', color);
    swatch.dataset.color = color;
  }
}

function runPass() {
  try {
    const items = document.querySelectorAll(ITEM_SELECTOR);
    for (const li of items) reconcile(li);
  } catch (err) {
    log('warn', 'swatch pass failed', err);
  }
  if (_onOpenPanel) {
    try {
      document.querySelectorAll('[data-control="color"]').forEach(injectSFButton);
    } catch (err) {
      log('warn', 'SF button inject failed', err);
    }
  }
}

function schedule() {
  if (_debounce !== null) return;
  _debounce = setTimeout(() => {
    _debounce = null;
    runPass();
  }, DEBOUNCE_MS);
}

/**
 * Cheap pre-filter for the body-level observer: only schedule a pass when
 * a mutation is relevant to our injections.
 *
 * We observe `document.body` because neither the variable-picker dropdown
 * nor the Bricks settings panel have stable containers across their full
 * lifecycles. This filter keeps canvas edits and structure-panel rebuilds
 * from waking the reconciler unnecessarily.
 *
 * Relevant mutations:
 *   - Variable picker rows appearing/changing → reconcile colour swatches.
 *   - Colour controls (`[data-control="color"]`) appearing → inject SF button.
 *
 * @param {MutationRecord[]} records
 * @returns {boolean}
 */
function touchesPicker(records) {
  for (const m of records) {
    const t = m.target;
    if (t && t.nodeType === 1 && t.closest) {
      if (t.closest(ITEM_SELECTOR)) return true;
      if (_onOpenPanel && t.closest('[data-control="color"]')) return true;
    }
    for (const node of m.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (
        (node.matches && node.matches(ITEM_SELECTOR)) ||
        (node.querySelector && node.querySelector(ITEM_SELECTOR))
      ) return true;
      if (_onOpenPanel && (
        (node.matches && node.matches('[data-control="color"]')) ||
        (node.querySelector && node.querySelector('[data-control="color"]'))
      )) return true;
    }
  }
  return false;
}

/**
 * Initialise variable-picker swatches and/or the SF Colors button.
 *
 * Safe to call when disabled (no-ops) and idempotent (a second call
 * tears down the first). Pass an `AbortSignal` to have the observer
 * disconnected automatically when the host aborts.
 *
 * @param {boolean} enabled         - Whether to paint colour swatches in the variable picker.
 * @param {Record<string, string>} hexMap - Map keyed by "--sf-color-*".
 * @param {{ signal?: AbortSignal, onOpenPanel?: (target: string|null) => void }} [options]
 */
export function init(enabled, hexMap, options = {}) {
  destroy();

  _enabled = !!enabled;
  _hexMap = hexMap && typeof hexMap === 'object' ? hexMap : {};
  _onOpenPanel = typeof options.onOpenPanel === 'function' ? options.onOpenPanel : null;

  // Need at least one active feature to warrant setting up the observer.
  const needsSwatches = _enabled && Object.keys(_hexMap).length > 0;
  if (!needsSwatches && !_onOpenPanel) return;

  _controller = new AbortController();

  // We watch `document.body` because neither the variable-picker dropdown
  // nor the Bricks settings panel have stable containers across their full
  // lifecycles. `touchesPicker()` filters out unrelated builder churn so
  // canvas edits and structure-panel rebuilds never wake the reconciler.
  _observer = new MutationObserver((records) => {
    if (touchesPicker(records)) schedule();
  });
  _observer.observe(document.body, { childList: true, subtree: true });

  runPass();

  if (options.signal) {
    if (options.signal.aborted) destroy();
    else options.signal.addEventListener('abort', destroy, { once: true });
  }
}

/**
 * Tear down the observer and remove every element we injected.
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
    document.querySelectorAll('.' + SWATCH_CLASS).forEach((node) => node.remove());
    document.querySelectorAll('.' + SF_BTN_CLASS).forEach((node) => node.remove());
  } catch {
    /* ignore */
  }
  _enabled = false;
  _hexMap = {};
  _onOpenPanel = null;
}
