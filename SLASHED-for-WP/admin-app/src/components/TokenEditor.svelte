<script>
  /**
   * One token's editor cell. Picks the right control from the inferred meta:
   *   - color    → swatch button + popover OKLCH picker + free-text fallback
   *   - font fam → System-stack picker | manual input + live preview
   *   - number   → number input
   *   - length   → slider + numeric input + unit chip (with raw-text fallback
   *                for calc()/clamp() power-users)
   *   - text     → mono text input
   */
  import { overrides, setOverride, dragSetOverride, endDrag } from '../lib/store.svelte.js';
  import { inferControl } from '../lib/model.js';
  import { SYSTEM_STACKS, detectSystemStack, isFontFamilyToken } from '../lib/fonts.js';
  import { parseLength, boundsFor, formatLength, decimalsFor, clamp } from '../lib/length.js';
  import OklchPicker from './OklchPicker.svelte';

  let { token } = $props();

  const meta = $derived(inferControl(token));
  const current = $derived(overrides[token.name] ?? '');

  // ── Font-family tokens get a System-stack picker + live preview ─────────
  const isFont = $derived(isFontFamilyToken(token));
  const effective = $derived(current || token.value || '');
  let userSource = $state(null);
  const fontSource = $derived(userSource ?? (detectSystemStack(effective) ? 'system' : 'manual'));
  function onSystemPick(e) { setOverride(token.name, e.currentTarget.value); }

  /** @param {Event} e */
  function onInput(e) {
    setOverride(token.name, e.currentTarget.value);
  }

  // ── Color picker ──────────────────────────────────────────────────────────
  let pickerOpen = $state(false);
  let pickerTop = $state(0);
  let pickerLeft = $state(0);
  let swatchEl = $state(null);

  function togglePicker() {
    if (pickerOpen) { pickerOpen = false; return; }
    if (swatchEl) {
      const r = swatchEl.getBoundingClientRect();
      const pickerHeight = 320;
      const spaceBelow = window.innerHeight - r.bottom;
      pickerTop = spaceBelow >= pickerHeight ? r.bottom + 6 : r.top - pickerHeight - 6;
      pickerLeft = Math.min(r.left, window.innerWidth - 312);
    }
    pickerOpen = true;
  }

  function onPick(v) { setOverride(token.name, v); }

  // ── Length slider state ──────────────────────────────────────────────────
  // Parse the active value (override → default fallback). When the value is a
  // single number+unit pair the slider drives it; when it's a calc()/clamp()
  // expression `parsed` is null and we silently fall back to a plain text
  // editor (or the user can flip to "raw" mode and stay there).
  let rawMode = $state(false);
  const parsedDefault = $derived(parseLength(token.value));
  const parsedActive = $derived(parseLength(current || token.value));
  const sliderUnit = $derived(parsedActive?.unit ?? parsedDefault?.unit ?? meta.unit ?? '');
  const sliderBounds = $derived(boundsFor(sliderUnit));
  const sliderValue = $derived(parsedActive ? clamp(parsedActive.number, sliderBounds) : parsedDefault?.number ?? 0);
  const sliderDisabled = $derived(!parsedActive && current.trim() !== '');
  const sliderDecimals = $derived(decimalsFor(sliderBounds.step));
  // Filled-track visual: percentage of the slider's range the thumb sits at.
  const sliderProgress = $derived.by(() => {
    const range = sliderBounds.max - sliderBounds.min;
    if (range <= 0) return 0;
    return Math.max(0, Math.min(100, ((sliderValue - sliderBounds.min) / range) * 100));
  });

  function onSlider(e) {
    const n = parseFloat(e.currentTarget.value);
    if (!Number.isFinite(n)) return;
    // Drag-tick mutation: live preview updates but no history/persist churn.
    // The slider's `change` event fires `flushSlider` once on commit.
    dragSetOverride(token.name, formatLength(n, sliderUnit));
  }
  function onSliderNumber(e) {
    const n = parseFloat(e.currentTarget.value);
    if (!Number.isFinite(n)) return;
    dragSetOverride(token.name, formatLength(clamp(n, sliderBounds), sliderUnit));
  }
  /** Drag-end / commit handler — records exactly one history step + one persist. */
  function flushSlider() { endDrag(); }
</script>

<div class="editor" class:editor--color={meta.control === 'color'} class:editor--font={isFont}>
  {#if isFont}
    <div class="font">
      <div class="font__top">
        <div class="cfg-seg font__seg" role="group" aria-label="Font source">
          <button
            class="cfg-seg__btn"
            class:cfg-seg__btn--on={fontSource === 'system'}
            aria-pressed={fontSource === 'system'}
            onclick={() => (userSource = 'system')}
            type="button"
          >System</button>
          <button
            class="cfg-seg__btn"
            class:cfg-seg__btn--on={fontSource === 'manual'}
            aria-pressed={fontSource === 'manual'}
            onclick={() => (userSource = 'manual')}
            type="button"
          >Manual</button>
        </div>
        {#if fontSource === 'system'}
          <select
            class="cfg-select font__select"
            value={detectSystemStack(effective)?.value ?? ''}
            onchange={onSystemPick}
            aria-label="{token.name} system stack"
          >
            <option value="" disabled>Choose a system stack…</option>
            {#each SYSTEM_STACKS as s (s.value)}
              <option value={s.value}>{s.label}</option>
            {/each}
          </select>
        {:else}
          <input
            class="cfg-input cfg-input--mono"
            type="text"
            spellcheck="false"
            value={current}
            placeholder={token.value}
            oninput={onInput}
            aria-label="{token.name} value"
          />
        {/if}
      </div>
      {#if effective}
        <span class="font__preview" style="font-family: {effective}">Ag — The quick brown fox jumps</span>
      {/if}
    </div>
  {:else if meta.control === 'color'}
    <button
      class="editor__swatch"
      bind:this={swatchEl}
      style:--probe={current || token.value}
      onclick={togglePicker}
      title="Open color picker"
      aria-label="{token.name} color picker"
      aria-expanded={pickerOpen}
    ></button>

    {#if pickerOpen}
      <OklchPicker
        value={current || token.value || ''}
        top={pickerTop}
        left={pickerLeft}
        triggerEl={swatchEl}
        onpick={onPick}
        onclose={() => (pickerOpen = false)}
      />
    {/if}

    <input
      class="cfg-input cfg-input--mono"
      type="text"
      spellcheck="false"
      value={current}
      placeholder={token.value}
      oninput={onInput}
      aria-label="{token.name} value"
    />
  {:else if meta.control === 'number'}
    <input
      class="cfg-input"
      type="number"
      step="any"
      value={current}
      placeholder={token.value}
      oninput={onInput}
      aria-label="{token.name} value"
    />
  {:else if meta.control === 'length' && parsedDefault && !rawMode}
    <!-- Slider + number combo. The slider's filled track uses --p so the
         "fill" matches the current thumb position. -->
    <input
      class="len__slider"
      type="range"
      min={sliderBounds.min}
      max={sliderBounds.max}
      step={sliderBounds.step}
      value={sliderValue}
      style:--p="{sliderProgress}%"
      oninput={onSlider}
      onchange={flushSlider}
      disabled={sliderDisabled}
      aria-label="{token.name} slider"
      title={sliderDisabled ? 'Slider disabled — value is not a single number+unit. Click "raw" to edit as text.' : `Drag — range ${sliderBounds.min}${sliderUnit} … ${sliderBounds.max}${sliderUnit}`}
    />
    <input
      class="cfg-input cfg-input--mono len__num"
      type="number"
      min={sliderBounds.min}
      max={sliderBounds.max}
      step={sliderBounds.step}
      value={parsedActive ? Number(sliderValue.toFixed(sliderDecimals)) : ''}
      placeholder={parsedDefault.number}
      oninput={onSliderNumber}
      onchange={flushSlider}
      onblur={flushSlider}
      aria-label="{token.name} numeric value"
    />
    {#if sliderUnit}<span class="editor__unit">{sliderUnit}</span>{/if}
    <button
      type="button"
      class="cfg-btn cfg-btn--ghost cfg-btn--sm len__raw"
      onclick={() => (rawMode = true)}
      title="Switch to raw text — type calc(), clamp(), var() etc."
    >raw</button>
  {:else if meta.control === 'length'}
    <input
      class="cfg-input cfg-input--mono"
      type="text"
      spellcheck="false"
      value={current}
      placeholder={token.value}
      oninput={onInput}
      aria-label="{token.name} value"
    />
    {#if meta.unit}<span class="editor__unit">{meta.unit}</span>{/if}
    {#if parsedDefault}
      <button
        type="button"
        class="cfg-btn cfg-btn--ghost cfg-btn--sm len__raw"
        onclick={() => (rawMode = false)}
        title="Switch back to slider"
      >slider</button>
    {/if}
  {:else}
    <input
      class="cfg-input cfg-input--mono"
      type="text"
      spellcheck="false"
      value={current}
      placeholder={token.value}
      oninput={onInput}
      aria-label="{token.name} value"
    />
  {/if}
</div>

<style>
  .editor {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
  .editor :global(.cfg-input) { flex: 1; min-width: 0; }
  .editor--font { align-items: stretch; }
  .font {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }
  .font__top {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .font__seg { flex-shrink: 0; }
  .font__select { flex: 1; min-width: 0; }
  .font__preview {
    font-size: 14px;
    color: var(--cfg-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-top: 4px;
    border-top: 1px dashed var(--cfg-border);
  }
  .editor__swatch {
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: var(--cfg-radius-s);
    border: 1px solid var(--cfg-border-strong);
    padding: 0;
    cursor: pointer;
    background-image:
      linear-gradient(var(--probe, transparent), var(--probe, transparent)),
      conic-gradient(#444 25%, #2a2a2a 0 50%, #444 0 75%, #2a2a2a 0);
    background-size: cover, 12px 12px;
    transition: box-shadow 0.1s, border-color 0.1s;
  }
  .editor__swatch:hover { box-shadow: 0 0 0 2px var(--cfg-accent); }
  .editor__unit {
    color: var(--cfg-text-faint);
    font-family: var(--cfg-mono);
    font-size: 12px;
    min-width: 24px;
    text-align: left;
  }

  /* ── Length slider ─────────────────────────────────────────────────────── */
  .len__slider {
    -webkit-appearance: none;
    appearance: none;
    flex: 1 1 90px;
    min-width: 60px;
    height: 6px;
    margin: 0;
    border-radius: 3px;
    background:
      linear-gradient(to right, var(--cfg-accent-strong) 0, var(--cfg-accent-strong) var(--p, 0%), var(--cfg-surface-3) var(--p, 0%), var(--cfg-surface-3) 100%);
    cursor: pointer;
    border: none;
    outline: none;
  }
  .len__slider:focus-visible { box-shadow: 0 0 0 3px var(--cfg-accent-soft); }
  .len__slider:disabled { opacity: 0.45; cursor: not-allowed; }
  .len__slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px; height: 14px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid var(--cfg-accent-strong);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    cursor: pointer;
  }
  .len__slider::-moz-range-thumb {
    width: 14px; height: 14px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid var(--cfg-accent-strong);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    cursor: pointer;
  }
  .len__num {
    flex: 0 0 70px;
    text-align: right;
  }
  .len__raw {
    flex-shrink: 0;
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* On narrow phones, shrink the number spinbox slightly so the slider gets
     more room. The "raw" button stays visible — hiding it would lock users out
     when the slider is disabled (e.g. an existing calc()/clamp() override). */
  @media (max-width: 600px) {
    .len__num { flex: 0 0 58px; }
  }
</style>
