<script>
  /**
   * Home — the Basic-mode landing screen.
   *
   * A project setup checklist: one large row per Basic domain (Colors,
   * Typography, Spacing, Layout, Borders, Shadows) plus the Themes tool.
   * Each row shows what the domain controls and how many of its tokens are
   * customised, so the screen doubles as orientation ("what do I change per
   * project?") and progress tracking ("what have I already touched?").
   */
  import { DOMAINS, BASIC_DOMAIN_IDS } from '../lib/domains.js';
  import { modifiedCountsByDomain } from '../lib/model.js';
  import { ui, overrides, openOutputDrawer } from '../lib/store.svelte.js';

  const rows = $derived(DOMAINS.filter((d) => BASIC_DOMAIN_IDS.includes(d.id)));

  // Domain id → number of currently-overridden tokens (same map as Sidebar).
  const mods = $derived.by(() => modifiedCountsByDomain(overrides));

  const totalMods = $derived(Object.keys(overrides).length);

  // The first untouched non-tool domain gets the "start here" pointer.
  const startId = $derived(rows.find((r) => !r.tool && !mods[r.id])?.id ?? null);
</script>

<section class="home">
  <header class="home__head">
    <h2 class="home__title">Set up your design</h2>
    <p class="home__lead">
      Work through the panels below — they cover everything most projects
      change from the framework defaults. Everything else already has a good
      default and stays reachable in <strong>Advanced</strong> mode
      (<kbd class="cfg-kbd">A</kbd>).
    </p>
    {#if totalMods > 0}
      <button class="home__export" onclick={openOutputDrawer} title="Open the output drawer with your override CSS">
        {totalMods} token{totalMods === 1 ? '' : 's'} customised — Export CSS ↓
      </button>
    {/if}
  </header>

  <ul class="home__list">
    {#each rows as d (d.id)}
      <li>
        <button class="home__row" onclick={() => (ui.domain = d.id)}>
          <span class="home__icon" aria-hidden="true">{d.icon}</span>
          <span class="home__body">
            <span class="home__name">{d.label}</span>
            <!-- Tools (Themes) carry no intro — blurb is their one-liner. -->
            <span class="home__blurb">{d.tool ? d.blurb : d.intro}</span>
          </span>
          <span class="home__status">
            {#if d.tool}
              <span class="home__count">presets</span>
            {:else if mods[d.id]}
              <span class="home__count home__count--mod">{mods[d.id]} customised</span>
            {:else if d.id === startId}
              <span class="home__count home__count--start">start here →</span>
            {:else}
              <span class="home__count">defaults</span>
            {/if}
          </span>
        </button>
      </li>
    {/each}
  </ul>
</section>

<style>
  .home {
    overflow-y: auto;
    height: 100%;
    padding: 28px 24px 80px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .home__head { max-width: 72ch; }
  .home__title { margin: 0 0 6px; font-size: 20px; font-weight: 700; }
  .home__lead {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.6;
    color: var(--cfg-text-muted);
  }
  .home__export {
    margin-top: 14px;
    padding: 8px 16px;
    font-size: 12.5px;
    font-weight: 600;
    color: #fff;
    background: var(--cfg-accent-strong);
    border: 0;
    border-radius: var(--cfg-radius-s);
    cursor: pointer;
  }
  .home__export:hover { filter: brightness(1.1); }

  .home__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 760px;
  }
  .home__row {
    width: 100%;
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    text-align: left;
    background: var(--cfg-surface);
    border: 1px solid var(--cfg-border);
    border-radius: var(--cfg-radius);
    cursor: pointer;
    transition: border-color 0.12s, background 0.12s, transform 0.12s;
  }
  .home__row:hover {
    background: var(--cfg-surface-2);
    border-color: var(--cfg-accent-strong);
    transform: translateX(2px);
  }
  .home__icon {
    display: inline-grid;
    place-items: center;
    width: 44px;
    height: 44px;
    font-size: 20px;
    border-radius: var(--cfg-radius);
    background: linear-gradient(135deg, rgba(79, 140, 255, 0.16), rgba(120, 80, 220, 0.16));
    border: 1px solid var(--cfg-border-strong);
  }
  .home__body { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .home__name { font-size: 14.5px; font-weight: 650; color: var(--cfg-text); }
  .home__blurb {
    font-size: 12px;
    line-height: 1.5;
    color: var(--cfg-text-muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .home__count {
    font-family: var(--cfg-mono);
    font-size: 11px;
    color: var(--cfg-text-faint);
    white-space: nowrap;
  }
  .home__count--mod {
    color: #fff;
    background: var(--cfg-accent-strong);
    border-radius: 999px;
    padding: 2px 9px;
    font-weight: 700;
  }
  .home__count--start { color: var(--cfg-accent-strong); font-weight: 700; }

  @media (max-width: 600px) {
    .home { padding: 16px 12px 60px; }
    .home__row { grid-template-columns: 36px minmax(0, 1fr) auto; padding: 12px; gap: 10px; }
    .home__icon { width: 36px; height: 36px; font-size: 16px; }
  }
</style>
