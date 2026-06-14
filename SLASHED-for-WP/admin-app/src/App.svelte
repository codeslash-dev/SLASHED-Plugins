<script>
  /**
   * WP Admin App shell.
   *
   * Grid layout: Header • Sidebar • DomainPanel • Preview • OutputPanel.
   * When ui.useManualCss = true the full configurator is replaced by a
   * notice linking to Plugin Settings and the Manual CSS subpage.
   *
   * WpSidebar renders the standard domain navigation (WP-specific, not synced).
   * All other components (DomainPanel, Preview, Header, …) are synced from
   * configurator/src/ via `npm run sync` and live in the same src/ tree, so
   * their relative imports to ./lib/store.svelte.js resolve to the WP adapter.
   */
  import { DOMAINS, DOMAIN_BY_ID, BASIC_DOMAIN_IDS } from './lib/domains.js';
  import { ui, undo, redo, overrides } from './lib/store.svelte.js';
  import { UI_STORAGE_KEY } from './lib/uiState.js';
  import { setProbeContext } from './lib/probeHost.js';
  import Header       from './components/Header.svelte';
  import WpSidebar    from './components/WpSidebar.svelte';
  import DomainPanel  from './components/DomainPanel.svelte';
  import OutputPanel  from './components/OutputPanel.svelte';
  import Preview      from './components/Preview.svelte';
  import WcagPanel    from './components/WcagPanel.svelte';
  import ThemeGallery from './components/ThemeGallery.svelte';
  import Cheatsheet   from './components/Cheatsheet.svelte';
  import Home         from './components/Home.svelte';
  // ── Pane-width resizing ───────────────────────────────────────────────────
  const WIDTHS_KEY = 'slashed-wp-admin/pane-widths/v2';
  const SIDEBAR_MIN = 160, SIDEBAR_MAX = 500;
  const MAIN_MIN = 300, MAIN_MAX = 680;
  const clampW = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function loadWidths() {
    if (typeof localStorage === 'undefined') return { sidebar: 240, main: 400 };
    try {
      const raw = localStorage.getItem(WIDTHS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return {
          sidebar: clampW(Number(p.sidebar) || 240, SIDEBAR_MIN, SIDEBAR_MAX),
          main:    clampW(Number(p.main)    || 400, MAIN_MIN,    MAIN_MAX),
        };
      }
    } catch { /* ignore */ }
    return { sidebar: 240, main: 400 };
  }

  const _w = loadWidths();
  let sidebarWidth = $state(_w.sidebar);
  let mainWidth    = $state(_w.main);
  let dragging = $state(/** @type {'sidebar'|'main'|null} */ (null));
  let _dragStartX = 0, _dragStartW = 0;
  let shellEl = $state(null);

  function startResize(pane, /** @type {PointerEvent} */ e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging = pane;
    _dragStartX = e.clientX;
    _dragStartW = pane === 'sidebar' ? sidebarWidth : mainWidth;
    e.preventDefault();
  }
  function onResizeMove(pane, /** @type {PointerEvent} */ e) {
    if (dragging !== pane) return;
    const dx = e.clientX - _dragStartX;
    if (pane === 'sidebar') sidebarWidth = clampW(_dragStartW + dx, SIDEBAR_MIN, SIDEBAR_MAX);
    else mainWidth = clampW(_dragStartW + dx, MAIN_MIN, MAIN_MAX);
  }
  function endResize() {
    if (!dragging) return;
    dragging = null;
    try { localStorage.setItem(WIDTHS_KEY, JSON.stringify({ sidebar: sidebarWidth, main: mainWidth })); } catch { /* ignore */ }
  }

  // ── Domain state ─────────────────────────────────────────────────────────
  const home   = $derived(ui.mode === 'basic' && ui.domain === 'home');
  const domain = $derived(DOMAIN_BY_ID.get(ui.domain) ?? DOMAIN_BY_ID.get('colors'));
  const tool   = $derived(domain?.tool ?? '');

  // Keep active domain valid for the current mode.
  // Tool domains (wcag, themes, cheatsheet) are always reachable regardless of mode.
  $effect(() => {
    if (ui.mode === 'advanced' && ui.domain === 'home') {
      ui.domain = 'colors';
    } else if (
      ui.mode === 'basic' &&
      ui.domain !== 'home' &&
      !BASIC_DOMAIN_IDS.includes(ui.domain) &&
      !DOMAIN_BY_ID.get(ui.domain)?.tool
    ) {
      ui.domain = 'home';
    }
  });

  $effect(() => { setProbeContext({ overrides, theme: ui.previewTheme }); });
  $effect(() => { if (shellEl) shellEl.dataset.uiTheme = ui.uiTheme; });
  $effect(() => {
    const snap = JSON.stringify({ mode: ui.mode, domain: ui.domain, outputMode: ui.outputMode, uiTheme: ui.uiTheme });
    try { localStorage.setItem(UI_STORAGE_KEY, snap); } catch { /* quota */ }
  });
  $effect(() => {
    const mql = window.matchMedia('(max-width: 1100px)');
    const cb = (e) => { ui.previewOpen = !e.matches; };
    mql.addEventListener('change', cb);
    return () => mql.removeEventListener('change', cb);
  });
  $effect(() => {
    const mql = window.matchMedia('(max-width: 600px)');
    const cb = (e) => { ui.outputOpen = !e.matches; };
    mql.addEventListener('change', cb);
    return () => mql.removeEventListener('change', cb);
  });

  function onKey(e) {
    const meta = e.ctrlKey || e.metaKey;
    if (meta && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (meta && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }

    if (e.target instanceof HTMLElement) {
      const t = e.target;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable) {
        if (e.key === 'Escape' && t.tagName === 'INPUT' && (t.type === 'search' || t.type === 'text')) { /* let search handle */ }
        else return;
      }
    }
    if (e.key === 'Escape') {
      if (!(e.target instanceof HTMLElement && e.target.tagName === 'INPUT') && ui.previewOpen && window.matchMedia('(max-width: 1100px)').matches)
        ui.previewOpen = false;
    } else if (e.key === '/') {
      e.preventDefault(); document.querySelector('#cfg-search')?.focus();
    } else if (e.key === 'b' || e.key === 'B') {
      ui.mode = 'basic';
    } else if (e.key === 'a' || e.key === 'A') {
      ui.mode = 'advanced';
    } else if (e.key === '[' || e.key === ']') {
      const ids = ui.mode === 'basic' ? ['home', ...BASIC_DOMAIN_IDS] : DOMAINS.map((d) => d.id);
      const i = ids.indexOf(ui.domain);
      if (i !== -1) ui.domain = ids[(i + (e.key === ']' ? 1 : -1) + ids.length) % ids.length];
    }
  }
</script>

<svelte:window onkeydown={onKey} />

<div
  class="shell"
  class:shell--no-preview={!ui.previewOpen}
  class:shell--no-sidebar={!ui.sidebarOpen}
  class:shell--dragging={dragging}
  style="--shell-sw: {sidebarWidth}px; --shell-mw: {mainWidth}px"
  bind:this={shellEl}
>
  <Header />

  <WpSidebar />

  {#if ui.sidebarOpen}
    <div
      class="resizer resizer--sidebar"
      role="separator" aria-orientation="vertical" aria-label="Drag to resize sidebar"
      onpointerdown={(e) => startResize('sidebar', e)}
      onpointermove={(e) => onResizeMove('sidebar', e)}
      onpointerup={endResize} onpointercancel={endResize} onlostpointercapture={endResize}
    ></div>
  {/if}

  <main class="main" aria-label="Configurator main">
    {#if ui.useManualCss}
      <div class="manual-css-notice">
        <p>Manual CSS mode is active. The configurator is paused — your custom CSS is applied directly.</p>
        <a href={window.slashedApp?.settingsUrl ?? '#'}>Go to Plugin Settings</a> to switch back, or visit <strong>Manual CSS</strong> in the menu.
      </div>
    {:else if home}
      <Home />
    {:else if tool === 'wcag'}
      <WcagPanel />
    {:else if tool === 'themes'}
      <ThemeGallery />
    {:else if tool === 'cheatsheet'}
      <Cheatsheet />
    {:else}
      {#key ui.domain}
        <DomainPanel {domain} />
      {/key}
    {/if}
  </main>

  {#if ui.previewOpen && !ui.useManualCss}
    <div
      class="resizer resizer--preview"
      role="separator" aria-orientation="vertical" aria-label="Drag to resize live preview"
      onpointerdown={(e) => startResize('main', e)}
      onpointermove={(e) => onResizeMove('main', e)}
      onpointerup={endResize} onpointercancel={endResize} onlostpointercapture={endResize}
    ></div>
  {/if}

  {#if ui.previewOpen && !ui.useManualCss}
    <button class="scrim" aria-label="Close preview" onclick={() => (ui.previewOpen = false)}></button>
    <Preview />
  {/if}

  {#if !ui.useManualCss}
    <OutputPanel />
  {/if}
</div>

<style>
  .shell {
    --shell-sw: 240px;
    --shell-mw: 400px;
    --shell-rs: 6px;
    display: grid;
    grid-template-columns: var(--shell-sw) var(--shell-rs) var(--shell-mw) var(--shell-rs) minmax(300px, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas:
      "header header header header header"
      "side   rs1    main   rs2    preview"
      "output output output output output";
    height: 100vh;
  }
  .shell--no-preview {
    grid-template-columns: var(--shell-sw) var(--shell-rs) minmax(0, 1fr);
    grid-template-areas: "header header header" "side rs1 main" "output output output";
  }
  .shell--no-sidebar {
    grid-template-columns: 60px var(--shell-mw) var(--shell-rs) minmax(300px, 1fr);
    grid-template-areas: "header header header header" "side main rs2 preview" "output output output output";
  }
  .shell--no-sidebar.shell--no-preview {
    grid-template-columns: 60px minmax(0, 1fr);
    grid-template-areas: "header header" "side main" "output output";
  }
  .shell--dragging, .shell--dragging * { cursor: col-resize !important; user-select: none; }
  .main {
    grid-area: main;
    min-width: 0; min-height: 0;
    overflow: hidden;
    display: flex; flex-direction: column;
    background: var(--cfg-bg);
  }
  .resizer {
    position: relative; cursor: col-resize; z-index: 20;
    touch-action: none; background: transparent; transition: background 0.1s;
  }
  .resizer--sidebar { grid-area: rs1; }
  .resizer--preview { grid-area: rs2; }
  .resizer::after {
    content: ''; position: absolute; top: 0; bottom: 0;
    left: 50%; transform: translateX(-50%);
    width: 1px; background: var(--cfg-border);
    pointer-events: none; transition: background 0.1s, width 0.15s;
  }
  .resizer:hover::after, .shell--dragging .resizer::after { background: var(--cfg-accent-strong); width: 3px; }
  .scrim {
    display: none; position: fixed; inset: 0; z-index: 49;
    background: rgba(0,0,0,0.45); border: 0; padding: 0; cursor: pointer;
  }
  .manual-css-notice {
    padding: 40px 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 560px;
    margin: auto;
    align-self: center;
    color: var(--cfg-text);
    font-size: 14px;
    line-height: 1.6;
  }
  .manual-css-notice p { margin: 0; }
  @media (max-width: 1100px) {
    .shell, .shell--no-preview, .shell--no-sidebar, .shell--no-sidebar.shell--no-preview {
      grid-template-columns: 60px minmax(0, 1fr);
      grid-template-areas: "header header" "side main" "output output";
    }
    .resizer { display: none; }
    .main { border-left: 1px solid var(--cfg-border); }
    .scrim { display: block; }
    .shell :global(section.preview) {
      position: fixed; inset: 0 0 0 auto; width: min(440px, 94vw);
      z-index: 50; border-left: 1px solid var(--cfg-border-strong);
      box-shadow: -16px 0 48px rgba(0,0,0,0.5);
    }
  }
  @media (max-width: 600px) {
    .shell, .shell--no-preview, .shell--no-sidebar, .shell--no-sidebar.shell--no-preview {
      grid-template-columns: 44px minmax(0, 1fr);
    }
  }
</style>
