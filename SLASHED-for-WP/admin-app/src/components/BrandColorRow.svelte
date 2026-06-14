<script>
  /**
   * Brand color light/dark pair row.
   *
   * Each brand color in SLASHED has a `-light` knob (e.g. --sf-color-primary-light)
   * that the user sets, and an auto-generated dark variant derived via relative
   * OKLCH math. The dark variant can optionally be pinned by setting
   * --sf-color-X-dark.
   *
   * Layout:
   *   [label]  [light swatch | text input]  →  [dark swatch | "auto" or value]  [⟲]
   */
  import { overrides, setOverride, clearOverride } from '../lib/store.svelte.js';
  import { defaultsByName } from '../lib/model.js';
  import { computeAutoDark } from '../lib/brandColors.js';
  import OklchPicker from './OklchPicker.svelte';

  /** @type {{ colorKey: string, label: string }} */
  let { colorKey, label } = $props();

  const lightName = $derived(`--sf-color-${colorKey}-light`);
  const darkName  = $derived(`--sf-color-${colorKey}-dark`);

  const lightDefault = $derived(defaultsByName.get(lightName) ?? '');
  const lightValue   = $derived(overrides[lightName] ?? '');
  const darkOverride = $derived(overrides[darkName]  ?? null);

  /** Effective light value for swatch preview */
  const lightEffective = $derived(lightValue || lightDefault);

  /** Auto-computed dark swatch — null if input can't be parsed (var() etc.) */
  const autoDark = $derived(computeAutoDark(lightEffective, colorKey));

  /** What the dark swatch actually shows */
  const darkEffective = $derived(darkOverride ?? autoDark ?? lightEffective);

  const lightModified = $derived(overrides[lightName] != null);
  const darkModified  = $derived(overrides[darkName]  != null);

  // ── Picker state ─────────────────────────────────────────────────────────
  let pickerMode  = $state(null); // 'light' | 'dark' | null
  let pickerTop   = $state(0);
  let pickerLeft  = $state(0);
  let pickerValue = $state('');
  let lightSwatchEl = $state(null);
  let darkSwatchEl  = $state(null);

  function openPicker(mode, el) {
    if (pickerMode === mode) { pickerMode = null; return; }
    const r = el.getBoundingClientRect();
    const pickerH = 320;
    const below = window.innerHeight - r.bottom;
    pickerTop  = below >= pickerH ? r.bottom + 6 : r.top - pickerH - 6;
    pickerLeft = Math.min(r.left, window.innerWidth - 312);
    pickerValue = mode === 'light' ? (lightValue || lightDefault) : (darkOverride || autoDark || '');
    pickerMode  = mode;
  }

  function onPick(v) {
    if (pickerMode === 'light') setOverride(lightName, v);
    else if (pickerMode === 'dark') setOverride(darkName, v);
  }

  function onInputLight(e) { setOverride(lightName, e.currentTarget.value); }
  function onInputDark(e)  { setOverride(darkName,  e.currentTarget.value); }

  function resetLight() { clearOverride(lightName); }
  function resetDark()  { clearOverride(darkName); }
</script>

<div class="bcr" class:bcr--light-mod={lightModified} class:bcr--dark-mod={darkModified}>
  <span class="bcr__label">{label}</span>

  <!-- Light editor -->
  <div class="bcr__side">
    <button
      class="bcr__swatch"
      style:--probe={lightEffective}
      bind:this={lightSwatchEl}
      onclick={() => openPicker('light', lightSwatchEl)}
      aria-expanded={pickerMode === 'light'}
      title="Edit light-mode {label} color ({lightName})"
      aria-label="Light {label} color picker"
    ></button>
    <input
      class="cfg-input cfg-input--mono bcr__input"
      type="text"
      spellcheck="false"
      value={lightValue}
      placeholder={lightDefault}
      oninput={onInputLight}
      aria-label="{lightName} value"
    />
    {#if lightModified}
      <button
        class="cfg-btn cfg-btn--ghost cfg-btn--icon bcr__reset"
        onclick={resetLight}
        title="Reset to framework default"
        aria-label="Reset {lightName}"
      >⟲</button>
    {/if}
  </div>

  <span class="bcr__arrow" aria-hidden="true">→</span>

  <!-- Dark editor -->
  <div class="bcr__side bcr__side--dark">
    <button
      class="bcr__swatch"
      style:--probe={darkEffective}
      bind:this={darkSwatchEl}
      onclick={() => openPicker('dark', darkSwatchEl)}
      aria-expanded={pickerMode === 'dark'}
      title="{darkModified ? 'Override active — click to edit' : 'Auto-generated — click to pin a custom dark color'} ({darkName})"
      aria-label="Dark {label} color picker"
    ></button>
    {#if darkModified}
      <input
        class="cfg-input cfg-input--mono bcr__input"
        type="text"
        spellcheck="false"
        value={darkOverride}
        placeholder={autoDark ?? ''}
        oninput={onInputDark}
        aria-label="{darkName} value"
      />
      <button
        class="cfg-btn cfg-btn--ghost cfg-btn--icon bcr__reset"
        onclick={resetDark}
        title="Remove dark override — revert to auto-generated"
        aria-label="Reset {darkName}"
      >⟲</button>
    {:else}
      <span class="bcr__auto" title="Auto-derived from the light color via OKLCH. Click the swatch to pin a custom value.">auto</span>
    {/if}
  </div>
</div>

<!-- Floating picker (shared for light and dark) -->
{#if pickerMode}
  <OklchPicker
    value={pickerValue}
    top={pickerTop}
    left={pickerLeft}
    triggerEl={pickerMode === 'light' ? lightSwatchEl : darkSwatchEl}
    onpick={onPick}
    onclose={() => (pickerMode = null)}
  />
{/if}

<style>
  .bcr {
    display: grid;
    grid-template-columns: 80px 1fr 18px 1fr;
    gap: 8px;
    align-items: center;
    padding: 8px 16px;
    border-bottom: 1px solid var(--cfg-border);
    transition: background 0.15s;
  }
  .bcr:hover { background: rgba(255, 255, 255, 0.02); }
  .bcr:last-child { border-bottom: none; }

  /* Modified accent: left bar only when at least one side is overridden */
  .bcr--light-mod,
  .bcr--dark-mod {
    background: linear-gradient(90deg, rgba(79, 140, 255, 0.06), transparent 60%);
    box-shadow: inset 3px 0 0 var(--cfg-accent-strong);
  }

  .bcr__label {
    font-size: 12px;
    font-weight: 600;
    color: var(--cfg-text-muted);
    white-space: nowrap;
  }

  .bcr__side {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .bcr__swatch {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: var(--cfg-radius-s);
    border: 1px solid var(--cfg-border-strong);
    padding: 0;
    cursor: pointer;
    background-image:
      linear-gradient(var(--probe, transparent), var(--probe, transparent)),
      conic-gradient(#444 25%, #2a2a2a 0 50%, #444 0 75%, #2a2a2a 0);
    background-size: cover, 10px 10px;
    transition: box-shadow 0.1s;
  }
  .bcr__swatch:hover { box-shadow: 0 0 0 2px var(--cfg-accent); }
  .bcr__swatch:focus-visible { outline: 2px solid var(--cfg-accent); outline-offset: 1px; }

  .bcr__input {
    flex: 1;
    min-width: 0;
    font-size: 11.5px;
  }

  .bcr__reset {
    flex-shrink: 0;
    font-size: 13px;
    line-height: 1;
  }

  .bcr__arrow {
    font-size: 11px;
    color: var(--cfg-text-faint);
    text-align: center;
  }

  .bcr__auto {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--cfg-text-faint);
    border: 1px solid var(--cfg-border);
    border-radius: 999px;
    padding: 1px 7px;
    line-height: 1.6;
    white-space: nowrap;
    cursor: default;
  }

  @media (max-width: 720px) {
    .bcr {
      grid-template-columns: 60px 1fr 14px 1fr;
      gap: 6px;
      padding: 8px 12px;
    }
  }
  @media (max-width: 500px) {
    /* Stack vertically on phones: light row then dark row */
    .bcr {
      grid-template-columns: 1fr;
      gap: 4px;
    }
    .bcr__label { font-size: 11px; }
    .bcr__arrow { display: none; }
  }
</style>
