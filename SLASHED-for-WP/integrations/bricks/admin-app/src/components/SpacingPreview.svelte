<script>
  /**
   * Visual spacing scale preview.
   *
   * Renders the 9 spacing steps (2xs → 4xl) as horizontal bars at the
   * interpolated value for the selected viewport width. The slider lets
   * the user scrub between VW_MIN and VW_MAX to see the fluid scale.
   *
   * Formula (matches the framework's generated clamp()):
   *   value = (min + (max - min) * clamp((vw - VW_MIN) / (VW_MAX - VW_MIN), 0, 1)) * spaceScale
   *
   * VW bounds are NOT hardcoded — they come from the Spacing tab's "Fluid
   * Scale Viewport Range" (viewportRangePx, shared with the Typography
   * preview) so scrubbing the slider matches the range the generated
   * clamp() actually interpolates over. Per-step token overrides
   * (space_*_min/max) are preferred over the hardcoded defaults when set.
   */
  import { tokens, meta, viewportRangePx } from '../lib/stores.svelte.js';

  /** Live viewport range (px) sourced from the Spacing viewport fields. */
  const range = $derived(viewportRangePx());

  /** Viewport slider state — starts at desktop width. */
  let vw = $state(viewportRangePx().maxPx);

  // Keep the slider value inside the (possibly edited) range so it never
  // drifts out of bounds when the user changes Min/Max viewport.
  $effect(() => {
    if (vw < range.minPx) vw = range.minPx;
    else if (vw > range.maxPx) vw = range.maxPx;
  });

  const defaults = meta.defaults?.spacing ?? {};
  const defaultSizes = defaults.space_sizes ?? {};

  /**
   * Resolve a single step's min/max, preferring token overrides then
   * falling back to meta defaults.
   */
  function resolveStep(name) {
    const saved = tokens.spacing ?? {};
    const def   = defaultSizes[name] ?? {};

    const minRaw = saved[`space_${name}_min`];
    const maxRaw = saved[`space_${name}_max`];

    const min = minRaw !== undefined && minRaw !== '' ? parseFloat(minRaw) : (def.min ?? 1);
    const max = maxRaw !== undefined && maxRaw !== '' ? parseFloat(maxRaw) : (def.max ?? 1);

    return { min, max };
  }

  const computedSteps = $derived.by(() => {
    const spaceScale = parseFloat(
      tokens.spacing?.space_scale ?? defaults.space_scale ?? 1
    ) || 1;
    const t = Math.max(0, Math.min(1, (vw - range.minPx) / (range.maxPx - range.minPx)));

    const stepNames = ['2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl', '4xl'];
    const maxRef = resolveStep('4xl').max * spaceScale;

    return stepNames.map((name) => {
      const { min, max } = resolveStep(name);
      const sizeRem = (min + (max - min) * t) * spaceScale;
      const barPct = (sizeRem / maxRef) * 100;
      return { name, sizeRem: sizeRem.toFixed(3), barPct: Math.min(barPct, 100) };
    });
  });

  /** Spacing values at current vw for the container card preview. */
  const cardSpacing = $derived.by(() => {
    const spaceScale = parseFloat(tokens.spacing?.space_scale ?? defaults.space_scale ?? 1) || 1;
    const t = Math.max(0, Math.min(1, (vw - range.minPx) / (range.maxPx - range.minPx)));
    const resolve = (name) => {
      const { min, max } = resolveStep(name);
      return ((min + (max - min) * t) * spaceScale).toFixed(3);
    };
    return { xs: resolve('xs'), s: resolve('s'), m: resolve('m'), l: resolve('l') };
  });
</script>

<div class="spacing-preview">
  <div class="spacing-preview__header">
    <p class="spacing-preview__title">Live Scale Preview</p>
    <div class="spacing-preview__slider-wrap">
      <span>{range.minPx}px</span>
      <input
        class="spacing-preview__slider"
        type="range"
        min={range.minPx}
        max={range.maxPx}
        step="1"
        aria-label="Preview viewport width"
        bind:value={vw}
      />
      <span>{range.maxPx}px</span>
      <span class="spacing-preview__vw-label">{vw}px</span>
    </div>
  </div>

  <div class="spacing-preview__rows">
    {#each computedSteps as step (step.name)}
      <div class="spacing-preview__row">
        <span class="spacing-preview__token">--sf-space-{step.name}</span>
        <div class="spacing-preview__bar-wrap">
          <div
            class="spacing-preview__bar"
            style:width="{step.barPct}%"
          ></div>
        </div>
        <span class="spacing-preview__value">{step.sizeRem}rem</span>
      </div>
    {/each}
  </div>

  <!-- Container card showing spacing applied to a real layout -->
  <div class="spacing-preview__card-section">
    <p class="spacing-preview__card-label">Container context at {vw}px</p>
    <div
      class="spacing-preview__card"
      style:padding="{cardSpacing.m}rem"
      style:gap="{cardSpacing.s}rem"
    >
      <div class="spacing-preview__card-row" style:gap="{cardSpacing.s}rem">
        <div class="spacing-preview__card-avatar"></div>
        <div class="spacing-preview__card-meta">
          <div class="spacing-preview__card-title">Card heading</div>
          <div class="spacing-preview__card-sub">padding: {cardSpacing.m}rem</div>
        </div>
      </div>
      <div class="spacing-preview__card-body">
        Body section · gap between rows: {cardSpacing.s}rem
      </div>
      <div class="spacing-preview__card-footer" style:gap="{cardSpacing.xs}rem" style:padding-top="{cardSpacing.xs}rem">
        <div class="spacing-preview__card-tag">tag</div>
        <div class="spacing-preview__card-tag" style:width="3rem">tag 2</div>
        <div class="spacing-preview__card-cta">Action</div>
      </div>
    </div>
  </div>
</div>

<style>
  .spacing-preview {
    background: #fff;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
    padding: 16px 20px;
    margin-top: 16px;
  }

  .spacing-preview__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
  }

  .spacing-preview__title {
    font-size: 13px;
    font-weight: 600;
    color: #1d2327;
    margin: 0;
  }

  .spacing-preview__slider-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #50575e;
  }

  .spacing-preview__slider {
    width: 180px;
    cursor: pointer;
    accent-color: #2271b1;
  }

  .spacing-preview__vw-label {
    min-width: 58px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #1d2327;
    font-weight: 500;
  }

  .spacing-preview__rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .spacing-preview__row {
    display: grid;
    grid-template-columns: 160px 1fr 70px;
    align-items: center;
    gap: 12px;
  }

  .spacing-preview__token {
    font-family: monospace;
    font-size: 11px;
    color: #50575e;
    white-space: nowrap;
  }

  .spacing-preview__bar-wrap {
    background: #f0f0f1;
    border-radius: 2px;
    height: 16px;
    overflow: hidden;
  }

  .spacing-preview__bar {
    height: 100%;
    background: #2271b1;
    border-radius: 2px;
    transition: width 80ms ease;
    min-width: 2px;
  }

  .spacing-preview__value {
    font-size: 11px;
    color: #787c82;
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* ── Container card ─────────────────────────────────────────────── */
  .spacing-preview__card-section {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #e9eaeb;
  }
  .spacing-preview__card-label {
    font-size: 12px;
    font-weight: 600;
    color: #50575e;
    margin: 0 0 10px;
  }
  .spacing-preview__card {
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid #c3c4c7;
    border-radius: 6px;
    max-width: 320px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.07);
  }
  .spacing-preview__card-row {
    display: flex;
    align-items: center;
  }
  .spacing-preview__card-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #2271b1;
    flex-shrink: 0;
  }
  .spacing-preview__card-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .spacing-preview__card-title {
    font-size: 13px;
    font-weight: 600;
    color: #1d2327;
    line-height: 1.2;
  }
  .spacing-preview__card-sub {
    font-size: 11px;
    color: #787c82;
    font-variant-numeric: tabular-nums;
  }
  .spacing-preview__card-body {
    font-size: 12px;
    color: #50575e;
    line-height: 1.5;
    padding: 8px 0;
    border-top: 1px dashed #e9eaeb;
    border-bottom: 1px dashed #e9eaeb;
    font-variant-numeric: tabular-nums;
  }
  .spacing-preview__card-footer {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }
  .spacing-preview__card-tag {
    background: #f0f0f1;
    color: #50575e;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 3px;
    white-space: nowrap;
  }
  .spacing-preview__card-cta {
    margin-left: auto;
    background: #2271b1;
    color: #fff;
    font-size: 11px;
    font-weight: 500;
    padding: 4px 10px;
    border-radius: 3px;
  }
</style>
