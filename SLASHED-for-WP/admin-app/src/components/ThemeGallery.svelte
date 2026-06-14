<script>
  /**
   * Themes panel — built-in presets gallery + user-saved slots.
   *
   * Applying a preset WIPES every override and replaces it with the
   * preset's curated set, all in a single history step (see
   * store.svelte.js → `applyTheme`). One click to a new look, one
   * Ctrl+Z to fully revert.
   *
   * Saving the current overrides as a named theme persists it to
   * localStorage; saved themes can be re-applied or deleted from the
   * "My themes" row.
   */
  import { PRESETS } from '../lib/themes.js';
  import {
    overrides,
    savedThemes,
    applyTheme,
    saveCurrentTheme,
    deleteSavedTheme,
  } from '../lib/store.svelte.js';

  let saveName = $state('');
  let lastApplied = $state(null);
  let lastSaved = $state(null);
  let saveError = $state('');

  /** Number of overrides this theme would set (after sanitisation). */
  function size(theme) {
    return Object.keys(theme.overrides ?? {}).length;
  }

  function apply(theme) {
    const { applied, skipped } = applyTheme(theme);
    lastApplied = { id: theme.id, name: theme.name, applied, skipped: skipped.length };
    setTimeout(() => (lastApplied = null), 2200);
  }

  function save() {
    const trimmed = saveName.trim();
    if (!trimmed) {
      saveError = 'Name your theme first.';
      return;
    }
    if (Object.keys(overrides).length === 0) {
      saveError = 'No overrides yet — make some edits, then save.';
      return;
    }
    saveError = '';
    const { id, persisted } = saveCurrentTheme(trimmed);
    lastSaved = { id, name: trimmed, persisted };
    saveName = '';
    setTimeout(() => (lastSaved = null), 2400);
  }

  function remove(theme) {
    deleteSavedTheme(theme.id);
  }
</script>

<section class="themes">
  <header class="themes__head">
    <div class="themes__title-wrap">
      <span class="themes__icon" aria-hidden="true">🎭</span>
      <div>
        <h2 class="themes__title">Themes</h2>
        <p class="themes__blurb">
          One-click preset looks (each only sets the handful of knobs that
          matter — the cascade does the rest) plus your own saved slots.
        </p>
      </div>
    </div>
  </header>

  <div class="themes__body">
    <section>
      <h3 class="themes__group">Built-in presets</h3>
      <div class="themes__grid">
        {#each PRESETS as p (p.id)}
          <article class="theme cfg-card">
            <header class="theme__head">
              <span class="theme__icon" aria-hidden="true">{p.icon}</span>
              <h4 class="theme__name">{p.name}</h4>
              {#if size(p) > 0}
                <span class="theme__size" title="{size(p)} curated override{size(p) === 1 ? '' : 's'}">{size(p)}</span>
              {:else}
                <span class="theme__size theme__size--zero" title="Resets to framework defaults">reset</span>
              {/if}
            </header>
            <p class="theme__blurb">{p.blurb}</p>
            <button class="cfg-btn cfg-btn--primary cfg-btn--sm theme__apply" onclick={() => apply(p)}>
              {lastApplied?.id === p.id ? `Applied ${lastApplied.applied} ✓` : 'Apply'}
            </button>
          </article>
        {/each}
      </div>
    </section>

    <section>
      <h3 class="themes__group">My themes</h3>

      <form
        class="themes__save"
        onsubmit={(e) => { e.preventDefault(); save(); }}
      >
        <input
          class="cfg-input themes__save-name"
          type="text"
          bind:value={saveName}
          placeholder="Name this look (e.g. 'Marketing site v2')"
          spellcheck="false"
          aria-label="Theme name"
          maxlength="60"
        />
        <button
          class="cfg-btn cfg-btn--primary cfg-btn--sm"
          type="submit"
          disabled={Object.keys(overrides).length === 0}
        >
          Save current as theme
        </button>
        <span class="themes__save-meta">
          {Object.keys(overrides).length} override{Object.keys(overrides).length === 1 ? '' : 's'} ready
        </span>
      </form>

      {#if saveError}
        <p class="themes__msg themes__msg--err">{saveError}</p>
      {/if}
      {#if lastSaved}
        <p class="themes__msg">
          Saved <code>{lastSaved.name}</code>{lastSaved.persisted ? ' — persisted to this browser.' : ' — but storage is blocked, so this slot vanishes on refresh.'}
        </p>
      {/if}

      {#if savedThemes.length === 0}
        <p class="themes__empty">
          You haven't saved any themes yet. Adjust some knobs, name them above, and save.
        </p>
      {:else}
        <div class="themes__grid">
          {#each savedThemes as s (s.id)}
            <article class="theme theme--saved cfg-card">
              <header class="theme__head">
                <span class="theme__icon" aria-hidden="true">{s.icon || '⭐'}</span>
                <h4 class="theme__name">{s.name}</h4>
                <span class="theme__size">{size(s)}</span>
              </header>
              {#if s.blurb}<p class="theme__blurb">{s.blurb}</p>{/if}
              <div class="theme__actions">
                <button class="cfg-btn cfg-btn--primary cfg-btn--sm" onclick={() => apply(s)}>
                  {lastApplied?.id === s.id ? `Applied ${lastApplied.applied} ✓` : 'Apply'}
                </button>
                <button class="cfg-btn cfg-btn--sm cfg-btn--danger" onclick={() => remove(s)} title="Delete this saved theme">
                  Delete
                </button>
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  </div>
</section>

<style>
  .themes { overflow: hidden; display: flex; flex-direction: column; height: 100%; min-height: 0; }
  .themes__head {
    padding: 18px 20px 14px;
    border-bottom: 1px solid var(--cfg-border);
    background: var(--cfg-surface);
  }
  .themes__title-wrap { display: flex; align-items: flex-start; gap: 12px; }
  .themes__icon {
    display: inline-grid;
    place-items: center;
    width: 36px; height: 36px;
    border-radius: var(--cfg-radius);
    background: linear-gradient(135deg, rgba(79, 140, 255, 0.18), rgba(120, 80, 220, 0.18));
    border: 1px solid var(--cfg-border-strong);
    font-size: 18px;
  }
  .themes__title { margin: 0; font-size: 18px; font-weight: 600; }
  .themes__blurb { margin: 3px 0 0; color: var(--cfg-text-muted); font-size: 13px; max-width: 70ch; }

  .themes__body {
    overflow-y: auto;
    padding: 16px 20px 80px;
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .themes__group {
    margin: 0 0 10px;
    font-size: 12.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--cfg-text);
  }
  .themes__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
  }

  .theme {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .theme__head { display: flex; align-items: center; gap: 8px; }
  .theme__icon { font-size: 18px; }
  .theme__name { margin: 0; font-size: 14px; font-weight: 600; flex: 1; }
  .theme__size {
    font-family: var(--cfg-mono);
    font-size: 10.5px;
    font-weight: 700;
    color: var(--cfg-accent);
    background: var(--cfg-accent-soft);
    border-radius: 999px;
    padding: 1px 8px;
  }
  .theme__size--zero { color: var(--cfg-text-faint); background: var(--cfg-surface-2); }
  .theme__blurb { margin: 0; color: var(--cfg-text-muted); font-size: 12.5px; line-height: 1.5; flex: 1; }
  .theme__apply { align-self: stretch; margin-top: 4px; }
  .theme__actions { display: flex; gap: 8px; margin-top: 4px; }
  .theme__actions .cfg-btn { flex: 1; }

  .themes__save {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .themes__save-name { flex: 1; min-width: 180px; }
  .themes__save-meta { font-size: 11.5px; color: var(--cfg-text-faint); }

  .themes__msg { margin: 0 0 12px; font-size: 12.5px; color: var(--cfg-text-muted); }
  .themes__msg--err { color: var(--cfg-warn); }
  .themes__msg code { color: var(--cfg-text); }

  .themes__empty {
    margin: 0;
    padding: 20px;
    text-align: center;
    color: var(--cfg-text-faint);
    font-size: 13px;
    border: 1px dashed var(--cfg-border);
    border-radius: var(--cfg-radius);
  }
</style>
