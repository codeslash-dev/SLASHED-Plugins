<script>
  /**
   * Category sidebar (left rail).
   *
   * In Basic mode lists the Home screen plus the per-project checklist domains
   * (Colors, Typography, Spacing, Layout, Borders, Shadows, Themes); Advanced
   * mode lists the full taxonomy. Each row carries the per-domain override
   * count. When the
   * sidebar is collapsed (ui.sidebarOpen = false) it shrinks to an icon-only
   * rail; on narrow viewports it always renders in icon-only mode.
   *
   * The category icons are short Unicode glyphs/emoji to avoid pulling in an
   * icon font — keeps the configurator a single self-contained bundle.
   */
  import { DOMAINS, BASIC_DOMAIN_IDS, domainOf } from '../lib/domains.js';
  import { allTokens, modifiedCountsByDomain } from '../lib/model.js';
  import { ui, overrides } from '../lib/store.svelte.js';

  // Basic mode shows the per-project checklist only (6 domains + Themes),
  // prefixed with the Home screen. Advanced shows the full taxonomy.
  const visibleDomains = $derived(
    ui.mode === 'basic'
      ? DOMAINS.filter((d) => BASIC_DOMAIN_IDS.includes(d.id))
      : DOMAINS
  );

  // Domain id → number of tokens it owns (used as the tab count badge).
  const totals = $derived.by(() => {
    const c = {};
    for (const d of DOMAINS) c[d.id] = 0;
    for (const t of allTokens) {
      const id = domainOf(t);
      c[id] = (c[id] || 0) + 1;
    }
    return c;
  });

  // Domain id → number of currently-overridden tokens (the "modified" badge).
  const mods = $derived.by(() => modifiedCountsByDomain(overrides));
</script>

<aside class="side" class:side--narrow={!ui.sidebarOpen} aria-label="Categories">
  <ul class="side__list">
    {#if ui.mode === 'basic'}
      <li>
        <button
          class="side__item"
          class:side__item--on={ui.domain === 'home'}
          onclick={() => (ui.domain = 'home')}
          aria-current={ui.domain === 'home' ? 'page' : undefined}
          title="Home — project setup checklist"
        >
          <span class="side__icon" aria-hidden="true">🏠</span>
          <span class="side__label">
            <span class="side__name">Home</span>
          </span>
        </button>
      </li>
    {/if}
    {#each visibleDomains as d (d.id)}
      <li>
        <button
          class="side__item"
          class:side__item--on={ui.domain === d.id}
          onclick={() => (ui.domain = d.id)}
          aria-current={ui.domain === d.id ? 'page' : undefined}
          title={d.label + (d.tool ? '' : ` — ${totals[d.id]} tokens`)}
        >
          <span class="side__icon" aria-hidden="true">{d.icon}</span>
          <span class="side__label">
            <span class="side__name">{d.label}</span>
            {#if !d.tool}
              <span class="side__count">{totals[d.id] ?? 0}</span>
            {:else}
              <span class="side__tool" title="Tool">tool</span>
            {/if}
          </span>
          {#if mods[d.id]}
            <span class="side__mod" title="{mods[d.id]} modified token{mods[d.id] === 1 ? '' : 's'}">{mods[d.id]}</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>

  {#if ui.sidebarOpen}
    <footer class="side__foot">
      <p class="side__hint"><kbd class="cfg-kbd">/</kbd> search · <kbd class="cfg-kbd">B</kbd>asic / <kbd class="cfg-kbd">A</kbd>dvanced · <kbd class="cfg-kbd">[</kbd> <kbd class="cfg-kbd">]</kbd> next domain · <kbd class="cfg-kbd">⌘Z</kbd> undo</p>
    </footer>
  {/if}
</aside>

<style>
  .side {
    grid-area: side;
    background: var(--cfg-bg-2);
    border-right: 1px solid var(--cfg-border);
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
  }
  .side__list {
    list-style: none;
    padding: 12px 8px;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }
  .side__item {
    width: 100%;
    display: grid;
    grid-template-columns: 26px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--cfg-radius-s);
    color: var(--cfg-text-muted);
    text-align: left;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }
  .side__item:hover {
    background: var(--cfg-surface-2);
    color: var(--cfg-text);
  }
  .side__item--on {
    background: var(--cfg-accent-soft);
    color: var(--cfg-text);
    border-color: rgba(117, 167, 255, 0.32);
    font-weight: 600;
  }
  .side__icon {
    display: inline-grid;
    place-items: center;
    width: 26px;
    height: 26px;
    border-radius: var(--cfg-radius-s);
    background: var(--cfg-surface-3);
    border: 1px solid var(--cfg-border);
    font-size: 14px;
    line-height: 1;
  }
  .side__item--on .side__icon {
    background: rgba(79, 140, 255, 0.22);
    border-color: rgba(117, 167, 255, 0.5);
  }
  .side__label {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }
  .side__name {
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .side__count {
    font-family: var(--cfg-mono);
    font-size: 10.5px;
    color: var(--cfg-text-faint);
  }
  .side__tool {
    font-family: var(--cfg-mono);
    font-size: 9.5px;
    color: var(--cfg-text-faint);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .side__mod {
    font-family: var(--cfg-mono);
    font-size: 10.5px;
    font-weight: 700;
    color: #fff;
    background: var(--cfg-accent-strong);
    border-radius: 999px;
    padding: 1px 7px;
    line-height: 1.5;
  }

  .side__foot {
    border-top: 1px solid var(--cfg-border);
    padding: 10px 12px 12px;
  }
  .side__hint {
    margin: 0;
    font-size: 11px;
    line-height: 1.7;
    color: var(--cfg-text-faint);
  }
  .side__hint :global(kbd) { margin: 0 1px; }

  /* Collapsed rail — icon-only. */
  .side--narrow .side__list { padding: 12px 6px; }
  .side--narrow .side__item {
    grid-template-columns: 1fr;
    justify-items: center;
    padding: 8px 6px;
  }
  .side--narrow .side__label,
  .side--narrow .side__mod,
  .side--narrow .side__foot { display: none; }

  @media (max-width: 1100px) {
    .side__list { padding: 12px 6px; }
    .side__item { grid-template-columns: 1fr; justify-items: center; padding: 8px 6px; }
    .side__label, .side__mod, .side__foot { display: none; }
  }
</style>
