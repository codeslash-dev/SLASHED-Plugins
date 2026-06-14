<script>
  /**
   * One-click style preset row (Basic borders/shadows panels).
   *
   * Renders a segmented row of preset buttons; clicking applies the preset's
   * override patch in a single history step (`patchOverrides`), so one
   * Ctrl+Z fully reverts. The active preset is detected by comparing the
   * live override map against each patch — hand-edited values simply show
   * no active preset, never a wrong one.
   */
  import { overrides, patchOverrides } from '../lib/store.svelte.js';
  import { tokenByName } from '../lib/model.js';
  import { presetActive } from '../lib/stylePresets.js';

  /** @type {{ title: string, presets: Array<{id:string,label:string,hint:string,patch:Record<string,string|null>}> }} */
  let { title, presets } = $props();

  // Defensive: only presets whose every patch token exists in the catalogue.
  const usable = $derived(
    presets.filter((p) => Object.keys(p.patch).every((name) => tokenByName.has(name)))
  );

  const activeId = $derived(usable.find((p) => presetActive(p, overrides))?.id ?? null);

  function apply(preset) {
    patchOverrides(preset.patch);
  }
</script>

{#if usable.length}
  <section class="cfg-card presets">
    <header class="presets__head">
      <span class="presets__title">{title}</span>
      <span class="presets__hint">{usable.find((p) => p.id === activeId)?.hint ?? 'One click — applies as a single undo step.'}</span>
    </header>
    <div class="presets__row" role="group" aria-label={title}>
      {#each usable as p (p.id)}
        <button
          class="presets__btn"
          class:presets__btn--on={p.id === activeId}
          aria-pressed={p.id === activeId}
          onclick={() => apply(p)}
          title={p.hint}
        >{p.label}</button>
      {/each}
    </div>
  </section>
{/if}

<style>
  .presets { padding: 12px 16px; }
  .presets__head {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }
  .presets__title {
    font-size: 12.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--cfg-text);
  }
  .presets__hint {
    font-size: 11.5px;
    color: var(--cfg-text-faint);
  }
  .presets__row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .presets__btn {
    padding: 7px 16px;
    font-size: 12.5px;
    color: var(--cfg-text-muted);
    background: var(--cfg-surface-2);
    border: 1px solid var(--cfg-border-strong);
    border-radius: var(--cfg-radius-s);
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }
  .presets__btn:hover {
    color: var(--cfg-text);
    border-color: var(--cfg-accent-strong);
  }
  .presets__btn--on {
    background: var(--cfg-accent-strong);
    border-color: var(--cfg-accent-strong);
    color: #fff;
    font-weight: 600;
  }
</style>
