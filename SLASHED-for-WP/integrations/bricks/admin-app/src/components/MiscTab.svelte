<script>
  /**
   * Misc tab: consolidates Radius, Shadows, Motion, Z-Index, and Contrast.
   *
   * Basic section (always visible): Radius scale, Shadow strength, Motion
   * scale, and Accessibility / focus-ring controls — plus live previews.
   *
   * Advanced section (collapsible): glow color, motion durations, z-index
   * layers, and full contrast fine-tuning.
   */
  import { tokens, meta } from '../lib/stores.svelte.js';
  import NumberField from './NumberField.svelte';
  import RangeField from './RangeField.svelte';
  import SelectField from './SelectField.svelte';
  import TextField from './TextField.svelte';
  import AdvancedSection from './AdvancedSection.svelte';

  const radiusDefaults  = meta.defaults?.radius   ?? {};
  const shadowDefaults  = meta.defaults?.shadows  ?? {};
  const motionDefaults  = meta.defaults?.motion   ?? {};
  const zindexDefaults  = meta.defaults?.zindex   ?? {};
  const contrastDefaults = meta.defaults?.contrast ?? {};

  const durations = motionDefaults.durations ?? {};

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ── Radius preview ───────────────────────────────────────────────────────────
  /** Base radius values (in px) for each named step. */
  const RADIUS_BASES = [0, 2, 4, 8, 12, 16, 24, 9999];
  const RADIUS_LABELS = ['none', 'xs', 's', 'm', 'l', 'xl', '2xl', 'full'];

  const radiusScale = $derived(
    parseFloat(tokens.radius?.radius_scale ?? meta.defaults?.radius?.radius_scale ?? 1)
  );
  const radiusValues = $derived(RADIUS_BASES.map((base) => base * radiusScale));

  // ── Shadow preview ────────────────────────────────────────────────────────────
  const shadowStrength = $derived(
    parseFloat(tokens.shadows?.shadow_strength ?? shadowDefaults.shadow_strength ?? 0.08)
  );

  // ── Motion preview ────────────────────────────────────────────────────────
  const motionScale = $derived(
    parseFloat(tokens.motion?.motion_scale ?? motionDefaults.motion_scale ?? 1) || 1
  );

  const DURATION_STEPS = ['instant', 'fast', 'normal', 'slow', 'slower'];

  const durationMs = $derived(
    DURATION_STEPS.map((name) => {
      const saved = tokens.motion?.[`duration_${name}`];
      const base = saved !== undefined && saved !== ''
        ? parseFloat(saved)
        : parseFloat(durations[name] ?? 0);
      return { name, ms: Math.round(base * motionScale) };
    })
  );

  // ── Focus ring preview ────────────────────────────────────────────────────
  const numField = (saved, fallback) =>
    saved !== undefined && saved !== '' ? parseFloat(saved) : parseFloat(fallback);
  const focusRingWidth  = $derived(
    numField(tokens.contrast?.focus_ring_width,  contrastDefaults.focus_ring_width  ?? 2)
  );
  const focusRingOffset = $derived(
    numField(tokens.contrast?.focus_ring_offset, contrastDefaults.focus_ring_offset ?? 2)
  );
  const focusRingStyle  = $derived(
    tokens.contrast?.focus_ring_style ?? contrastDefaults.focus_ring_style ?? 'solid'
  );

  const shadowPreviews = $derived([
    {
      label: 'xs',
      shadow: `0 1px 2px 0 rgba(0,0,0,${(shadowStrength * 0.5).toFixed(4)})`,
    },
    {
      label: 's',
      shadow: `0 1px 2px 0 rgba(0,0,0,${(shadowStrength * 0.5).toFixed(4)}), 0 2px 6px 0 rgba(0,0,0,${shadowStrength.toFixed(4)})`,
    },
    {
      label: 'm',
      shadow: `0 1px 3px 0 rgba(0,0,0,${(shadowStrength * 0.5).toFixed(4)}), 0 4px 12px 0 rgba(0,0,0,${(shadowStrength * 2).toFixed(4)})`,
    },
    {
      label: 'l',
      shadow: `0 2px 4px 0 rgba(0,0,0,${(shadowStrength * 0.5).toFixed(4)}), 0 8px 24px 0 rgba(0,0,0,${(shadowStrength * 3).toFixed(4)})`,
    },
    {
      label: 'xl',
      shadow: `0 2px 8px 0 rgba(0,0,0,${(shadowStrength * 0.5).toFixed(4)}), 0 12px 36px 0 rgba(0,0,0,${(shadowStrength * 3.5).toFixed(4)})`,
    },
    {
      label: 'glow',
      shadow: `0 0 15px 2px rgba(74,48,208,${Math.min(shadowStrength * 2, 0.7).toFixed(4)})`,
    },
  ]);
</script>

<section>
  <!-- ── Radius ─────────────────────────────────────────────────────────── -->
  <h2>Radius</h2>
  <div class="rows">
    <NumberField
      section="radius"
      fieldKey="radius_scale"
      label="Radius Scale"
      min={0}
      step={0.1}
      default={radiusDefaults.radius_scale ?? 1}
      cssVar="--sf-radius-scale"
    />
  </div>

  <!-- Radius preview -->
  <div class="radius-preview">
    {#each radiusValues as r, i (RADIUS_LABELS[i])}
      <div class="radius-preview__item">
        <div
          class="radius-preview__swatch"
          style:border-radius="{RADIUS_BASES[i] === 9999 ? '9999px' : `${r}px`}"
        ></div>
        <span class="radius-preview__label">{RADIUS_LABELS[i]}</span>
      </div>
    {/each}
  </div>

  <!-- ── Shadows ────────────────────────────────────────────────────────── -->
  <h2 class="group-heading">Shadows</h2>
  <div class="rows">
    <RangeField
      section="shadows"
      fieldKey="shadow_strength"
      label="Shadow Strength"
      description="Base opacity for shadow layers (0–1)."
      min={0}
      max={1}
      step={0.01}
      default={shadowDefaults.shadow_strength ?? 0.08}
      cssVar="--sf-shadow-strength"
    />
  </div>

  <!-- Shadow preview -->
  <div class="shadow-preview">
    {#each shadowPreviews as s (s.label)}
      <div class="shadow-preview__item">
        <div class="shadow-preview__card" style:box-shadow={s.shadow}>
          {s.label}
        </div>
      </div>
    {/each}
  </div>

  <!-- ── Motion ─────────────────────────────────────────────────────────── -->
  <h2 class="group-heading">Motion</h2>
  <div class="rows">
    <NumberField
      section="motion"
      fieldKey="motion_scale"
      label="Motion Scale"
      min={0}
      step={0.1}
      default={motionDefaults.motion_scale ?? 1}
      cssVar="--sf-motion-scale"
    />
  </div>

  <!-- Motion preview -->
  <div class="motion-preview">
    {#each durationMs as d (d.name)}
      <div class="motion-preview__item">
        <span class="motion-preview__label">{d.name}</span>
        <div class="motion-preview__track">
          <div class="motion-preview__fill" style:animation-duration="{d.ms}ms"></div>
        </div>
        <span class="motion-preview__ms">{d.ms}ms</span>
      </div>
    {/each}
  </div>

  <!-- ── Accessibility ──────────────────────────────────────────────────── -->
  <h2 class="group-heading">Accessibility</h2>
  <div class="rows">
    <RangeField
      section="contrast"
      fieldKey="focus_ring_width"
      label="Focus Ring Width"
      min={0}
      max={8}
      step={0.5}
      default={contrastDefaults.focus_ring_width ?? 2}
      cssVar="--sf-focus-ring-width"
      unit="px"
    />
    <RangeField
      section="contrast"
      fieldKey="focus_ring_offset"
      label="Focus Ring Offset"
      min={0}
      max={8}
      step={0.5}
      default={contrastDefaults.focus_ring_offset ?? 2}
      cssVar="--sf-focus-ring-offset"
      unit="px"
    />
    <SelectField
      section="contrast"
      fieldKey="focus_ring_style"
      label="Focus Ring Style"
      options={['solid', 'dashed', 'dotted', 'double', 'none']}
      default={contrastDefaults.focus_ring_style ?? 'solid'}
      cssVar="--sf-focus-ring-style"
    />
  </div>

  <!-- Focus ring preview -->
  <div class="focus-ring-preview">
    <button
      class="focus-ring-preview__btn"
      style:--fp-width="{focusRingWidth}px"
      style:--fp-offset="{focusRingOffset}px"
      style:--fp-style={focusRingStyle}
    >Tab to me</button>
    <span class="focus-ring-preview__desc">
      {focusRingWidth}px {focusRingStyle} · {focusRingOffset}px offset
    </span>
  </div>

  <!-- ── Advanced ───────────────────────────────────────────────────────── -->
  <AdvancedSection>
    <!-- Shadow: glow color -->
    <h2 class="group-heading">Shadow</h2>
    <div class="rows">
      <TextField
        section="shadows"
        fieldKey="glow_color"
        label="Glow Color"
        default={shadowDefaults.glow_color ?? 'var(--sf-color-primary)'}
        cssVar="--sf-shadow-glow-color"
        mono
      />
    </div>

    <!-- Motion: durations -->
    <h2 class="group-heading">Motion — Durations</h2>
    <p class="hint">Base duration values in milliseconds.</p>
    <div class="rows">
      {#each Object.entries(durations) as [name, defaultMs] (name)}
        <NumberField
          section="motion"
          fieldKey={`duration_${name}`}
          label={cap(name)}
          min={0}
          step={10}
          default={defaultMs}
          cssVar={`--sf-duration-${name}`}
          unit="ms"
        />
      {/each}
    </div>

    <!-- Z-Index -->
    <h2 class="group-heading">Z-Index</h2>
    <p class="hint">Z-index layer values for stacking context management.</p>
    <div class="rows">
      {#each Object.entries(zindexDefaults) as [name, defaultValue] (name)}
        <NumberField
          section="zindex"
          fieldKey={name}
          label={cap(name)}
          step={1}
          default={defaultValue}
          cssVar={`--sf-z-${name}`}
        />
      {/each}
    </div>

    <!-- Contrast fine-tuning -->
    <h2 class="group-heading">Contrast</h2>
    <div class="rows">
      <RangeField
        section="contrast"
        fieldKey="contrast_bias"
        label="Contrast Bias"
        description="Shifts derived shades up (positive) or down (negative)."
        min={-0.2}
        max={0.2}
        step={0.01}
        default={contrastDefaults.contrast_bias ?? 0}
        cssVar="--sf-contrast-bias"
      />
      <RangeField
        section="contrast"
        fieldKey="contrast_threshold"
        label="Contrast Threshold"
        description="Lightness threshold for text-on-color (white vs. black)."
        min={0}
        max={1}
        step={0.01}
        default={contrastDefaults.contrast_threshold ?? 0.6}
        cssVar="--sf-contrast-threshold"
      />
      <RangeField
        section="contrast"
        fieldKey="opacity_disabled"
        label="Disabled Opacity"
        min={0}
        max={1}
        step={0.01}
        default={contrastDefaults.opacity_disabled ?? 0.45}
        cssVar="--sf-opacity-disabled"
      />
    </div>
  </AdvancedSection>
</section>

<style>
  h2 { margin-top: 0; }
  .group-heading { margin-top: 24px; }
  .hint { color: #50575e; margin-bottom: 16px; max-width: 720px; font-size: 13px; }
  .rows {
    border: 1px solid #f0f0f1;
    border-radius: 4px;
    padding: 0 12px;
    background: #fcfcfd;
  }

  /* ── Radius preview ────────────────────────────────────────────────── */
  .radius-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-top: 12px;
    padding: 16px;
    background: #fff;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
  }
  .radius-preview__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .radius-preview__swatch {
    width: 40px;
    height: 40px;
    background: #2271b1;
  }
  .radius-preview__label {
    font-size: 10px;
    color: #50575e;
    text-align: center;
  }

  /* ── Motion preview ───────────────────────────────────────────────── */
  @keyframes slashed-mp-fill {
    0%   { width: 0; }
    50%  { width: 100%; }
    100% { width: 0; }
  }

  .motion-preview {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
    padding: 16px;
    background: #fff;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
  }
  .motion-preview__item {
    display: grid;
    grid-template-columns: 60px 1fr 56px;
    align-items: center;
    gap: 10px;
  }
  .motion-preview__label {
    font-size: 11px;
    font-weight: 600;
    color: #50575e;
    text-align: right;
  }
  .motion-preview__track {
    height: 6px;
    background: #f0f0f1;
    border-radius: 3px;
    overflow: hidden;
  }
  .motion-preview__fill {
    height: 100%;
    background: #2271b1;
    border-radius: 3px;
    animation: slashed-mp-fill ease-in-out infinite;
  }
  .motion-preview__ms {
    font-size: 11px;
    color: #8c8f94;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  /* ── Focus ring preview ─────────────────────────────────────────────── */
  .focus-ring-preview {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
    padding: 16px;
    background: #fff;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
  }
  .focus-ring-preview__btn {
    padding: 7px 16px;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
    background: #f0f0f1;
    color: #1d2327;
    cursor: pointer;
    font-size: 13px;
  }
  .focus-ring-preview__btn:focus-visible {
    outline-width: var(--fp-width, 2px);
    outline-offset: var(--fp-offset, 2px);
    outline-style: var(--fp-style, solid);
    outline-color: #2271b1;
  }
  .focus-ring-preview__desc {
    font-size: 12px;
    color: #50575e;
    font-family: monospace;
  }

  /* ── Shadow preview ────────────────────────────────────────────────── */
  .shadow-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    margin-top: 12px;
    padding: 20px 16px;
    background: #fff;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
  }
  .shadow-preview__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .shadow-preview__card {
    width: 60px;
    height: 60px;
    background: #fff;
    border: 1px solid #f0f0f1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: #50575e;
    border-radius: 4px;
  }
</style>
