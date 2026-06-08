<script>
  /**
   * Modular type-scale generator.
   *
   * Computes min/max rem values for all 12 type steps using a classic
   * modular scale: each step = base * ratio^n, where n is the step index
   * relative to `m` (the body copy size, always at index 0).
   *
   * On "Apply", writes size_*_min / size_*_max into tokens.typography so
   * the TypographyTab rows and the live preview update immediately.
   */
  import { tokens, markDirty } from '../lib/stores.svelte.js';

  /** Named scale ratios common in typographic practice. */
  const RATIOS = [
    { label: 'Minor Second  (1.067)',  value: 1.067 },
    { label: 'Major Second  (1.125)',  value: 1.125 },
    { label: 'Minor Third   (1.200)',  value: 1.200 },
    { label: 'Major Third   (1.250)',  value: 1.250 },
    { label: 'Perfect Fourth (1.333)', value: 1.333 },
    { label: 'Aug. Fourth   (1.414)',  value: 1.414 },
    { label: 'Perfect Fifth (1.500)',  value: 1.500 },
    { label: 'Golden Ratio  (1.618)',  value: 1.618 },
    { label: 'Major Sixth   (1.667)',  value: 1.667 },
    { label: 'Octave        (2.000)',  value: 2.000 },
  ];

  /** Step index relative to `m` (base = 0). */
  const TEXT_STEPS = [
    { name: '2xs',       idx: -4 },
    { name: 'xs',        idx: -3 },
    { name: 's',         idx: -2 },
    { name: 'm',         idx:  0 },
    { name: 'l',         idx:  1 },
    { name: 'xl',        idx:  2 },
    { name: '2xl',       idx:  3 },
    { name: '3xl',       idx:  4 },
    { name: '4xl',       idx:  5 },
    { name: 'display-s', idx:  5 },
    { name: 'display-m', idx:  6 },
    { name: 'display-l', idx:  7 },
  ];

  let baseMin      = $state(1.00);
  let baseMax      = $state(1.25);
  let ratioMobile  = $state(1.250);
  let ratioDesktop = $state(1.333);

  /**
   * Display base multiplier for the display scale relative to the text scale.
   * display-s shares the same step index as 4xl but uses a separate base
   * factor so they can diverge.
   */
  let displayBaseFactor = $state(0.85);

  /** Live preview of computed values at current controls. */
  const preview = $derived(TEXT_STEPS.map(({ name, idx }) => {
    const isDisplay = name.startsWith('display');
    const factor = isDisplay ? displayBaseFactor : 1;
    const min = +(baseMin * factor * Math.pow(ratioMobile, idx)).toFixed(4);
    const max = +(baseMax * factor * Math.pow(ratioDesktop, idx)).toFixed(4);
    return { name, min, max };
  }));

  function apply() {
    if (!tokens.typography) tokens.typography = {};
    for (const { name, min, max } of preview) {
      tokens.typography[`size_${name}_min`] = String(min);
      tokens.typography[`size_${name}_max`] = String(max);
    }
    markDirty();
  }
</script>

<div class="scale-gen">
  <div class="scale-gen__header">
    <span class="scale-gen__title">Scale Generator</span>
    <span class="scale-gen__hint">Computes all step min/max values from a modular scale. Click Apply to write them to the fields below.</span>
  </div>

  <div class="scale-gen__controls">
    <label class="scale-gen__field">
      <span class="scale-gen__label">Base min</span>
      <div class="scale-gen__input-wrap">
        <input type="number" min="0.5" max="2" step="0.01" bind:value={baseMin} />
        <span class="scale-gen__unit">rem</span>
      </div>
    </label>

    <label class="scale-gen__field">
      <span class="scale-gen__label">Base max</span>
      <div class="scale-gen__input-wrap">
        <input type="number" min="0.5" max="3" step="0.01" bind:value={baseMax} />
        <span class="scale-gen__unit">rem</span>
      </div>
    </label>

    <label class="scale-gen__field">
      <span class="scale-gen__label">Ratio (mobile)</span>
      <select bind:value={ratioMobile}>
        {#each RATIOS as r (r.value)}
          <option value={r.value}>{r.label}</option>
        {/each}
      </select>
    </label>

    <label class="scale-gen__field">
      <span class="scale-gen__label">Ratio (desktop)</span>
      <select bind:value={ratioDesktop}>
        {#each RATIOS as r (r.value)}
          <option value={r.value}>{r.label}</option>
        {/each}
      </select>
    </label>

    <label class="scale-gen__field">
      <span class="scale-gen__label">Display offset</span>
      <div class="scale-gen__input-wrap">
        <input type="number" min="0.5" max="1.5" step="0.05" bind:value={displayBaseFactor} />
        <span class="scale-gen__unit">×</span>
      </div>
    </label>
  </div>

  <div class="scale-gen__preview">
    {#each preview as { name, min, max } (name)}
      <div class="scale-gen__step" class:display={name.startsWith('display')}>
        <span class="scale-gen__step-name">{name}</span>
        <span class="scale-gen__step-val">{min.toFixed(3)} / {max.toFixed(3)}</span>
      </div>
    {/each}
  </div>

  <div class="scale-gen__footer">
    <button type="button" class="scale-gen__apply" onclick={apply}>
      Apply to scale
    </button>
  </div>
</div>

<style>
  .scale-gen {
    background: #f6f7f7;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
    padding: 14px 16px;
    margin-bottom: 16px;
  }

  .scale-gen__header {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .scale-gen__title {
    font-size: 12px;
    font-weight: 600;
    color: #1d2327;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .scale-gen__hint {
    font-size: 12px;
    color: #787c82;
  }

  .scale-gen__controls {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: flex-end;
    margin-bottom: 12px;
  }

  .scale-gen__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .scale-gen__label {
    font-size: 11px;
    color: #50575e;
    font-weight: 500;
  }

  .scale-gen__field input[type="number"] {
    width: 68px;
    height: 28px;
    border: 1px solid #8c8f94;
    border-radius: 3px;
    padding: 0 6px;
    font-size: 13px;
    background: #fff;
    color: #1d2327;
  }

  .scale-gen__field select {
    height: 28px;
    border: 1px solid #8c8f94;
    border-radius: 3px;
    padding: 0 4px;
    font-size: 12px;
    background: #fff;
    color: #1d2327;
    cursor: pointer;
  }

  .scale-gen__input-wrap {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .scale-gen__unit {
    font-size: 11px;
    color: #787c82;
  }

  .scale-gen__preview {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    margin-bottom: 12px;
  }

  .scale-gen__step {
    display: flex;
    gap: 4px;
    font-size: 11px;
    color: #50575e;
    font-family: ui-monospace, monospace;
  }

  .scale-gen__step.display {
    color: #2271b1;
  }

  .scale-gen__step-name {
    font-weight: 600;
    min-width: 52px;
  }

  .scale-gen__step-val {
    color: #787c82;
  }

  .scale-gen__footer {
    display: flex;
    justify-content: flex-end;
  }

  .scale-gen__apply {
    background: #2271b1;
    color: white;
    border: none;
    border-radius: 3px;
    padding: 6px 14px;
    font-size: 13px;
    cursor: pointer;
  }

  .scale-gen__apply:hover {
    background: #135e96;
  }
</style>
