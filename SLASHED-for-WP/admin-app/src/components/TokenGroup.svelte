<script>
  /**
   * A collapsible section for one source-derived token group (the section
   * banner from the framework CSS), rendering its token rows.
   */
  import TokenRow from './TokenRow.svelte';
  import { overrides } from '../lib/store.svelte.js';

  let { name, tokens, showCategory = false, category = '', description = '' } = $props();
  let open = $state(true);

  // Number of modified tokens in this group — surfaced in the header so a
  // collapsed group still tells you something useful at a glance.
  const modifiedCount = $derived(
    tokens.reduce((n, t) => (overrides[t.name] != null ? n + 1 : n), 0)
  );
</script>

<section class="group cfg-card" class:group--mod={modifiedCount > 0}>
  <button class="group__head" onclick={() => (open = !open)} aria-expanded={open}>
    <span class="group__caret" class:group__caret--open={open} aria-hidden="true">▶</span>
    <span class="group__labels">
      {#if showCategory}<span class="group__cat">{category}</span>{/if}
      <span class="group__name">{name}</span>
    </span>
    {#if modifiedCount > 0}
      <span class="group__mod" title="{modifiedCount} modified">{modifiedCount}</span>
    {/if}
    <span class="group__count">{tokens.length}</span>
  </button>
  {#if open}
    {#if description}
      <p class="group__desc">{description}</p>
    {/if}
    <div class="group__rows">
      {#each tokens as token (token.name)}
        <TokenRow {token} />
      {/each}
    </div>
  {/if}
</section>

<style>
  .group {
    overflow: clip;
  }
  .group--mod { box-shadow: var(--cfg-shadow-card), 0 0 0 1px rgba(79, 140, 255, 0.18); }
  .group__head {
    display: grid;
    grid-template-columns: 14px minmax(0, 1fr) auto auto;
    gap: 10px;
    align-items: center;
    width: 100%;
    text-align: left;
    background: var(--cfg-surface-2);
    border: none;
    color: var(--cfg-text);
    padding: 11px 14px;
    font-size: 13px;
    transition: background 0.12s;
  }
  .group__head:hover { background: var(--cfg-surface-3); }
  .group__caret {
    font-size: 9px;
    color: var(--cfg-text-faint);
    transition: transform 0.12s ease;
    text-align: center;
  }
  .group__caret--open { transform: rotate(90deg); }
  .group__labels {
    display: flex;
    align-items: baseline;
    gap: 8px;
    flex-wrap: wrap;
    min-width: 0;
  }
  .group__cat {
    font-size: 10px;
    color: var(--cfg-text-faint);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .group__name { font-weight: 600; }
  .group__mod {
    font-family: var(--cfg-mono);
    font-size: 10.5px;
    font-weight: 700;
    color: #fff;
    background: var(--cfg-accent-strong);
    border-radius: 999px;
    padding: 1px 7px;
    line-height: 1.5;
  }
  .group__count {
    font-family: var(--cfg-mono);
    font-size: 11px;
    color: var(--cfg-text-faint);
  }
  .group__desc {
    margin: 0;
    padding: 8px 14px 10px;
    font-size: 12.5px;
    color: var(--cfg-text-muted);
    border-bottom: 1px solid var(--cfg-border);
    background: var(--cfg-bg-2);
  }
</style>
