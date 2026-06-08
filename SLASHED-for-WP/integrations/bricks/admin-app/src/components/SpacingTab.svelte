<script>
  /**
   * Spacing tab: scale multiplier, per-step fluid sizes, and named aliases.
   *
   * Basic: space_scale multiplier (the one knob that scales everything).
   * Advanced: fluid viewport range, per-step min/max overrides, and the
   *           5 named alias fields (gutter, gap, etc.) — expert fine-tuning.
   */
  import { meta } from '../lib/stores.svelte.js';
  import NumberField from './NumberField.svelte';
  import TextField from './TextField.svelte';
  import AdvancedSection from './AdvancedSection.svelte';
  import SpacingPreview from './SpacingPreview.svelte';

  const SECTION = 'spacing';
  const defaults = meta.defaults?.[SECTION] ?? {};
  const spaceSizes = defaults.space_sizes ?? {};

  const aliases = [
    { key: 'gutter',        label: 'Gutter',        cssVar: '--sf-space-gutter' },
    { key: 'gap',           label: 'Gap',           cssVar: '--sf-gap' },
    { key: 'content_gap',   label: 'Content Gap',   cssVar: '--sf-content-gap' },
    { key: 'component_pad', label: 'Component Pad', cssVar: '--sf-component-pad' },
    { key: 'section_pad',   label: 'Section Pad',   cssVar: '--sf-section-pad' },
  ];
</script>

<section>
  <h2>Spacing</h2>
  <p class="hint">
    The <code>Space Scale</code> multiplier scales every spacing token at once — the quickest
    way to make a whole site more or less airy. Fine-grained per-step overrides, the fluid
    viewport range, and named aliases live under Advanced.
  </p>
  <div class="rows">
    <NumberField
      section={SECTION}
      fieldKey="space_scale"
      label="Space Scale"
      min={0}
      step={0.05}
      default={defaults.space_scale ?? 1}
      cssVar="--sf-space-scale"
    />
  </div>

  <SpacingPreview />

  <AdvancedSection>
    <h2 class="group-heading">Fluid Scale Viewport Range</h2>
    <p class="hint">
      The viewport width range (in <code>rem</code>) used to compute all fluid <code>clamp()</code>
      formulas for custom-overridden spacing and typography values. Default: <strong>22.5 rem</strong>
      (360 px) → <strong>90 rem</strong> (1440 px). Changing these only affects values you explicitly
      override below or in the Typography tab — the framework's built-in scale uses the same defaults
      and is unaffected.
    </p>
    <div class="rows">
      <NumberField
        section={SECTION}
        fieldKey="viewport_min"
        label="Min viewport (rem)"
        min={10}
        max={60}
        step={0.5}
        default={defaults.viewport_min ?? 22.5}
      />
      <NumberField
        section={SECTION}
        fieldKey="viewport_max"
        label="Max viewport (rem)"
        min={40}
        max={200}
        step={0.5}
        default={defaults.viewport_max ?? 90}
      />
    </div>

    <h2 class="group-heading">Space Scale Steps</h2>
    <p class="hint">
      Min and max values in <code>rem</code> for fluid spacing via <code>clamp()</code>.
      Leave both fields blank to use the framework defaults.
    </p>
    <div class="rows">
      {#each Object.entries(spaceSizes) as [name, sizeDefaults] (name)}
        <div class="size-row">
          <div class="size-row__label">
            <span class="size-row__name">{name}</span>
            <code class="size-row__var">--sf-space-{name}</code>
          </div>
          <div class="size-row__inputs">
            <NumberField
              section={SECTION}
              fieldKey={`space_${name}_min`}
              label="Min"
              min={0}
              step={0.01}
              default={sizeDefaults.min}
              width="80px"
            />
            <NumberField
              section={SECTION}
              fieldKey={`space_${name}_max`}
              label="Max"
              min={0}
              step={0.01}
              default={sizeDefaults.max}
              width="80px"
            />
          </div>
        </div>
      {/each}
    </div>

    <h2 class="group-heading">Space Aliases</h2>
    <div class="rows">
      {#each aliases as alias (alias.key)}
        <TextField
          section={SECTION}
          fieldKey={alias.key}
          label={alias.label}
          default={defaults[alias.key] ?? ''}
          cssVar={alias.cssVar}
          mono
        />
      {/each}
    </div>
  </AdvancedSection>
</section>

<style>
  h2 { margin-top: 0; }
  .group-heading { margin-top: 24px; }
  .hint { color: #50575e; margin-bottom: 16px; max-width: 720px; }
  .hint code {
    background: #f0f0f1;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 90%;
  }
  .rows {
    border: 1px solid #f0f0f1;
    border-radius: 4px;
    padding: 0 12px;
    background: #fcfcfd;
  }
  .size-row {
    display: grid;
    grid-template-columns: 220px 1fr;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f1;
  }
  .size-row:last-child { border-bottom: none; }
  .size-row__name {
    font-weight: 500;
    color: #1d2327;
    display: block;
  }
  .size-row__var {
    display: inline-block;
    margin-top: 4px;
    background: #f6f7f7;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 11px;
    color: #50575e;
  }
  .size-row__inputs {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  .size-row__inputs :global(.row) {
    display: flex !important;
    grid-template-columns: none;
    gap: 6px;
    padding: 0;
    border: none;
    align-items: center;
  }
  .size-row__inputs :global(.row__label-text),
  .size-row__inputs :global(.row__label label) {
    font-weight: 400;
    color: #50575e;
    font-size: 12px;
  }
</style>
