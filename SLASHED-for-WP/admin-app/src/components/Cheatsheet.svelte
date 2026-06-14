<script>
  /**
   * Cheatsheet — searchable, filterable reference for every token in the
   * SLASHED framework.
   *
   * Shows all tokens with name, tier, role, namespace, default value, and
   * description. Rows paginate (PAGE_SIZE per page) and the full set is
   * filtered in-memory so switching filters is instant.
   */
  import { allTokens } from '../lib/model.js';
  import { copyText, COPY_FEEDBACK_MS } from '../lib/clipboard.js';

  const PAGE_SIZE = 60;

  const ALL_ENTRIES = allTokens;

  // ── Filters ─────────────────────────────────────────────────────────────────
  let query      = $state('');
  let filterTier = $state('all');   // 'all' | 'PUBLIC' | 'PUBLIC-ADVANCED' | 'INTERNAL'
  let filterRole = $state('all');   // 'all' | 'knob' | 'consumption'
  let filterNs   = $state('');      // '' = all namespaces
  let page       = $state(0);

  const TIERS = ['all', 'PUBLIC', 'PUBLIC-ADVANCED', 'INTERNAL'];
  const ROLES = ['all', 'knob', 'consumption'];

  // Collect unique namespaces for the namespace dropdown
  const NAMESPACES = $derived.by(() => {
    const ns = new Set(ALL_ENTRIES.map((e) => e.namespace).filter(Boolean));
    return [...ns].sort();
  });

  function normalize(s) { return s ? s.toLowerCase() : ''; }

  const filtered = $derived.by(() => {
    const q = normalize(query);
    return ALL_ENTRIES.filter((e) => {
      if (filterTier !== 'all' && e.tier !== filterTier) return false;
      if (filterRole !== 'all' && e.role !== filterRole) return false;
      if (filterNs   && e.namespace !== filterNs) return false;
      if (q) {
        return (
          normalize(e.name).includes(q) ||
          normalize(e.description).includes(q) ||
          normalize(e.note).includes(q) ||
          normalize(e.group).includes(q) ||
          normalize(e.namespace).includes(q)
        );
      }
      return true;
    });
  });

  const totalPages = $derived(Math.ceil(filtered.length / PAGE_SIZE) || 1);
  const safePage   = $derived(Math.min(page, totalPages - 1));
  const pageItems  = $derived(filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE));

  // Reset to page 0 whenever filters change.
  $effect(() => {
    void [query, filterTier, filterRole, filterNs];
    page = 0;
  });

  // ── Copy ─────────────────────────────────────────────────────────────────────
  let copied = $state(null);
  async function copyName(name) {
    if (await copyText(name)) {
      copied = name;
      setTimeout(() => (copied = null), COPY_FEEDBACK_MS);
    }
  }

  // ── Tier colour ──────────────────────────────────────────────────────────────
  function tierCls(tier) {
    if (tier === 'PUBLIC') return 'cs-badge--public';
    if (tier === 'PUBLIC-ADVANCED') return 'cs-badge--advanced';
    return 'cs-badge--internal';
  }
  function tierLabel(tier) {
    if (tier === 'PUBLIC-ADVANCED') return 'advanced';
    return tier ? tier.toLowerCase() : '';
  }
</script>

<section class="cs">
  <!-- Toolbar -->
  <header class="cs__toolbar">
    <input
      class="cfg-input cs__search"
      type="search"
      spellcheck="false"
      bind:value={query}
      placeholder="Search by name, description, group, namespace…"
      aria-label="Cheatsheet search"
    />

    <div class="cs__filters">
      <!-- Tier -->
      <select class="cfg-select cs__select" bind:value={filterTier} aria-label="Filter by tier">
        <option value="all">All tiers</option>
        {#each TIERS.slice(1) as t (t)}
          <option value={t}>{tierLabel(t)}</option>
        {/each}
      </select>

      <!-- Role -->
      <select class="cfg-select cs__select" bind:value={filterRole} aria-label="Filter by role">
        <option value="all">All roles</option>
        <option value="knob">knob (configure)</option>
        <option value="consumption">consumption (read)</option>
      </select>

      <!-- Namespace -->
      <select class="cfg-select cs__select" bind:value={filterNs} aria-label="Filter by namespace">
        <option value="">All namespaces</option>
        {#each NAMESPACES as ns (ns)}
          <option value={ns}>{ns}</option>
        {/each}
      </select>
    </div>

    <span class="cs__count">
      {filtered.length.toLocaleString()} of {ALL_ENTRIES.length.toLocaleString()} tokens
    </span>
  </header>

  <!-- Table -->
  {#if filtered.length === 0}
    <p class="cs__empty">No tokens match the current filters.</p>
  {:else}
    <div class="cs__table-wrap" role="region" aria-label="Token cheatsheet">
      <table class="cs__table">
        <thead>
          <tr>
            <th class="cs__th cs__th--name">Token</th>
            <th class="cs__th cs__th--role">Role</th>
            <th class="cs__th cs__th--tier">Tier</th>
            <th class="cs__th cs__th--ns">Namespace</th>
            <th class="cs__th cs__th--val">Default value</th>
            <th class="cs__th cs__th--desc">Description</th>
          </tr>
        </thead>
        <tbody>
          {#each pageItems as entry (entry.name)}
            <tr class="cs__row">
              <td class="cs__td cs__td--name">
                <button
                  class="cs__copy-btn"
                  onclick={() => copyName(entry.name)}
                  title={copied === entry.name ? 'Copied!' : `Copy ${entry.name}`}
                  aria-label={copied === entry.name ? 'Copied' : `Copy ${entry.name}`}
                >
                  <code class="cs__name">{entry.name}</code>
                  <span class="cs__copy-icon" aria-hidden="true">{copied === entry.name ? '✓' : '⧉'}</span>
                </button>
                {#if entry.aliasOf}
                  <span class="cs__alias" title="Aliases {entry.aliasOf}">→ <code>{entry.aliasOf}</code></span>
                {/if}
                {#if entry.optional}
                  <span class="cs-badge cs-badge--opt" title="Optional bundle only">opt</span>
                {/if}
              </td>
              <td class="cs__td cs__td--role">
                {#if entry.role}
                  <span class="cs-badge cs-badge--{entry.role}">{entry.role}</span>
                {/if}
              </td>
              <td class="cs__td cs__td--tier">
                <span class="cs-badge {tierCls(entry.tier)}">{tierLabel(entry.tier)}</span>
              </td>
              <td class="cs__td cs__td--ns">
                {#if entry.namespace}
                  <code class="cs__ns">{entry.namespace}</code>
                {/if}
              </td>
              <td class="cs__td cs__td--val" title={entry.value}>
                <code class="cs__val">{entry.value ?? ''}</code>
              </td>
              <td class="cs__td cs__td--desc">
                {#if entry.note}
                  <span class="cs__note">{entry.note}</span>
                {:else if entry.description}
                  <span class="cs__desc">{entry.description}</span>
                {/if}
                {#if entry.group}
                  <span class="cs__group" title="Group: {entry.group}">#{entry.group}</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <nav class="cs__pager" aria-label="Cheatsheet pagination">
        <button
          class="cfg-btn cfg-btn--ghost cfg-btn--sm"
          onclick={() => (page = 0)}
          disabled={safePage === 0}
          aria-label="First page"
        >«</button>
        <button
          class="cfg-btn cfg-btn--ghost cfg-btn--sm"
          onclick={() => (page = Math.max(0, safePage - 1))}
          disabled={safePage === 0}
          aria-label="Previous page"
        >‹</button>
        <span class="cs__pager-info">
          {safePage + 1} / {totalPages}
          <span class="cs__pager-range">
            ({safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)})
          </span>
        </span>
        <button
          class="cfg-btn cfg-btn--ghost cfg-btn--sm"
          onclick={() => (page = Math.min(totalPages - 1, safePage + 1))}
          disabled={safePage >= totalPages - 1}
          aria-label="Next page"
        >›</button>
        <button
          class="cfg-btn cfg-btn--ghost cfg-btn--sm"
          onclick={() => (page = totalPages - 1)}
          disabled={safePage >= totalPages - 1}
          aria-label="Last page"
        >»</button>
      </nav>
    {/if}
  {/if}
</section>

<style>
  .cs {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  /* ── Toolbar ─────────────────────────────────────────────────────────────── */
  .cs__toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--cfg-border);
    background: var(--cfg-surface);
    flex-wrap: wrap;
  }
  .cs__search {
    flex: 1 1 240px;
    min-width: 180px;
  }
  .cs__filters {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .cs__select { font-size: 12px; padding: 4px 8px; }
  .cs__count {
    font-size: 11.5px;
    color: var(--cfg-text-faint);
    font-family: var(--cfg-mono);
    white-space: nowrap;
    margin-left: auto;
  }

  /* ── Table ───────────────────────────────────────────────────────────────── */
  .cs__table-wrap {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }
  .cs__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .cs__th {
    position: sticky;
    top: 0;
    background: var(--cfg-surface-2);
    border-bottom: 1px solid var(--cfg-border-strong);
    padding: 8px 10px;
    text-align: left;
    font-size: 10.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--cfg-text-muted);
    white-space: nowrap;
    z-index: 1;
  }
  .cs__row {
    border-bottom: 1px solid var(--cfg-border);
    transition: background 0.1s;
  }
  .cs__row:hover { background: rgba(255, 255, 255, 0.025); }
  .cs__td {
    padding: 7px 10px;
    vertical-align: top;
  }

  /* Column widths */
  .cs__th--name, .cs__td--name { width: 280px; min-width: 200px; }
  .cs__th--role, .cs__td--role { width: 110px; white-space: nowrap; }
  .cs__th--tier, .cs__td--tier { width: 90px; white-space: nowrap; }
  .cs__th--ns, .cs__td--ns   { width: 90px; }
  .cs__th--val, .cs__td--val  { width: 220px; max-width: 300px; }
  .cs__th--desc, .cs__td--desc { min-width: 200px; }

  /* ── Name cell ───────────────────────────────────────────────────────────── */
  .cs__copy-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--cfg-radius-s);
    padding: 1px 4px;
    color: var(--cfg-text);
    cursor: pointer;
    font-size: inherit;
    text-align: left;
    max-width: 100%;
    transition: background 0.1s, border-color 0.1s;
  }
  .cs__copy-btn:hover {
    background: var(--cfg-surface-2);
    border-color: var(--cfg-border);
  }
  .cs__copy-btn:focus-visible { outline: 2px solid var(--cfg-accent); outline-offset: 1px; }
  .cs__name {
    font-family: var(--cfg-mono);
    font-size: 11.5px;
    word-break: break-all;
  }
  .cs__copy-icon {
    font-size: 10px;
    color: var(--cfg-text-faint);
    opacity: 0;
    flex-shrink: 0;
  }
  .cs__copy-btn:hover .cs__copy-icon { opacity: 1; }

  .cs__alias {
    display: block;
    font-size: 10.5px;
    color: var(--cfg-text-faint);
    font-family: var(--cfg-mono);
    margin-top: 2px;
  }

  /* ── Value cell ──────────────────────────────────────────────────────────── */
  .cs__val {
    font-family: var(--cfg-mono);
    font-size: 11px;
    color: var(--cfg-text-muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-all;
  }
  .cs__ns {
    font-family: var(--cfg-mono);
    font-size: 11px;
    color: var(--cfg-text-muted);
  }

  /* ── Description cell ────────────────────────────────────────────────────── */
  .cs__note {
    color: var(--cfg-text);
    font-size: 11.5px;
    line-height: 1.5;
  }
  .cs__desc {
    color: var(--cfg-text-faint);
    font-size: 11.5px;
    line-height: 1.5;
  }
  .cs__group {
    display: inline-block;
    font-size: 10px;
    color: var(--cfg-text-faint);
    margin-left: 4px;
    vertical-align: middle;
    opacity: 0.6;
  }

  /* ── Badges ──────────────────────────────────────────────────────────────── */
  .cs-badge {
    display: inline-block;
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 999px;
    padding: 1px 7px;
    line-height: 1.6;
    white-space: nowrap;
  }
  .cs-badge--public      { color: #6fbf7e; background: rgba(111, 191, 126, 0.12); }
  .cs-badge--advanced    { color: #f0a050; background: rgba(240, 160, 80, 0.12); }
  .cs-badge--internal    { color: var(--cfg-text-faint); background: var(--cfg-surface-2); }
  .cs-badge--knob        { color: var(--cfg-accent); background: var(--cfg-accent-soft); }
  .cs-badge--consumption { color: var(--cfg-text-faint); background: var(--cfg-surface-3); }
  .cs-badge--opt         { color: var(--cfg-text-faint); border: 1px solid var(--cfg-border); padding: 0 5px; }

  /* ── Empty / pagination ──────────────────────────────────────────────────── */
  .cs__empty {
    padding: 40px 24px;
    text-align: center;
    color: var(--cfg-text-faint);
    font-size: 13px;
  }
  .cs__pager {
    display: flex;
    align-items: center;
    gap: 6px;
    justify-content: center;
    padding: 10px 16px;
    border-top: 1px solid var(--cfg-border);
    background: var(--cfg-surface);
    flex-shrink: 0;
  }
  .cs__pager-info {
    font-size: 12px;
    color: var(--cfg-text-muted);
    font-family: var(--cfg-mono);
    min-width: 120px;
    text-align: center;
  }
  .cs__pager-range {
    color: var(--cfg-text-faint);
    font-size: 11px;
  }

  /* ── Responsive ──────────────────────────────────────────────────────────── */
  @media (max-width: 900px) {
    .cs__th--val, .cs__td--val,
    .cs__th--desc, .cs__td--desc { display: none; }
  }
  @media (max-width: 600px) {
    .cs__th--ns, .cs__td--ns { display: none; }
    .cs__toolbar { gap: 8px; }
    .cs__filters { flex-direction: column; width: 100%; }
    .cs__select { width: 100%; }
  }
</style>
