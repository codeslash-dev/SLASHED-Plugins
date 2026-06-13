<script>
  /**
   * WP-specific sidebar — standard configurator domain navigation plus two
   * extra entries at the bottom (Framework • Settings).
   *
   * In .syncignore: never overwritten by sync-core.mjs.
   * Styling uses the same --cfg-* CSS variables as the synced configurator
   * components so the chrome is visually uniform.
   */
  import { ui, overrides } from '../lib/store.svelte.js';
  import { DOMAINS, BASIC_DOMAIN_IDS } from '../lib/domains.js';

  const WP_DOMAINS = [
    { id: 'wp-version',  label: 'Framework', icon: '↑' },
    { id: 'wp-settings', label: 'Settings',  icon: '⚙' },
  ];

  const visibleDomains = $derived(
    ui.mode === 'basic'
      ? DOMAINS.filter((d) => BASIC_DOMAIN_IDS.includes(d.id) || d.tool)
      : DOMAINS,
  );

  const totalModified = $derived(Object.keys(overrides).length);
</script>

<aside
  class="sidebar"
  class:sidebar--collapsed={!ui.sidebarOpen}
  aria-label="Domain navigation"
>
  <button
    class="sidebar__toggle"
    aria-label={ui.sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
    title={ui.sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
    onclick={() => (ui.sidebarOpen = !ui.sidebarOpen)}
  >
    <span aria-hidden="true">{ui.sidebarOpen ? '◀' : '▶'}</span>
  </button>

  <nav class="sidebar__nav">
    {#each visibleDomains as d}
      {@const active = ui.domain === d.id}
      <button
        class="sidebar__item"
        class:sidebar__item--active={active}
        class:sidebar__item--tool={!!d.tool}
        onclick={() => (ui.domain = d.id)}
        title={ui.sidebarOpen ? undefined : d.label}
        aria-current={active ? 'page' : undefined}
      >
        <span class="sidebar__icon" aria-hidden="true">{d.icon ?? '◈'}</span>
        {#if ui.sidebarOpen}
          <span class="sidebar__label">{d.label}</span>
        {/if}
      </button>
    {/each}

    <div class="sidebar__divider" role="separator" aria-hidden="true"></div>

    {#each WP_DOMAINS as d}
      {@const active = ui.domain === d.id}
      <button
        class="sidebar__item sidebar__item--wp"
        class:sidebar__item--active={active}
        onclick={() => (ui.domain = d.id)}
        title={ui.sidebarOpen ? undefined : d.label}
        aria-current={active ? 'page' : undefined}
      >
        <span class="sidebar__icon" aria-hidden="true">{d.icon}</span>
        {#if ui.sidebarOpen}
          <span class="sidebar__label">{d.label}</span>
        {/if}
      </button>
    {/each}
  </nav>

  {#if !ui.sidebarOpen && totalModified > 0}
    <div class="sidebar__count" title="{totalModified} token(s) customised">{totalModified}</div>
  {/if}
</aside>

<style>
  .sidebar {
    grid-area: side;
    background: var(--cfg-sidebar, #1a1a1a);
    border-right: 1px solid var(--cfg-border, #333);
    display: flex; flex-direction: column;
    overflow: hidden; width: 100%; min-width: 0;
  }

  .sidebar__toggle {
    display: flex; align-items: center; justify-content: center;
    height: 36px; flex-shrink: 0;
    border: none; border-bottom: 1px solid var(--cfg-border, #333);
    background: transparent; color: var(--cfg-text-muted, #888);
    cursor: pointer; font-size: 10px; width: 100%; padding: 0;
    transition: color 0.1s, background 0.1s;
  }
  .sidebar__toggle:hover { color: var(--cfg-text, #eee); background: var(--cfg-hover, rgba(255,255,255,.05)); }

  .sidebar__nav { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 4px 0; scrollbar-width: thin; }

  .sidebar__item {
    display: flex; align-items: center; gap: 8px;
    box-sizing: border-box; width: calc(100% - 8px); margin: 1px 4px; height: 36px;
    padding: 0 8px; border: none; border-radius: 4px;
    background: transparent; color: var(--cfg-text-muted, #888);
    cursor: pointer; text-align: left; font-size: 12px; font-family: inherit;
    white-space: nowrap; overflow: hidden;
    transition: color 0.1s, background 0.1s;
  }
  .sidebar__item:hover { color: var(--cfg-text, #eee); background: var(--cfg-hover, rgba(255,255,255,.06)); }
  .sidebar__item--active { color: var(--cfg-accent, #60a5fa); background: var(--cfg-active, rgba(96,165,250,.1)); }
  .sidebar__item--tool { font-style: italic; }

  .sidebar__icon { font-size: 14px; flex-shrink: 0; width: 20px; text-align: center; line-height: 1; }
  .sidebar__label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }

  .sidebar__divider { height: 1px; background: var(--cfg-border, #333); margin: 6px 8px; }

  .sidebar__count {
    margin: 0 auto 8px; background: var(--cfg-accent, #60a5fa); color: #000;
    border-radius: 10px; padding: 1px 5px; font-size: 10px; font-weight: 600;
    min-width: 16px; text-align: center;
  }

  .sidebar--collapsed .sidebar__item { justify-content: center; padding: 0; }
</style>
