<script>
  /**
   * Top bar.
   *
   * Contents (left → right):
   *   • Brand mark + product title + framework version pill
   *   • Global search input (filters tokens across the active domain;
   *     also triggers cross-domain matches in advanced mode via the panel)
   *   • Basic / Advanced segmented control (global mode toggle)
   *   • Light / Dark preview-theme toggle
   *   • Sidebar / Preview pane toggles
   *
   * Below ~760px the labels collapse to icons but every control stays
   * reachable. Keyboard shortcut: `/` focuses the search box.
   */
  import { sync, allTokens, frameworkVersion } from '../lib/model.js';
  import { ui, overrides, overrideCount, history, undo, redo, openOutputDrawer } from '../lib/store.svelte.js';

  const totalTokens = allTokens.length;
  const modCount = $derived(Object.keys(overrides).length);
  const canUndo = $derived(history.past.length > 0);
  const canRedo = $derived(history.future.length > 0);
</script>

<header class="hdr">
  <div class="hdr__brand">
    <span class="hdr__mark" aria-hidden="true">/</span>
    <div class="hdr__title-wrap">
      <h1 class="hdr__title">SLASHED Configurator</h1>
      <p class="hdr__sub">Edit every framework token. Generate override CSS.</p>
    </div>
    <div class="hdr__pills">
      {#if frameworkVersion}
        <span class="hdr__pill" title="Synced from {sync.source} (catalogue {sync.tokensHash})">
          v{frameworkVersion}
        </span>
      {/if}
      <span class="hdr__pill hdr__pill--muted" title="{totalTokens} tokens in the live catalogue">
        {totalTokens} tokens
      </span>
      {#if modCount > 0}
        <button
          class="hdr__pill hdr__pill--mod hdr__pill--btn"
          onclick={openOutputDrawer}
          title="{modCount} active override{modCount === 1 ? '' : 's'} — open the export drawer"
        >
          {modCount} customised · Export CSS
        </button>
      {/if}
    </div>
  </div>

  <div class="hdr__search">
    <span class="hdr__search-icon" aria-hidden="true">⌕</span>
    <input
      id="cfg-search"
      class="cfg-input hdr__search-input"
      type="search"
      placeholder="Filter tokens by name, value, group…"
      aria-label="Filter tokens"
      bind:value={ui.query}
      onkeydown={(e) => { if (e.key === 'Escape') ui.query = ''; }}
      spellcheck="false"
    />
    <kbd class="hdr__search-kbd cfg-kbd" aria-hidden="true">/</kbd>
  </div>

  <div class="hdr__controls">
    <div class="hdr__history" role="group" aria-label="Undo / redo">
      <button
        class="cfg-btn cfg-btn--ghost cfg-btn--icon hdr__pane"
        onclick={() => undo()}
        disabled={!canUndo}
        title="Undo last edit ({canUndo ? history.past.length + ' available' : 'no history'}) — ⌘Z"
        aria-label="Undo"
      >↶</button>
      <button
        class="cfg-btn cfg-btn--ghost cfg-btn--icon hdr__pane"
        onclick={() => redo()}
        disabled={!canRedo}
        title="Redo last undone edit ({canRedo ? history.future.length + ' available' : 'nothing to redo'}) — ⇧⌘Z"
        aria-label="Redo"
      >↷</button>
    </div>

    <div class="cfg-seg" role="group" aria-label="Complexity mode">
      <button
        class="cfg-seg__btn"
        class:cfg-seg__btn--on={ui.mode === 'basic'}
        onclick={() => (ui.mode = 'basic')}
        aria-pressed={ui.mode === 'basic'}
        title="Basic — the curated essentials most projects need (B)"
      >Basic</button>
      <button
        class="cfg-seg__btn"
        class:cfg-seg__btn--on={ui.mode === 'advanced'}
        onclick={() => (ui.mode = 'advanced')}
        aria-pressed={ui.mode === 'advanced'}
        title="Advanced — every token, generator and viewport knob (A)"
      >Advanced</button>
    </div>

    <button
      class="cfg-btn cfg-btn--ghost cfg-btn--icon hdr__pane hdr__theme-toggle"
      onclick={() => (ui.uiTheme = ui.uiTheme === 'dark' ? 'light' : 'dark')}
      aria-pressed={ui.uiTheme === 'light'}
      title="{ui.uiTheme === 'dark' ? 'Switch configurator to light mode' : 'Switch configurator to dark mode'}"
      aria-label="Toggle configurator theme"
    >{ui.uiTheme === 'dark' ? '☀' : '☾'}</button>

    <button
      class="cfg-btn cfg-btn--ghost cfg-btn--icon hdr__pane hdr__pane--side"
      onclick={() => (ui.sidebarOpen = !ui.sidebarOpen)}
      aria-pressed={ui.sidebarOpen}
      title="{ui.sidebarOpen ? 'Collapse' : 'Expand'} the category sidebar"
      aria-label="Toggle sidebar"
    >{ui.sidebarOpen ? '◧' : '▤'}</button>

    <button
      class="cfg-btn cfg-btn--ghost cfg-btn--icon hdr__pane"
      onclick={() => (ui.previewOpen = !ui.previewOpen)}
      aria-pressed={ui.previewOpen}
      title="{ui.previewOpen ? 'Hide' : 'Show'} the live preview pane"
      aria-label="Toggle preview"
    >◨</button>
  </div>
</header>

<style>
  .hdr {
    grid-area: header;
    display: grid;
    grid-template-columns: minmax(280px, 1fr) minmax(220px, 480px) auto;
    align-items: center;
    gap: 18px;
    padding: 12px 18px;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.02), transparent), var(--cfg-surface);
    border-bottom: 1px solid var(--cfg-border);
  }
  .hdr__brand { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; min-width: 0; }
  .hdr__mark {
    font-family: var(--cfg-mono);
    font-weight: 800;
    font-size: 26px;
    color: var(--cfg-accent);
    background: linear-gradient(135deg, rgba(79, 140, 255, 0.18), rgba(120, 80, 220, 0.18));
    border: 1px solid var(--cfg-border-strong);
    border-radius: var(--cfg-radius);
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .hdr__title-wrap { min-width: 0; }
  .hdr__title { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: 0.005em; }
  .hdr__sub { margin: 1px 0 0; font-size: 11.5px; color: var(--cfg-text-muted); }
  .hdr__pills { display: inline-flex; gap: 6px; flex-wrap: wrap; }
  .hdr__pill {
    font-family: var(--cfg-mono);
    font-size: 10.5px;
    font-weight: 600;
    color: var(--cfg-accent);
    border: 1px solid rgba(117, 167, 255, 0.4);
    background: rgba(79, 140, 255, 0.1);
    border-radius: 999px;
    padding: 2px 9px;
    line-height: 1.6;
  }
  .hdr__pill--muted {
    color: var(--cfg-text-muted);
    border-color: var(--cfg-border-strong);
    background: var(--cfg-surface-2);
  }
  .hdr__pill--mod {
    color: var(--cfg-warn);
    border-color: rgba(255, 213, 86, 0.4);
    background: rgba(255, 213, 86, 0.12);
  }
  .hdr__pill--btn {
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s;
  }
  .hdr__pill--btn:hover {
    background: rgba(255, 213, 86, 0.22);
    border-color: rgba(255, 213, 86, 0.7);
  }

  .hdr__search {
    position: relative;
    display: flex;
    align-items: center;
  }
  .hdr__search-icon {
    position: absolute;
    left: 10px;
    color: var(--cfg-text-faint);
    font-size: 14px;
    pointer-events: none;
  }
  .hdr__search-input {
    width: 100%;
    padding-left: 28px;
    padding-right: 30px;
  }
  .hdr__search-kbd {
    position: absolute;
    right: 8px;
    pointer-events: none;
  }

  .hdr__controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .hdr__history { display: inline-flex; gap: 2px; }

  /* Pane-toggle buttons keep their solid border for affordance. */
  .hdr__pane { border-color: var(--cfg-border-strong); color: var(--cfg-text-muted); }

  /* Extra right margin to visually separate the UI theme toggle from the pane toggles. */
  .hdr__theme-toggle { margin-right: 4px; }

  @media (max-width: 1100px) {
    .hdr {
      grid-template-columns: minmax(0, 1fr) minmax(180px, 320px) auto;
    }
    .hdr__sub { display: none; }
  }
  @media (max-width: 760px) {
    .hdr {
      grid-template-columns: minmax(0, 1fr);
      grid-template-rows: auto auto;
      gap: 10px;
    }
    .hdr__brand { order: 1; }
    .hdr__search { order: 3; grid-column: 1; }
    .hdr__controls { order: 2; justify-content: flex-end; }
    .hdr__sub { display: none; }
    .hdr__title { font-size: 15px; }
  }
  @media (max-width: 600px) {
    .hdr { padding: 10px 12px; gap: 8px; }
    /* Token count pill adds no value on tiny screens — hide to keep brand row compact */
    .hdr__pill--muted { display: none; }
    /* The sidebar toggle is ineffective at this width (the rail is always
       icon-only regardless of state). The preview toggle STAYS — it opens
       the slide-over preview overlay. */
    .hdr__pane--side { display: none; }
    /* Prevent remaining controls from wrapping to a second row.
       flex-start ensures overflow goes right so the first items (undo/redo)
       stay visible by default on very narrow screens (≤320px). */
    .hdr__controls { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; gap: 6px; justify-content: flex-start; }
    .hdr__controls::-webkit-scrollbar { display: none; }
  }
</style>
