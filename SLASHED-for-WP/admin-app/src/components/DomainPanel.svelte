<script>
  /**
   * One domain tab (Colors, Typography, Spacing, …).
   *
   * BASIC mode  → intro copy + curated essential rows + the domain's basic
   *               generator (e.g. fluid spacing scale). No quick knobs —
   *               global multipliers are a power tool, not a starting point.
   * ADVANCED   → essentials + every generator + the FULL domain catalogue
   *               (grouped, searchable, tier-filtered, modified-only filter),
   *               capped by a collapsed "Power knobs" group for the global
   *               multipliers, so nothing is ever out of reach.
   *
   * Reuses the existing TokenRow / TokenEditor / OklchPicker / ScaleGenerator,
   * so each domain is just curation — no bespoke per-field code.
   */
  import { allTokens, groupTokens, matchesQuery, tokenByName } from '../lib/model.js';
  import { domainOf, KNOBS_BY_DOMAIN, DOCS_BASE_URL } from '../lib/domains.js';
  import { BASIC_BY_DOMAIN } from '../lib/basics.js';
  import { BRAND_COLOR_KEYS } from '../lib/brandColors.js';
  import { ui, overrides, patchOverrides } from '../lib/store.svelte.js';
  import { STYLE_PRESETS_BY_DOMAIN } from '../lib/stylePresets.js';
  import TokenGroup from './TokenGroup.svelte';
  import TokenRow from './TokenRow.svelte';
  import BrandColorRow from './BrandColorRow.svelte';
  import ScaleGenerator from './ScaleGenerator.svelte';
  import QuickKnobs from './QuickKnobs.svelte';
  import StylePresetRow from './StylePresetRow.svelte';

  /** @type {{ domain: { id:string, label:string, icon:string, blurb:string, intro?:string, powerIntro?:string, essentials?:string[], basicGenerators?:string[], advancedGenerators?:string[], brandColors?:boolean } }} */
  let { domain } = $props();

  const advanced = $derived(ui.mode === 'advanced');
  const query = $derived(ui.query.trim().toLowerCase());

  // Curated essential rows — only those present in the active catalogue.
  const essentials = $derived(
    (domain.essentials ?? [])
      .map((name) => tokenByName.get(name))
      .filter(Boolean)
  );

  // Friendly Basic groups (lib/basics.js): label + help per control, with
  // controls whose token is missing from the catalogue dropped defensively
  // (tests/basics.test.js makes that a CI failure, never a silent gap).
  const basicGroups = $derived(
    (BASIC_BY_DOMAIN[domain.id]?.groups ?? [])
      .map((g) => ({
        ...g,
        controls: g.controls
          .map((c) => ({ ...c, tokenObj: tokenByName.get(c.token) }))
          .filter((c) => c.tokenObj),
      }))
      .filter((g) => g.controls.length)
  );

  // Every token in this domain.
  const domainTokens = $derived(allTokens.filter((t) => domainOf(t) === domain.id));

  // Advanced list: tier + modified + usage + search filters, then grouped.
  // Use property-access (overrides[t.name]) instead of `in` so Svelte 5's
  // state proxy triggers reactivity via the `get` trap on every key check.
  const advancedVisible = $derived(
    domainTokens.filter((t) => {
      if (t.tier === 'INTERNAL' && !ui.showInternal) return false;
      if (ui.onlyModified && overrides[t.name] == null) return false;
      if (ui.usageFilter === 'configure' && t.role !== 'knob') return false;
      if (ui.usageFilter === 'consume' && t.role !== 'consumption') return false;
      return matchesQuery(t, query);
    })
  );
  const grouped = $derived(groupTokens(advancedVisible));

  // The curated Basic surface for this domain: essentials plus the brand
  // light/dark pair tokens. Basic search renders matches from this set only;
  // everything else is one click away via the "more in Advanced" affordance.
  const basicSurface = $derived.by(() => {
    const s = new Set(domain.essentials ?? []);
    if (domain.brandColors) {
      for (const { key } of BRAND_COLOR_KEYS) {
        s.add(`--sf-color-${key}-light`);
        s.add(`--sf-color-${key}-dark`);
      }
    }
    return s;
  });

  // Basic mode + active search: matches across the whole domain, split into
  // curated-surface hits (rendered) and the advanced-only remainder (count).
  const basicSearch = $derived.by(() => {
    if (advanced || !query) return null;
    const hits = domainTokens.filter((t) => {
      if (t.tier === 'INTERNAL' && !ui.showInternal) return false;
      return matchesQuery(t, query);
    });
    const shown = hits.filter((t) => basicSurface.has(t.name));
    return { shown, hiddenCount: hits.length - shown.length };
  });

  // Only label each group's category when more than one is present in this
  // domain (otherwise the repeated "Core tokens" prefix is just noise).
  const categoryCount = $derived(new Set(grouped.map((c) => c.category)).size);

  const basicGenerators = $derived(domain.basicGenerators ?? []);

  // Power knobs for this domain (global multipliers that cascade through
  // many derived tokens — see lib/domains.js → KNOBS_BY_DOMAIN). Advanced
  // only: they sit in a collapsed, visually fenced group below the catalogue.
  const knobs = $derived(KNOBS_BY_DOMAIN[domain.id] ?? []);
  const totalDriven = $derived(knobs.reduce((n, k) => n + (k.driving ?? 1), 0));

  // Modified tokens within this domain — surfaced as a collapsible block.
  const modifiedHere = $derived(
    domainTokens.filter((t) => overrides[t.name] != null)
  );

  // "Reset domain" button — clears overrides only for tokens in this domain.
  function resetDomain() {
    const patch = Object.fromEntries(modifiedHere.map((t) => [t.name, null]));
    if (modifiedHere.length) patchOverrides(patch);
  }
</script>

{#snippet cardHead(title, count, hint = '')}
  <header class="panel__card-head">
    <span class="panel__card-title">{title}</span>
    <span class="panel__card-count">{count}</span>
    {#if hint}
      <span class="panel__card-hint">{hint}</span>
    {/if}
  </header>
{/snippet}

<section class="panel">
  <header class="panel__head">
    <div class="panel__title-wrap">
      <span class="panel__icon" aria-hidden="true">{domain.icon}</span>
      <div>
        <h2 class="panel__title">{domain.label}</h2>
        <p class="panel__blurb">{domain.blurb}</p>
      </div>
    </div>

    <div class="panel__actions">
      {#if advanced}
        <div class="cfg-seg panel__usage-seg" role="group" aria-label="Usage filter">
          <button
            class="cfg-seg__btn"
            class:cfg-seg__btn--on={ui.usageFilter === 'all'}
            onclick={() => (ui.usageFilter = 'all')}
            aria-pressed={ui.usageFilter === 'all'}
            title="Show all tokens"
          >All</button>
          <button
            class="cfg-seg__btn"
            class:cfg-seg__btn--on={ui.usageFilter === 'configure'}
            onclick={() => (ui.usageFilter = 'configure')}
            aria-pressed={ui.usageFilter === 'configure'}
            title="Show only configure tokens — literal inputs you SET in :root"
          >Configure</button>
          <button
            class="cfg-seg__btn"
            class:cfg-seg__btn--on={ui.usageFilter === 'consume'}
            onclick={() => (ui.usageFilter = 'consume')}
            aria-pressed={ui.usageFilter === 'consume'}
            title="Show only consume tokens — derived outputs you READ in component CSS"
          >Consume</button>
        </div>
        <label class="panel__check" title="Restrict to tokens with an active override">
          <input type="checkbox" bind:checked={ui.onlyModified} />
          <span>Modified only</span>
        </label>
        <label class="panel__check" title="Show INTERNAL-tier implementation tokens">
          <input type="checkbox" bind:checked={ui.showInternal} />
          <span>Internal</span>
        </label>
      {/if}
      {#if modifiedHere.length}
        <button
          class="cfg-btn cfg-btn--sm cfg-btn--danger"
          onclick={resetDomain}
          title="Reset all {modifiedHere.length} modified token{modifiedHere.length === 1 ? '' : 's'} in this domain"
        >Reset {modifiedHere.length}</button>
      {/if}
    </div>
  </header>

  <div class="panel__body">
    {#if basicSearch}
      <!-- Basic mode + active search: curated hits + an Advanced affordance. -->
      {#if basicSearch.shown.length === 0 && basicSearch.hiddenCount === 0}
        <p class="panel__empty">
          No <strong>{domain.label.toLowerCase()}</strong> tokens match
          <code>{ui.query}</code>. Try Advanced mode to widen filters.
        </p>
      {:else}
        {#if basicSearch.shown.length}
          <section class="cfg-card panel__card">
            {@render cardHead('Search results', basicSearch.shown.length)}
            <div class="panel__card-rows">
              {#each basicSearch.shown as token (token.name)}
                <TokenRow {token} />
              {/each}
            </div>
          </section>
        {/if}
        {#if basicSearch.hiddenCount > 0}
          <button
            class="panel__more"
            onclick={() => (ui.mode = 'advanced')}
            title="Switch to Advanced mode — your search is kept"
          >
            {basicSearch.hiddenCount} more match{basicSearch.hiddenCount === 1 ? '' : 'es'} in Advanced →
          </button>
        {/if}
      {/if}
    {:else}
      <!-- Orientation copy: what this domain controls, whether typical
           projects change it. Basic mode only — Advanced users know. -->
      {#if !advanced && domain.intro}
        <p class="panel__intro">{domain.intro}</p>
      {/if}

      <!-- One-click style presets (Basic borders/shadows) -->
      {#if !advanced && STYLE_PRESETS_BY_DOMAIN[domain.id]}
        <StylePresetRow
          title={STYLE_PRESETS_BY_DOMAIN[domain.id].title}
          presets={STYLE_PRESETS_BY_DOMAIN[domain.id].presets}
        />
      {/if}

      <!-- Basic-mode curated surfaces (brand colors, basic groups, essentials).
           All three are hidden in Advanced mode — the full filtered catalogue
           below covers every token, so duplicating them here would bypass the
           Modified-only and Internal filters and confuse the user. -->
      {#if domain.brandColors && !advanced}
        <!-- Brand colors domain: light/dark pair rows for every brand color -->
        <section class="cfg-card panel__card">
          {@render cardHead(
            'Brand & status colors',
            BRAND_COLOR_KEYS.length,
            advanced ? '' : 'Set light-mode values — dark mode is auto-derived. Click the dark swatch to pin a custom value.'
          )}
          <div class="panel__card-rows">
            {#each BRAND_COLOR_KEYS as { key, label } (key)}
              <BrandColorRow colorKey={key} {label} />
            {/each}
          </div>
        </section>
      {:else if !advanced && basicGroups.length}
        <!-- Curated Basic forms: friendly labels, help text, ⓘ raw-token info. -->
        {#each basicGroups as group (group.title)}
          <section class="cfg-card panel__card">
            {@render cardHead(group.title, group.controls.length)}
            <div class="panel__card-rows">
              {#each group.controls as c (c.token)}
                <TokenRow token={c.tokenObj} label={c.label} help={c.help} showRawInfo />
              {/each}
            </div>
          </section>
        {/each}
      {:else if !advanced && essentials.length}
        <!-- In Advanced mode the full filtered catalogue covers everything;
             showing essentials here would bypass the Modified-only / Internal
             filters and confuse the user with duplicated unfiltered rows. -->
        <section class="cfg-card panel__card">
          {@render cardHead(
            'Essentials',
            essentials.length,
            `Curated for most projects · switch to Advanced (A) for the full ${domainTokens.length}-token catalogue.`
          )}
          <div class="panel__card-rows">
            {#each essentials as token (token.name)}
              <TokenRow {token} />
            {/each}
          </div>
        </section>
      {/if}

      <!-- Basic generators (e.g. fluid spacing scale) -->
      {#each basicGenerators as g (g)}
        <ScaleGenerator kinds={[g]} />
      {/each}

      {#if advanced}
        <!-- Full domain catalogue, grouped -->
        {#if grouped.length === 0}
          <p class="panel__empty">No tokens match the current search and filters.</p>
        {:else}
          {#each grouped as cat (cat.category)}
            {#each cat.groups as group (group.name)}
              <TokenGroup
                name={group.name}
                tokens={group.tokens}
                description={group.description}
                showCategory={categoryCount > 1}
                category={cat.category}
              />
            {/each}
          {/each}
        {/if}

        <!-- Power knobs: global multipliers with atomic reach. Deliberately
             last and collapsed — one drag here moves dozens of tokens. -->
        {#if knobs.length}
          <details class="power">
            <summary class="power__summary">
              <span class="power__bolt" aria-hidden="true">⚡</span>
              <span class="power__title">Power knobs</span>
              <span class="power__chip">drives {totalDriven} token{totalDriven === 1 ? '' : 's'}</span>
            </summary>
            {#if domain.powerIntro}
              <p class="power__intro">{domain.powerIntro}</p>
            {/if}
            <QuickKnobs {knobs} title="Global multipliers" blurb="" />
          </details>
        {/if}
      {:else if !domain.brandColors && essentials.length === 0 && basicGenerators.length === 0}
        <!-- Domain has no curated essentials (e.g. Effects, Misc). Surface
             the full advanced list anyway so Basic isn't a dead end. -->
        <p class="panel__hint">
          This domain has no curated basics — switch to <strong>Advanced</strong> (A) to edit the full catalogue.
        </p>
      {/if}

      {#if domain.docsPath}
        <p class="panel__docs">
          <a
            href="{DOCS_BASE_URL}{domain.docsPath}"
            target="_blank"
            rel="noreferrer"
          >Learn more about {domain.label.toLowerCase()} in the framework docs →</a>
        </p>
      {/if}
    {/if}
  </div>
</section>

<style>
  .panel {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .panel__head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 14px 20px 12px;
    border-bottom: 1px solid var(--cfg-border);
    background: var(--cfg-surface);
    flex-wrap: wrap;
  }
  .panel__title-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    flex: 1 1 auto;
  }
  .panel__icon {
    display: inline-grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: var(--cfg-radius);
    background: linear-gradient(135deg, rgba(79, 140, 255, 0.18), rgba(120, 80, 220, 0.18));
    border: 1px solid var(--cfg-border-strong);
    font-size: 16px;
    flex-shrink: 0;
  }
  .panel__title { margin: 0; font-size: 16px; font-weight: 600; }
  .panel__blurb { margin: 2px 0 0; color: var(--cfg-text-muted); font-size: 12px; max-width: 70ch; }

  .panel__actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }
  .panel__usage-seg :global(.cfg-seg__btn) { padding: 4px 10px; font-size: 11.5px; }
  .panel__check {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--cfg-text-muted);
    cursor: pointer;
    white-space: nowrap;
  }
  .panel__check input { accent-color: var(--cfg-accent-strong); }

  .panel__body {
    overflow-y: auto;
    padding: 16px 20px 80px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 0;
  }

  .panel__card { overflow: clip; }
  .panel__card-head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--cfg-border);
    background: var(--cfg-surface-2);
    flex-wrap: wrap;
  }
  .panel__card-title {
    font-size: 12.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--cfg-text);
  }
  .panel__card-count {
    font-family: var(--cfg-mono);
    font-size: 11px;
    color: var(--cfg-text-faint);
  }
  .panel__card-hint {
    flex: 1 1 auto;
    text-align: right;
    font-size: 11.5px;
    color: var(--cfg-text-faint);
  }

  .panel__intro {
    margin: 0;
    padding: 10px 14px;
    font-size: 13px;
    line-height: 1.55;
    color: var(--cfg-text-muted);
    background: var(--cfg-surface);
    border: 1px solid var(--cfg-border);
    border-left: 3px solid var(--cfg-accent-strong);
    border-radius: var(--cfg-radius-s);
  }

  .panel__more {
    align-self: center;
    padding: 8px 16px;
    font-size: 12.5px;
    color: var(--cfg-text-muted);
    background: var(--cfg-surface-2);
    border: 1px dashed var(--cfg-border-strong);
    border-radius: var(--cfg-radius-s);
    cursor: pointer;
    transition: color 0.12s, border-color 0.12s;
  }
  .panel__more:hover {
    color: var(--cfg-text);
    border-color: var(--cfg-accent-strong);
  }

  /* Power knobs — visually fenced: these multipliers cascade through dozens
     of tokens, so the group reads as "handle with intent". */
  .power {
    border: 1px solid rgba(240, 173, 78, 0.45);
    border-radius: var(--cfg-radius);
    background: rgba(240, 173, 78, 0.06);
    overflow: clip;
  }
  .power__summary {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    cursor: pointer;
    list-style: none;
    user-select: none;
  }
  .power__summary::-webkit-details-marker { display: none; }
  .power__summary:hover { background: rgba(240, 173, 78, 0.1); }
  .power__bolt { font-size: 14px; }
  .power__title {
    font-size: 12.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .power__chip {
    font-family: var(--cfg-mono);
    font-size: 10.5px;
    color: rgb(240, 173, 78);
    border: 1px solid rgba(240, 173, 78, 0.45);
    border-radius: 999px;
    padding: 1px 8px;
  }
  .power__intro {
    margin: 0;
    padding: 0 16px 10px;
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--cfg-text-muted);
  }
  .power > :global(.knobs) {
    border: 0;
    border-top: 1px solid rgba(240, 173, 78, 0.25);
    border-radius: 0;
  }

  .panel__empty,
  .panel__hint {
    color: var(--cfg-text-faint);
    font-size: 13.5px;
    padding: 20px 4px;
    text-align: center;
  }
  .panel__empty code {
    color: var(--cfg-text);
    background: var(--cfg-bg-2);
    padding: 1px 6px;
    border-radius: 4px;
    border: 1px solid var(--cfg-border);
  }

  .panel__docs {
    margin: 4px 0 0;
    font-size: 12px;
    text-align: center;
  }
  .panel__docs a {
    color: var(--cfg-text-faint);
    text-decoration: none;
    transition: color 0.12s;
  }
  .panel__docs a:hover { color: var(--cfg-accent); text-decoration: underline; }

  /* Tighter horizontal padding on narrow phones recovers ~16px of content
     width, reducing the chance of token editors overflowing their container. */
  @media (max-width: 600px) {
    .panel__body { padding: 12px 10px 60px; gap: 12px; }
    .panel__head { padding: 10px 12px 8px; gap: 8px; }
    .panel__title { font-size: 14px; }
    .panel__blurb { display: none; }
    /* On very narrow screens, actions drop below the title as a full-width strip */
    .panel__actions {
      flex-basis: 100%;
      gap: 8px;
    }
    /* The segmented usage filter is too wide on mobile — collapse labels */
    .panel__usage-seg :global(.cfg-seg__btn) {
      padding: 4px 8px;
      font-size: 10.5px;
    }
  }
</style>
