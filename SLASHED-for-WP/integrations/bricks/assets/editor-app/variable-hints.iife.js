(function () {
  'use strict';

  // Guard against double-init: set by this IIFE or by the Vite bundle
  // when variableHints.init() is wired into main.js.
  if (window._slashedVarHintsReady) return;
  window._slashedVarHintsReady = true;

  var ITEM_SELECTOR = 'li.variable-picker-item';
  var BTN_CLASS     = 'slashed-var-hint-btn';
  var TOOLTIP_ID    = 'slashed-var-hint';
  var HOST_ID       = 'slashed-rebemer-host';
  var DEBOUNCE_MS   = 50;

  var _hints     = {};
  var _tooltip   = null;
  var _observer  = null;
  var _debounce  = null;
  var _activeBtn = null;

  function resolveHint(rawName) {
    if (!rawName) return null;
    var name = String(rawName).trim().replace(/^-+/, '');
    if (!name || /\s/.test(name)) return null;
    if (!Object.prototype.hasOwnProperty.call(_hints, name)) return null;
    var hint = _hints[name];
    return hint ? { name: name, category: hint.category || '' } : null;
  }

  function ensureTooltip() {
    if (_tooltip && _tooltip.isConnected) return _tooltip;
    var host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      document.body.appendChild(host);
    }
    var el = document.createElement('div');
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
    var r   = target.getBoundingClientRect();
    var tw  = el.offsetWidth, th = el.offsetHeight, gap = 8;
    var vw  = document.documentElement.clientWidth;
    var vh  = document.documentElement.clientHeight;
    var top = r.bottom + gap;
    if (top + th > vh && r.top - gap - th >= 0) top = r.top - gap - th;
    var left = r.left + r.width / 2 - tw / 2;
    if (left + tw > vw - 4) left = Math.max(4, vw - 4 - tw);
    if (left < 4) left = 4;
    el.style.top  = Math.round(top)  + 'px';
    el.style.left = Math.round(left) + 'px';
  }

  function showForButton(btn) {
    var hint = resolveHint(btn.dataset.sfVar);
    if (!hint) return;
    var el  = ensureTooltip();
    el.querySelector('.slashed-var-hint__name').textContent = '--' + hint.name;
    var cat = el.querySelector('.slashed-var-hint__cat');
    cat.textContent = hint.category;
    cat.hidden = !hint.category;
    el.hidden = false;
    position(el, btn);
    _activeBtn = btn;
  }

  function hide() {
    if (_tooltip) _tooltip.hidden = true;
    _activeBtn = null;
  }

  function rowName(li) {
    var span = li.querySelector(':scope > span[title]') ||
               li.querySelector(':scope > span');
    if (span) {
      var t = span.getAttribute('title');
      if (t && t.trim()) return t.trim();
      return (span.textContent || '').trim();
    }
    return (li.textContent || '').trim();
  }

  function makeBtn() {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BTN_CLASS;
    btn.setAttribute('aria-label', 'What is this variable?');
    btn.addEventListener('mouseenter', function (e) { showForButton(e.currentTarget); });
    btn.addEventListener('mouseleave', hide);
    btn.addEventListener('focus',      function (e) { showForButton(e.currentTarget); });
    btn.addEventListener('blur',       hide);
    btn.addEventListener('click',      function (e) { e.preventDefault(); e.stopPropagation(); });
    return btn;
  }

  function reconcile() {
    // Pass 1: reap stale / update changed buttons.
    document.querySelectorAll('.' + BTN_CLASS).forEach(function (btn) {
      var li   = btn.closest('li');
      var hint = li ? resolveHint(rowName(li)) : null;
      if (!hint) {
        if (_activeBtn === btn) hide();
        btn.remove();
      } else if (btn.dataset.sfVar !== hint.name) {
        btn.dataset.sfVar = hint.name;
      }
    });
    // Pass 2: inject into eligible rows that lack a button.
    document.querySelectorAll(ITEM_SELECTOR).forEach(function (li) {
      if (li.classList.contains('title') || li.classList.contains('category')) return;
      if (li.querySelector('.' + BTN_CLASS)) return;
      var hint = resolveHint(rowName(li));
      if (!hint) return;
      var btn = makeBtn();
      btn.dataset.sfVar = hint.name;
      li.appendChild(btn);
    });
  }

  function schedule() {
    if (_debounce !== null) return;
    _debounce = setTimeout(function () { _debounce = null; reconcile(); }, DEBOUNCE_MS);
  }

  function touchesPicker(records) {
    for (var i = 0; i < records.length; i++) {
      var m = records[i];
      var t = m.target;
      if (t && t.nodeType === 1 && t.closest) {
        if (t.classList && t.classList.contains(BTN_CLASS)) continue;
        if (t.closest(ITEM_SELECTOR)) return true;
      }
      for (var j = 0; j < m.addedNodes.length; j++) {
        var node = m.addedNodes[j];
        if (node.nodeType !== 1) continue;
        if (node.classList && node.classList.contains(BTN_CLASS)) continue;
        if ((node.matches    && node.matches(ITEM_SELECTOR)) ||
            (node.querySelector && node.querySelector(ITEM_SELECTOR))) return true;
      }
    }
    return false;
  }

  function init() {
    var cfg   = window.slashedBricksEditor;
    if (!cfg || typeof cfg !== 'object') return;
    var hints = cfg.variableHints;
    if (!hints || typeof hints !== 'object' || !Object.keys(hints).length) return;

    _hints = hints;

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hide();
    }, { passive: true });
    window.addEventListener('scroll', hide, { capture: true, passive: true });

    _observer = new MutationObserver(function (records) {
      if (_activeBtn && !_activeBtn.isConnected) hide();
      if (touchesPicker(records)) schedule();
    });
    _observer.observe(document.body, { childList: true, subtree: true });

    reconcile();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  window.addEventListener('beforeunload', function () {
    if (_observer) { _observer.disconnect(); _observer = null; }
    if (_debounce !== null) { clearTimeout(_debounce); _debounce = null; }
    try { document.querySelectorAll('.' + BTN_CLASS).forEach(function (n) { n.remove(); }); } catch (e) {}
    if (_tooltip) { _tooltip.remove(); _tooltip = null; }
  }, { once: true });

})();
