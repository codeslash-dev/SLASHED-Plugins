/**
 * SLASHED block-editor panel.
 *
 * A floating, categorized, searchable browser for the framework's design
 * tokens — colors, gradients, utility/state classes, and CSS variables —
 * mounted as an overlay in the block editor (the same approach the Bricks
 * integration uses, rather than a native PluginSidebar, so it works
 * identically in the iframe and non-iframe editor and needs no build step).
 *
 * Why hex swatches: the panel renders in the editor's admin chrome, NOT inside
 * the content iframe, so `var(--sf-color-*)` would not resolve here. The PHP
 * side resolves every token to a light + dark hex (Slashed_Color_Resolver) and
 * localizes both maps; swatches paint with those hexes while the value applied
 * to a block is always the live `var()` reference.
 *
 * Data contract — window.slashedGutenbergEditor:
 *   {
 *     colors:    { variables: string[], light: {var:hex}, dark: {var:hex} },
 *     gradients: [ { name, slug, var } ],
 *     classes:   { layout: string[], state: string[] },
 *     variables: { [category]: string[] },
 *     classHints:{ [className]: string },
 *     i18n:      { ... }
 *   }
 *
 * @module panel
 */

import {
  buildColorModel, filterModel, swatchValue, swatchHex,
} from './color-model.js';
import {
  selectedClientId, selectedClientIds, selectedBlockLabel, applyColor, applyGradient,
  hasClass, toggleClass, copyToClipboard,
} from './apply.js';

const CFG = window.slashedGutenbergEditor || {};
const NS = 'slashed-gb';

/* ── tiny DOM helper ─────────────────────────────────────────────── */
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'title') node.title = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

/* ── panel state ─────────────────────────────────────────────────── */
const state = {
  open: false,
  tab: 'colors',          // colors | gradients | classes | variables
  mode: 'light',          // swatch preview mode
  target: 'background',   // background | text | border (colors tab)
  query: '',
};

let host = null;          // overlay container
let panelEl = null;       // the panel element
let launcherEl = null;
let toastTimer = null;
let unsubscribe = null;

/* ── models built once from localized data ───────────────────────── */
const colors = CFG.colors || { variables: [], light: {}, dark: {} };
const colorModel = buildColorModel(colors.variables, colors.light, colors.dark);
const gradients = Array.isArray(CFG.gradients) ? CFG.gradients : [];
const classes = CFG.classes || { layout: [], state: [] };
const variables = CFG.variables || {};
const classHints = CFG.classHints || {};

/* ── boot ────────────────────────────────────────────────────────── */
export function init() {
  if (document.getElementById(`${NS}-launcher`)) return; // already mounted
  if (!hasAnyData()) return;                              // nothing to show
  mountLauncher();
  // Track block selection so the context line + class active states stay fresh.
  if (window.wp && window.wp.data && typeof window.wp.data.subscribe === 'function') {
    unsubscribe = window.wp.data.subscribe(onStoreChange);
  }
}

function hasAnyData() {
  return (
    (colorModel.groups && colorModel.groups.length) ||
    gradients.length ||
    (classes.layout && classes.layout.length) ||
    (classes.state && classes.state.length) ||
    Object.keys(variables).length
  );
}

let lastSelKey = '';
function onStoreChange() {
  if (!state.open) return;
  const key = selectedClientIds().join(',');
  if (key === lastSelKey) return;
  lastSelKey = key;
  updateContextLine();
  if (state.tab === 'classes') renderBody(); // refresh active markers
}

/* ── launcher ────────────────────────────────────────────────────── */
function mountLauncher() {
  launcherEl = el('button', {
    id: `${NS}-launcher`,
    class: `${NS}-launcher`,
    type: 'button',
    title: 'SLASHED tokens',
    'aria-label': 'Open SLASHED token panel',
    onclick: togglePanel,
  }, [el('span', { class: `${NS}-launcher__mark`, text: '/' })]);
  document.body.appendChild(launcherEl);
}

function togglePanel() {
  state.open ? closePanel() : openPanel();
}

function openPanel() {
  if (panelEl) return;
  state.open = true;
  host = el('div', { id: `${NS}-host`, class: `${NS}-host` });
  panelEl = el('div', { class: `${NS}-panel`, role: 'dialog', 'aria-label': 'SLASHED tokens' }, [
    renderHeader(),
    renderTabs(),
    renderToolbar(),
    el('div', { class: `${NS}-body`, id: `${NS}-body` }),
  ]);
  host.appendChild(panelEl);
  document.body.appendChild(host);
  launcherEl?.classList.add('is-active');
  lastSelKey = selectedClientIds().join(',');
  updateContextLine();
  renderBody();
}

function closePanel() {
  state.open = false;
  if (host) host.remove();
  host = null;
  panelEl = null;
  launcherEl?.classList.remove('is-active');
}

/* ── header ──────────────────────────────────────────────────────── */
function renderHeader() {
  const modeBtn = el('button', {
    class: `${NS}-iconbtn`,
    type: 'button',
    title: 'Toggle light / dark preview',
    onclick: () => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      panelEl.dataset.mode = state.mode;
      renderBody();
    },
  }, [el('span', { text: '◐' })]);

  return el('div', { class: `${NS}-header` }, [
    el('div', { class: `${NS}-title` }, [
      el('span', { class: `${NS}-title__mark`, text: '/' }),
      el('span', { text: 'SLASHED' }),
    ]),
    el('div', { class: `${NS}-header__actions` }, [
      modeBtn,
      el('button', {
        class: `${NS}-iconbtn`, type: 'button', title: 'Close', onclick: closePanel,
      }, [el('span', { text: '×' })]),
    ]),
    el('div', { class: `${NS}-context`, id: `${NS}-context` }),
  ]);
}

function updateContextLine() {
  const ctx = document.getElementById(`${NS}-context`);
  if (!ctx) return;
  const label = selectedBlockLabel();
  if (label) {
    ctx.textContent = `Applying to: ${label}`;
    ctx.classList.remove('is-empty');
  } else {
    ctx.textContent = 'No block selected — clicking copies the value';
    ctx.classList.add('is-empty');
  }
}

/* ── tabs ────────────────────────────────────────────────────────── */
const TABS = [
  { id: 'colors', label: 'Colors' },
  { id: 'gradients', label: 'Gradients' },
  { id: 'classes', label: 'Classes' },
  { id: 'variables', label: 'Variables' },
];

function renderTabs() {
  const row = el('div', { class: `${NS}-tabs`, role: 'tablist' });
  for (const t of TABS) {
    if (t.id === 'gradients' && !gradients.length) continue;
    if (t.id === 'colors' && !colorModel.groups.length) continue;
    if (t.id === 'classes' && !(classes.layout.length || classes.state.length)) continue;
    if (t.id === 'variables' && !Object.keys(variables).length) continue;
    row.appendChild(el('button', {
      class: `${NS}-tab${state.tab === t.id ? ' is-active' : ''}`,
      type: 'button',
      role: 'tab',
      dataset: { tab: t.id },
      text: t.label,
      onclick: () => {
        state.tab = t.id;
        state.query = '';
        [...row.children].forEach((c) => c.classList.toggle('is-active', c.dataset.tab === t.id));
        const search = document.getElementById(`${NS}-search`);
        if (search) search.value = '';
        syncToolbar();
        renderBody();
      },
    }));
  }
  return row;
}

/* ── toolbar (search + colors target) ────────────────────────────── */
function renderToolbar() {
  const search = el('input', {
    id: `${NS}-search`,
    class: `${NS}-search`,
    type: 'search',
    placeholder: 'Search…',
    oninput: (e) => { state.query = e.target.value; renderBody(); },
  });

  const targetSeg = el('div', { class: `${NS}-seg`, id: `${NS}-target` },
    ['background', 'text', 'border'].map((t) => el('button', {
      class: `${NS}-seg__btn${state.target === t ? ' is-active' : ''}`,
      type: 'button',
      dataset: { target: t },
      text: t === 'background' ? 'BG' : t[0].toUpperCase() + t.slice(1),
      title: `Apply as ${t} color`,
      onclick: (e) => {
        state.target = t;
        [...e.currentTarget.parentNode.children]
          .forEach((c) => c.classList.toggle('is-active', c.dataset.target === t));
      },
    })),
  );

  return el('div', { class: `${NS}-toolbar`, id: `${NS}-toolbar` }, [search, targetSeg]);
}

function syncToolbar() {
  const target = document.getElementById(`${NS}-target`);
  if (target) target.style.display = state.tab === 'colors' ? '' : 'none';
}

/* ── body dispatch ───────────────────────────────────────────────── */
function renderBody() {
  syncToolbar();
  const body = document.getElementById(`${NS}-body`);
  if (!body) return;
  body.innerHTML = '';
  let content;
  switch (state.tab) {
    case 'gradients': content = renderGradients(); break;
    case 'classes': content = renderClasses(); break;
    case 'variables': content = renderVariables(); break;
    case 'colors':
    default: content = renderColors(); break;
  }
  body.appendChild(content);
}

/* ── colors tab ──────────────────────────────────────────────────── */
function renderColors() {
  const frag = document.createDocumentFragment();
  const model = filterModel(colorModel, state.query);
  if (!model.groups.length) return emptyState('No colors match your search.');

  for (const group of model.groups) {
    const groupEl = el('section', { class: `${NS}-group` }, [
      el('header', { class: `${NS}-group__head` }, [
        el('span', { class: `${NS}-group__name`, text: group.label }),
        group.tagline ? el('span', { class: `${NS}-group__tag`, text: group.tagline }) : null,
      ]),
    ]);
    for (const section of group.sections) {
      groupEl.appendChild(el('div', { class: `${NS}-section__label`, text: section.label }));
      const grid = el('div', { class: `${NS}-swatches` });
      for (const sw of section.swatches) grid.appendChild(colorSwatch(sw));
      groupEl.appendChild(grid);
    }
    frag.appendChild(groupEl);
  }
  return frag;
}

function colorSwatch(sw) {
  const hex = swatchHex(sw, state.mode);
  const chip = el('button', {
    class: `${NS}-swatch${sw.alpha ? ' is-alpha' : ''}`,
    type: 'button',
    title: `${sw.name}\n${hex}\nClick: apply as ${state.target} · Alt-click: copy var()`,
    'aria-label': `${sw.label} (${hex})`,
    onclick: (e) => {
      const value = swatchValue(sw);
      if (e.altKey) return doCopy(value);
      const applied = selectedClientId() ? applyColor(state.target, value) : false;
      if (applied) toast(`${state.target}: ${sw.label}`);
      else doCopy(value);
    },
  }, [el('span', { class: `${NS}-swatch__fill`, style: `--sf-gb-fill:${hex}` })]);
  return chip;
}

/* ── gradients tab ───────────────────────────────────────────────── */
function renderGradients() {
  const q = state.query.trim().toLowerCase();
  const list = gradients.filter((g) => !q || g.name.toLowerCase().includes(q) || g.slug.includes(q));
  if (!list.length) return emptyState('No gradients match your search.');

  const grid = el('div', { class: `${NS}-grad-grid` });
  for (const g of list) {
    const preview = gradientPreview(g.var, state.mode);
    grid.appendChild(el('button', {
      class: `${NS}-grad`,
      type: 'button',
      title: `${g.name}\nvar(${g.var})\nClick: apply · Alt-click: copy var()`,
      onclick: (e) => {
        const value = `var(${g.var})`;
        if (e.altKey) return doCopy(value);
        const applied = selectedClientId() ? applyGradient(value) : false;
        if (applied) toast(`Gradient: ${g.name}`);
        else doCopy(value);
      },
    }, [
      el('span', { class: `${NS}-grad__fill`, style: `--sf-gb-grad:${preview}` }),
      el('span', { class: `${NS}-grad__name`, text: g.name }),
    ]));
  }
  return grid;
}

/**
 * Build an approximate CSS gradient for the swatch preview from resolved
 * family hexes. The applied value is always the real var(), so the preview
 * only needs to read plausibly, not pixel-match the framework gradient.
 */
function gradientPreview(varName, mode) {
  const map = mode === 'dark' ? colors.dark : colors.light;
  const c = (name, fallback) => map[`--sf-color-${name}`] || fallback;
  const suffix = varName.replace('--sf-gradient-', '');

  if (['primary', 'secondary', 'tertiary'].includes(suffix)) {
    return `linear-gradient(135deg, ${c(suffix, '#888')}, ${map[`--sf-color-${suffix}-700`] || c(suffix, '#555')})`;
  }
  if (suffix === 'brand') {
    return `linear-gradient(135deg, ${c('primary', '#4a30d0')}, ${c('action', '#1c58cc')})`;
  }
  if (suffix === 'surface') {
    return `linear-gradient(135deg, ${c('surface', c('base', '#f8f9ff'))}, ${c('inset', '#eef')})`;
  }
  if (suffix.startsWith('fade--')) {
    const dir = { t: 'to top', r: 'to right', b: 'to bottom', l: 'to left' }[suffix.slice(6)] || 'to top';
    return `linear-gradient(${dir}, ${c('text', c('neutral', '#444'))}, transparent)`;
  }
  return `linear-gradient(135deg, ${c('primary', '#888')}, ${c('tertiary', '#555')})`;
}

/* ── classes tab ─────────────────────────────────────────────────── */
function renderClasses() {
  const q = state.query.trim().toLowerCase();
  const frag = document.createDocumentFragment();
  const groups = [
    { label: 'Layout & utility', items: classes.layout || [] },
    { label: 'State', items: classes.state || [] },
  ];
  let any = false;
  for (const grp of groups) {
    const items = grp.items.filter((c) => !q || c.includes(q));
    if (!items.length) continue;
    any = true;
    const section = el('section', { class: `${NS}-group` }, [
      el('header', { class: `${NS}-group__head` }, [
        el('span', { class: `${NS}-group__name`, text: grp.label }),
        el('span', { class: `${NS}-group__tag`, text: `${items.length}` }),
      ]),
    ]);
    const list = el('div', { class: `${NS}-classlist` });
    for (const cls of items) list.appendChild(classRow(cls));
    section.appendChild(list);
    frag.appendChild(section);
  }
  return any ? frag : emptyState('No classes match your search.');
}

function classRow(cls) {
  const active = hasClass(cls);
  const hint = classHints[cls];
  const row = el('button', {
    class: `${NS}-classrow${active ? ' is-active' : ''}`,
    type: 'button',
    title: hint ? `${cls}\n${hint}` : `${cls}\nClick: toggle on selected block · Alt-click: copy`,
    onclick: (e) => {
      if (e.altKey || !selectedClientId()) return doCopy(cls);
      const now = toggleClass(cls);
      if (now === null) return doCopy(cls);
      row.classList.toggle('is-active', now);
      const checkEl = row.querySelector(`.${NS}-classrow__check`);
      if (checkEl) checkEl.textContent = now ? '✓' : '';
      toast(`${now ? 'Added' : 'Removed'} .${cls}`);
    },
  }, [
    el('code', { class: `${NS}-classrow__name`, text: cls }),
    hint ? el('span', { class: `${NS}-classrow__hint`, text: hint }) : null,
    el('span', { class: `${NS}-classrow__check`, text: active ? '✓' : '' }),
  ]);
  return row;
}

/* ── variables tab ───────────────────────────────────────────────── */
function renderVariables() {
  const q = state.query.trim().toLowerCase();
  const frag = document.createDocumentFragment();
  let any = false;
  for (const [category, names] of Object.entries(variables)) {
    const items = (names || []).filter((v) => !q || v.includes(q));
    if (!items.length) continue;
    any = true;
    const section = el('section', { class: `${NS}-group` }, [
      el('header', { class: `${NS}-group__head` }, [
        el('span', { class: `${NS}-group__name`, text: category }),
        el('span', { class: `${NS}-group__tag`, text: `${items.length}` }),
      ]),
    ]);
    const list = el('div', { class: `${NS}-varlist` });
    for (const v of items) {
      list.appendChild(el('button', {
        class: `${NS}-varrow`,
        type: 'button',
        title: `var(${v})\nClick: copy`,
        onclick: () => doCopy(`var(${v})`),
      }, [el('code', { text: v })]));
    }
    section.appendChild(list);
    frag.appendChild(section);
  }
  return any ? frag : emptyState('No variables match your search.');
}

/* ── shared bits ─────────────────────────────────────────────────── */
function emptyState(msg) {
  return el('div', { class: `${NS}-empty`, text: msg });
}

async function doCopy(value) {
  try {
    const ok = await copyToClipboard(value);
    toast(ok ? `Copied ${value}` : 'Copy failed');
  } catch {
    toast('Copy failed');
  }
}

function toast(msg) {
  let t = document.getElementById(`${NS}-toast`);
  if (!t) {
    t = el('div', { id: `${NS}-toast`, class: `${NS}-toast` });
    (host || document.body).appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-visible'), 1800);
}

/* ── teardown (defensive; editor is a SPA) ───────────────────────── */
window.addEventListener('beforeunload', () => {
  if (typeof unsubscribe === 'function') unsubscribe();
  clearTimeout(toastTimer);
}, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
