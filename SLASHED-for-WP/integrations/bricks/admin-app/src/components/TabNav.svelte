<script>
  /**
   * Horizontal tab strip. Reads available tabs from meta, writes the
   * active one back into ui state. No URL hash dance like the jQuery
   * version - the admin page is single-load anyway, and a tab change
   * doesn't navigate.
   */
  import { meta, ui } from '../lib/stores.svelte.js';
</script>

<nav class="tab-nav" aria-label="Settings sections">
  {#each Object.entries(meta.tabs) as [slug, label] (slug)}
    <button
      type="button"
      class="tab-nav__btn"
      class:active={ui.activeTab === slug}
      onclick={() => (ui.activeTab = slug)}
    >
      {label}
    </button>
  {/each}
</nav>

<style>
  .tab-nav {
    display: flex;
    gap: 2px;
    border-bottom: 1px solid #c3c4c7;
    flex-wrap: wrap;
  }
  .tab-nav__btn {
    background: transparent;
    border: 1px solid transparent;
    border-bottom: none;
    padding: 8px 14px;
    cursor: pointer;
    font-size: 14px;
    color: #2c3338;
    border-radius: 4px 4px 0 0;
  }
  .tab-nav__btn:hover {
    background: #f0f0f1;
  }
  .tab-nav__btn.active {
    background: white;
    border-color: #c3c4c7;
    margin-bottom: -1px;
    color: #1d2327;
    font-weight: 500;
  }
</style>
