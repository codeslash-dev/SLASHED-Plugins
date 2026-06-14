<script>
  /**
   * WP Admin App shell — transitional state while the built-in configurator
   * is deactivated pending framework v0.8.0.
   *
   * Grid layout: Header • Sidebar • Main.
   * Routing: 'manual-css' → ManualCssTab, 'settings' → SettingsTab.
   * All configurator domains are redirected to 'manual-css' until v0.8.0.
   *
   * WpSidebar, SettingsTab, ManualCssTab are WP-specific (in .syncignore).
   */
  import { ui, undo, redo } from './lib/store.svelte.js';
  import { UI_STORAGE_KEY } from './lib/uiState.js';
  import Header       from './components/Header.svelte';
  import WpSidebar    from './components/WpSidebar.svelte';
  import ManualCssTab from './components/ManualCssTab.svelte';
  import SettingsTab  from './components/SettingsTab.svelte';

  // ── Sidebar pane-width resizing ───────────────────────────────────────────
  const WIDTHS_KEY   = 'slashed-wp-admin/pane-widths/v2';
  const SIDEBAR_MIN  = 160, SIDEBAR_MAX = 500;
  const clampW = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function loadSidebarWidth() {
    if (typeof localStorage === 'undefined') return 240;
    try {
      const raw = localStorage.getItem(WIDTHS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        return clampW(Number(p.sidebar) || 240, SIDEBAR_MIN, SIDEBAR_MAX);
      }
    } catch { /* ignore */ }
    return 240;
  }

  let sidebarWidth = $state(loadSidebarWidth());
  let dragging     = $state(false);
  let _dragStartX  = 0, _dragStartW = 0;
  let shellEl      = $state(null);

  function startResize(/** @type {PointerEvent} */ e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging    = true;
    _dragStartX = e.clientX;
    _dragStartW = sidebarWidth;
    e.preventDefault();
  }
  function onResizeMove(/** @type {PointerEvent} */ e) {
    if (!dragging) return;
    sidebarWidth = clampW(_dragStartW + (e.clientX - _dragStartX), SIDEBAR_MIN, SIDEBAR_MAX);
  }
  function endResize() {
    if (!dragging) return;
    dragging = false;
    try { localStorage.setItem(WIDTHS_KEY, JSON.stringify({ sidebar: sidebarWidth, main: 400 })); } catch { /* ignore */ }
  }

  // ── Routing ───────────────────────────────────────────────────────────────

  // Redirect any configurator domain to 'manual-css'.
  // The visual token editor returns when the framework reaches v0.8.0.
  $effect(() => {
    if (ui.domain !== 'manual-css' && ui.domain !== 'settings') {
      ui.domain = 'manual-css';
    }
  });

  // ── Persistence ───────────────────────────────────────────────────────────

  $effect(() => { if (shellEl) shellEl.dataset.uiTheme = ui.uiTheme; });
  $effect(() => {
    const snap = JSON.stringify({ mode: ui.mode, domain: ui.domain, outputMode: ui.outputMode, uiTheme: ui.uiTheme });
    try { localStorage.setItem(UI_STORAGE_KEY, snap); } catch { /* quota */ }
  });

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  function onKey(e) {
    const meta = e.ctrlKey || e.metaKey;
    if (meta && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (meta && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
  }
</script>

<svelte:window onkeydown={onKey} />

<div
  class="shell"
  class:shell--collapsed={!ui.sidebarOpen}
  class:shell--dragging={dragging}
  style="--shell-sw: {sidebarWidth}px"
  bind:this={shellEl}
>
  <Header />

  <WpSidebar />

  {#if ui.sidebarOpen}
    <div
      class="resizer"
      role="separator" aria-orientation="vertical" aria-label="Drag to resize sidebar"
      onpointerdown={startResize}
      onpointermove={onResizeMove}
      onpointerup={endResize} onpointercancel={endResize} onlostpointercapture={endResize}
    ></div>
  {/if}

  <main class="main" aria-label="SLASHED admin">
    {#if ui.domain === 'settings'}
      <SettingsTab />
    {:else}
      <ManualCssTab />
    {/if}
  </main>
</div>

<style>
  .shell {
    --shell-sw: 240px;
    --shell-rs: 6px;
    display: grid;
    grid-template-columns: var(--shell-sw) var(--shell-rs) minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas:
      "header header header"
      "side   rs1    main";
    height: 100vh;
  }
  .shell--collapsed {
    grid-template-columns: 60px var(--shell-rs) minmax(0, 1fr);
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
    grid-area: rs1;
    position: relative; cursor: col-resize; z-index: 20;
    touch-action: none; background: transparent; transition: background 0.1s;
  }
  .resizer::after {
    content: ''; position: absolute; top: 0; bottom: 0;
    left: 50%; transform: translateX(-50%);
    width: 1px; background: var(--cfg-border);
    pointer-events: none; transition: background 0.1s, width 0.15s;
  }
  .resizer:hover::after, .shell--dragging .resizer::after { background: var(--cfg-accent-strong); width: 3px; }

  @media (max-width: 760px) {
    .shell, .shell--collapsed {
      grid-template-columns: 44px minmax(0, 1fr);
      grid-template-areas: "header header" "side main";
    }
    .resizer { display: none; }
    .main { border-left: 1px solid var(--cfg-border); }
  }
</style>
