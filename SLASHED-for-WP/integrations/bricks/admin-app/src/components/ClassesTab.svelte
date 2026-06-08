<script>
  /**
   * Read-only tab listing all .sf-* layout/utility classes and .is-* state
   * classes in two collapsible sections.
   */
  import { meta } from '../lib/stores.svelte.js';

  const sfClasses = meta.inventory?.sf_classes ?? [];
  const isClasses = meta.inventory?.is_classes ?? [];

  let sfExpanded = $state(false);
  let isExpanded = $state(false);
</script>

<section>
  <h2>Registered Classes ({sfClasses.length + isClasses.length})</h2>
  <p class="hint">
    All utility and state classes declared in the active SLASHED bundle.
  </p>

  <div class="category">
    <button
      type="button"
      class="category__toggle"
      onclick={() => sfExpanded = !sfExpanded}
      aria-expanded={sfExpanded ? 'true' : 'false'}
    >
      <span class="category__arrow">{sfExpanded ? '\u25BC' : '\u25B6'}</span>
      <span class="category__label">.sf-* Layout / Utility Classes</span>
      <span class="category__count">({sfClasses.length})</span>
    </button>

    {#if sfExpanded}
      <ul class="category__list">
        {#each sfClasses as cls (cls)}
          <li><code>.{cls}</code></li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="category">
    <button
      type="button"
      class="category__toggle"
      onclick={() => isExpanded = !isExpanded}
      aria-expanded={isExpanded ? 'true' : 'false'}
    >
      <span class="category__arrow">{isExpanded ? '\u25BC' : '\u25B6'}</span>
      <span class="category__label">.is-* State Classes</span>
      <span class="category__count">({isClasses.length})</span>
    </button>

    {#if isExpanded}
      <ul class="category__list">
        {#each isClasses as cls (cls)}
          <li><code>.{cls}</code></li>
        {/each}
      </ul>
    {/if}
  </div>
</section>

<style>
  h2 { margin-top: 0; }
  .hint { color: #50575e; margin-bottom: 16px; max-width: 720px; }

  .category {
    border: 1px solid #f0f0f1;
    border-radius: 4px;
    margin-bottom: 4px;
    background: #fcfcfd;
  }

  .category__toggle {
    all: unset;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 12px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }
  .category__toggle:hover {
    background: #f6f7f7;
  }
  .category__toggle:focus-visible {
    outline: 2px solid #2271b1;
    outline-offset: 2px;
    border-radius: 4px;
  }

  .category__arrow {
    font-size: 10px;
    width: 14px;
    text-align: center;
  }

  .category__count {
    color: #787c82;
    font-weight: 400;
    font-size: 13px;
  }

  .category__list {
    list-style: none;
    margin: 0;
    padding: 0 12px 12px 34px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 4px;
  }

  .category__list li code {
    font-size: 12px;
    background: #f0f0f1;
    padding: 2px 6px;
    border-radius: 3px;
  }
</style>
