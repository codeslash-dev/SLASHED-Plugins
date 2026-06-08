<script>
  /**
   * Cheatsheet tab: comprehensive searchable index of all SLASHED
   * framework CSS custom properties and utility/state classes.
   * Read-only quick-reference page.
   */
  import { variableGroups, classGroups, miscTokens } from '../lib/cheatsheet-data.js';
  import { meta } from '../lib/stores.svelte.js';

  let search = $state('');
  let viewMode = $state('all'); // 'all' | 'variables' | 'classes'

  const totalVarCount = meta.inventory?.variables?.length ?? 0;
  const totalSfClassCount = meta.inventory?.sf_classes?.length ?? 0;
  const totalIsClassCount = meta.inventory?.is_classes?.length ?? 0;

  let filteredVariableGroups = $derived(filterGroups(variableGroups, 'tokens'));
  let filteredClassGroups = $derived(filterGroups(classGroups, 'classes'));
  let filteredMiscTokens = $derived(
    miscTokens.filter(t => matchesSearch(t.name, t.description))
  );

  function matchesSearch(name, description) {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return name.toLowerCase().includes(q) || description.toLowerCase().includes(q);
  }

  function filterGroups(groups, itemsKey) {
    if (!search.trim()) return groups;
    return groups
      .map(group => ({
        ...group,
        [itemsKey]: group[itemsKey].filter(item => matchesSearch(item.name, item.description))
      }))
      .filter(group => group[itemsKey].length > 0);
  }

  let showVariables = $derived(viewMode === 'all' || viewMode === 'variables');
  let showClasses = $derived(viewMode === 'all' || viewMode === 'classes');

  let noResults = $derived(
    search.trim() !== '' &&
    (!showVariables || (filteredVariableGroups.length === 0 && filteredMiscTokens.length === 0)) &&
    (!showClasses || filteredClassGroups.length === 0)
  );
</script>

<div class="cheatsheet">
  <div class="cheatsheet__header">
    <h2>API Cheatsheet</h2>
    <p class="cheatsheet__counts">
      {totalVarCount} variables | {totalSfClassCount} layout/utility classes | {totalIsClassCount} state classes
    </p>
  </div>

  <div class="cheatsheet__controls">
    <input
      type="search"
      class="cheatsheet__search"
      placeholder="Search tokens or classes..."
      aria-label="Search tokens or classes"
      bind:value={search}
    />
    <div class="cheatsheet__view-toggle">
      <button
        type="button"
        class:active={viewMode === 'all'}
        aria-pressed={viewMode === 'all'}
        onclick={() => viewMode = 'all'}
      >All</button>
      <button
        type="button"
        class:active={viewMode === 'variables'}
        aria-pressed={viewMode === 'variables'}
        onclick={() => viewMode = 'variables'}
      >Variables</button>
      <button
        type="button"
        class:active={viewMode === 'classes'}
        aria-pressed={viewMode === 'classes'}
        onclick={() => viewMode = 'classes'}
      >Classes</button>
    </div>
  </div>

  {#if showVariables}
    <div class="cheatsheet__section">
      <h3 class="cheatsheet__section-title">CSS Custom Properties (--sf-*)</h3>

      {#each filteredVariableGroups as group}
        <details class="cheatsheet__group" open={!search.trim()}>
          <summary class="cheatsheet__group-header">
            <strong>{group.category}</strong>
            <span class="cheatsheet__group-desc">{group.description}</span>
          </summary>
          <ul class="cheatsheet__list">
            {#each group.tokens as token}
              <li class="cheatsheet__item">
                <code class="cheatsheet__name">{token.name}</code>
                <span class="cheatsheet__desc">{token.description}</span>
              </li>
            {/each}
          </ul>
        </details>
      {/each}

      {#if filteredMiscTokens.length > 0}
        <details class="cheatsheet__group" open={!search.trim()}>
          <summary class="cheatsheet__group-header">
            <strong>Misc</strong>
            <span class="cheatsheet__group-desc">Tokens that do not fit a single category.</span>
          </summary>
          <ul class="cheatsheet__list">
            {#each filteredMiscTokens as token}
              <li class="cheatsheet__item">
                <code class="cheatsheet__name">{token.name}</code>
                <span class="cheatsheet__desc">{token.description}</span>
              </li>
            {/each}
          </ul>
        </details>
      {/if}
    </div>
  {/if}

  {#if showClasses}
    <div class="cheatsheet__section">
      <h3 class="cheatsheet__section-title">Utility &amp; State Classes</h3>

      {#each filteredClassGroups as group}
        <details class="cheatsheet__group" open={!search.trim()}>
          <summary class="cheatsheet__group-header">
            <strong>{group.category}</strong>
            <span class="cheatsheet__group-desc">{group.description}</span>
          </summary>
          <ul class="cheatsheet__list">
            {#each group.classes as cls}
              <li class="cheatsheet__item">
                <code class="cheatsheet__name">{cls.name}</code>
                <span class="cheatsheet__desc">{cls.description}</span>
              </li>
            {/each}
          </ul>
        </details>
      {/each}
    </div>
  {/if}

  {#if noResults}
    <p class="cheatsheet__empty">No results for "{search}"</p>
  {/if}
</div>

<style>
  .cheatsheet {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .cheatsheet__header h2 {
    margin: 0 0 4px;
    font-size: 18px;
  }

  .cheatsheet__counts {
    margin: 0;
    font-size: 13px;
    color: #50575e;
  }

  .cheatsheet__controls {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .cheatsheet__search {
    flex: 1;
    min-width: 200px;
    padding: 6px 10px;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
    font-size: 13px;
  }
  .cheatsheet__search:focus {
    border-color: #2271b1;
    outline: none;
    box-shadow: 0 0 0 1px #2271b1;
  }

  .cheatsheet__view-toggle {
    display: flex;
    gap: 0;
  }
  .cheatsheet__view-toggle button {
    padding: 5px 12px;
    border: 1px solid #c3c4c7;
    background: white;
    font-size: 12px;
    cursor: pointer;
    color: #50575e;
  }
  .cheatsheet__view-toggle button:first-child {
    border-radius: 3px 0 0 3px;
  }
  .cheatsheet__view-toggle button:last-child {
    border-radius: 0 3px 3px 0;
  }
  .cheatsheet__view-toggle button:not(:first-child) {
    border-left: none;
  }
  .cheatsheet__view-toggle button.active {
    background: #2271b1;
    border-color: #2271b1;
    color: white;
  }

  .cheatsheet__section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .cheatsheet__section-title {
    font-size: 15px;
    margin: 8px 0 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #e2e4e7;
  }

  .cheatsheet__group {
    border: 1px solid #e2e4e7;
    border-radius: 4px;
    overflow: hidden;
  }

  .cheatsheet__group-header {
    padding: 8px 12px;
    background: #f6f7f7;
    cursor: pointer;
    font-size: 13px;
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }
  .cheatsheet__group-header::-webkit-details-marker {
    margin-right: 4px;
  }

  .cheatsheet__group-desc {
    font-size: 12px;
    color: #646970;
    font-weight: normal;
  }

  .cheatsheet__list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .cheatsheet__item {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 5px 12px;
    border-top: 1px solid #f0f0f1;
    font-size: 12px;
    line-height: 1.5;
  }
  .cheatsheet__item:first-child {
    border-top: 1px solid #e2e4e7;
  }

  .cheatsheet__name {
    flex-shrink: 0;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
    font-size: 11.5px;
    background: #f0f0f1;
    padding: 1px 5px;
    border-radius: 3px;
    color: #1e1e1e;
    white-space: nowrap;
  }

  .cheatsheet__desc {
    color: #50575e;
    font-size: 12px;
  }

  .cheatsheet__empty {
    text-align: center;
    color: #646970;
    padding: 32px 16px;
    font-style: italic;
  }
</style>
