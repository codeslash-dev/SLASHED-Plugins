<script>
  /**
   * WP-specific sidebar — transitional navigation while the configurator
   * is deactivated pending framework v0.8.0.
   * In .syncignore: never overwritten by sync-core.mjs.
   */
  import { ui } from '../lib/store.svelte.js';
</script>

<aside
  class="sidebar"
  class:sidebar--collapsed={!ui.sidebarOpen}
  aria-label="Navigation"
>
  <button
    class="sidebar__toggle"
    aria-label={ui.sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
    title={ui.sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
    onclick={() => (ui.sidebarOpen = !ui.sidebarOpen)}
  >
    <span class="sidebar__toggle-icon" aria-hidden="true">
      {ui.sidebarOpen ? '‹' : '›'}
    </span>
  </button>

  <nav class="sidebar__nav">
    <div
      class="sidebar__item sidebar__item--active"
      aria-current="page"
    >
      <span class="sidebar__icon" aria-hidden="true">⚙️</span>
      {#if ui.sidebarOpen}
        <span class="sidebar__label">Design Settings</span>
      {/if}
    </div>

    <div class="sidebar__separator" role="separator"></div>

    <div class="sidebar__coming" title="The built-in token editor will return in framework v0.8.0">
      <span class="sidebar__icon" aria-hidden="true">🔒</span>
      {#if ui.sidebarOpen}
        <span class="sidebar__coming-label">Configurator</span>
        <span class="sidebar__coming-tag">v0.8.0</span>
      {/if}
    </div>
  </nav>
</aside>

<style>
  .sidebar {
    grid-area: side;
    background: var(--cfg-surface-2);
    border-right: 1px solid var(--cfg-border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    width: 100%;
    min-width: 0;
    transition: background 0.2s;
  }

  .sidebar__toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    flex-shrink: 0;
    border: none;
    border-bottom: 1px solid var(--cfg-border);
    background: transparent;
    color: var(--cfg-text-faint);
    cursor: pointer;
    font-size: 18px;
    font-weight: 300;
    line-height: 1;
    width: 100%;
    padding: 0;
    transition: color 0.15s, background 0.15s;
  }
  .sidebar__toggle:hover {
    color: var(--cfg-text);
    background: var(--cfg-surface-3);
  }
  .sidebar__toggle-icon {
    display: block;
    font-style: normal;
    transition: transform 0.2s;
  }

  .sidebar__nav {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px;
    scrollbar-width: thin;
    scrollbar-color: var(--cfg-border-strong) transparent;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sidebar__item {
    display: flex;
    align-items: center;
    gap: 10px;
    box-sizing: border-box;
    width: 100%;
    min-height: 40px;
    padding: 0 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--cfg-text-muted);
    cursor: pointer;
    text-align: left;
    font-size: 13px;
    font-family: inherit;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    transition: color 0.12s, background 0.12s, box-shadow 0.12s;
    position: relative;
  }
  .sidebar__item:hover {
    color: var(--cfg-text);
    background: var(--cfg-surface-3);
  }
  .sidebar__item--active {
    color: var(--cfg-accent-strong);
    background: var(--cfg-accent-soft);
    box-shadow: inset 3px 0 0 var(--cfg-accent-strong);
    font-weight: 600;
    cursor: default;
  }
  .sidebar__item--active:hover {
    background: var(--cfg-accent-soft);
  }
  .sidebar__icon {
    font-size: 16px;
    flex-shrink: 0;
    width: 22px;
    text-align: center;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .sidebar__label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sidebar__separator {
    height: 1px;
    background: var(--cfg-border);
    margin: 6px 4px;
    flex-shrink: 0;
  }

  .sidebar__coming {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 10px;
    min-height: 36px;
    color: var(--cfg-text-faint);
    opacity: 0.6;
    font-size: 12px;
    cursor: default;
    user-select: none;
  }
  .sidebar__coming-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-style: italic;
  }
  .sidebar__coming-tag {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 999px;
    background: var(--cfg-surface-3, #f0f0f0);
    border: 1px solid var(--cfg-border-strong);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .sidebar--collapsed .sidebar__item {
    justify-content: center;
    padding: 0;
    gap: 0;
  }
  .sidebar--collapsed .sidebar__item--active {
    box-shadow: inset 0 -2px 0 var(--cfg-accent-strong);
  }
  .sidebar--collapsed .sidebar__coming {
    justify-content: center;
    padding: 0;
    gap: 0;
  }

  @media (max-width: 760px) {
    .sidebar__item { min-height: 44px; }
    .sidebar__icon { font-size: 18px; width: 24px; }
    .sidebar__toggle { height: 44px; }
  }
</style>
