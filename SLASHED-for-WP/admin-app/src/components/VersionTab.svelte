<script>
  import { wpSettings } from '../lib/store.svelte.js';
  import { fetchFrameworkVersions, switchFrameworkVersion } from '../lib/wp-api.js';

  const boot = /** @type {any} */(window.slashedApp ?? {});

  let versions = $state(/** @type {Array<{tag: string, date: string, notes?: string}>} */([]));
  let currentVersion = $state(boot.versions?.framework ?? 'unknown');
  let loading = $state(true);
  let switching = $state(/** @type {string|null} */(null));
  let error = $state('');
  let successMsg = $state('');

  $effect(() => {
    fetchFrameworkVersions()
      .then(data => { versions = data; })
      .catch(e => { error = e?.message ?? 'Could not load versions'; })
      .finally(() => { loading = false; });
  });

  async function handleSwitch(tag) {
    if (switching || tag === currentVersion) return;
    switching = tag;
    error = '';
    successMsg = '';
    try {
      await switchFrameworkVersion(tag);
      currentVersion = tag;
      successMsg = `Switched to ${tag}.`;
    } catch (e) {
      error = e?.message ?? 'Switch failed';
    } finally {
      switching = null;
    }
  }
</script>

<section class="version-tab">
  <header class="version-tab__header">
    <h2>Framework version</h2>
    <span class="version-tab__current">Active: <strong>{currentVersion}</strong></span>
  </header>

  {#if error}
    <p class="version-tab__error">{error}</p>
  {/if}

  {#if successMsg}
    <p class="version-tab__success">{successMsg}</p>
  {/if}

  {#if loading}
    <p class="version-tab__loading">Loading available versions…</p>
  {:else if versions.length === 0}
    <p class="version-tab__empty">No versions available.</p>
  {:else}
    <ul class="version-tab__list">
      {#each versions as v (v.tag)}
        {@const isActive = v.tag === currentVersion}
        <li class="version-tab__item" class:is-active={isActive}>
          <div class="version-tab__info">
            <span class="version-tag">{v.tag}</span>
            {#if v.date}
              <span class="version-date">{v.date}</span>
            {/if}
            {#if v.notes}
              <span class="version-notes">{v.notes}</span>
            {/if}
          </div>
          <button
            class="btn"
            class:btn--active={isActive}
            class:btn--switch={!isActive}
            onclick={() => handleSwitch(v.tag)}
            disabled={isActive || switching !== null}
          >
            {#if isActive}
              ✓ Active
            {:else if switching === v.tag}
              Switching…
            {:else}
              Switch
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <footer class="version-tab__footer">
    <p>Switching framework versions updates the CSS loaded on the frontend. The change takes effect immediately after saving.</p>
  </footer>
</section>

<style>
  .version-tab {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    max-width: 640px;
  }

  .version-tab__header {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .version-tab__header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--cfg-text, #111);
  }

  .version-tab__current {
    font-size: 0.85rem;
    color: var(--cfg-text-muted, #666);
  }

  .version-tab__loading,
  .version-tab__empty {
    color: var(--cfg-text-muted, #666);
    font-size: 0.875rem;
  }

  .version-tab__error {
    color: oklch(0.5 0.22 25);
    font-size: 0.875rem;
    margin: 0;
  }

  .version-tab__success {
    color: oklch(0.5 0.18 145);
    font-size: 0.875rem;
    margin: 0;
  }

  .version-tab__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .version-tab__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--cfg-border, #ddd);
    border-radius: 8px;
    background: var(--cfg-surface, #fafafa);
  }

  .version-tab__item.is-active {
    border-color: var(--cfg-accent, oklch(0.6 0.18 250));
    background: color-mix(in oklch, var(--cfg-accent, oklch(0.6 0.18 250)) 8%, white);
  }

  .version-tab__info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .version-tag {
    font-family: ui-monospace, monospace;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--cfg-text, #111);
  }

  .version-date {
    font-size: 0.75rem;
    color: var(--cfg-text-muted, #666);
  }

  .version-notes {
    font-size: 0.75rem;
    color: var(--cfg-text-muted, #666);
    font-style: italic;
  }

  .btn {
    padding: 0.375rem 0.875rem;
    border-radius: 6px;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    white-space: nowrap;
    transition: background 0.15s;
    flex-shrink: 0;
  }

  .btn:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  .btn--active {
    background: var(--cfg-accent, oklch(0.6 0.18 250));
    color: #fff;
    border-color: var(--cfg-accent, oklch(0.6 0.18 250));
  }

  .btn--switch {
    background: transparent;
    color: var(--cfg-text, #111);
    border-color: var(--cfg-border, #ddd);
  }

  .btn--switch:not(:disabled):hover {
    background: var(--cfg-hover, #f0f0f0);
  }

  .version-tab__footer {
    margin-top: 0.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--cfg-border, #eee);
  }

  .version-tab__footer p {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--cfg-text-muted, #666);
  }
</style>
