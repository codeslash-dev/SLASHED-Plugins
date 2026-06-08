<script>
  /**
   * Contrast / opacity / focus-ring fine-tuning.
   *
   * Three visual groups (Contrast, Opacity, Focus ring) with five numeric
   * sliders and one focus-ring-style select. Defaults come from
   * `Slashed_Token_Defaults::get_contrast()` via the hydration
   * payload — the Svelte side never duplicates a default value.
   */
  import { meta } from '../lib/stores.svelte.js';
  import RangeField from './RangeField.svelte';
  import SelectField from './SelectField.svelte';

  const SECTION = 'contrast';
  const defaults = meta.defaults?.[SECTION] ?? {};
</script>

<section>
  <h2>Contrast</h2>
  <p class="hint">
    Fine-tune how the framework derives shades and picks readable text colors against your brand colors.
  </p>

  <div class="rows">
    <RangeField
      section={SECTION}
      fieldKey="contrast_bias"
      label="Contrast bias"
      description="Shifts every derived shade up (positive) or down (negative). Useful to brighten or dim the entire scale without re-picking source colors."
      min={-0.2}
      max={0.2}
      step={0.01}
      default={defaults.contrast_bias ?? 0}
      cssVar="--sf-contrast-bias"
    />
    <RangeField
      section={SECTION}
      fieldKey="contrast_threshold"
      label="Contrast threshold"
      description="Lightness threshold used to pick text-on-color (white vs. black). Lower values prefer dark text on more colors; higher values prefer white text."
      min={0}
      max={1}
      step={0.01}
      default={defaults.contrast_threshold ?? 0.6}
      cssVar="--sf-contrast-threshold"
    />
  </div>

  <h2 class="group-heading">Opacity</h2>
  <div class="rows">
    <RangeField
      section={SECTION}
      fieldKey="opacity_disabled"
      label="Disabled opacity"
      description="Opacity applied to disabled UI elements (buttons, inputs, links)."
      min={0}
      max={1}
      step={0.01}
      default={defaults.opacity_disabled ?? 0.45}
      cssVar="--sf-opacity-disabled"
    />
  </div>

  <h2 class="group-heading">Focus ring</h2>
  <p class="hint">
    Visual indicator drawn around keyboard-focused elements. Lower the offset to tighten the ring, raise it to give the element more breathing room.
  </p>

  <div class="rows">
    <RangeField
      section={SECTION}
      fieldKey="focus_ring_width"
      label="Ring width"
      min={0}
      max={8}
      step={0.5}
      default={defaults.focus_ring_width ?? 2}
      cssVar="--sf-focus-ring-width"
      unit="px"
    />
    <RangeField
      section={SECTION}
      fieldKey="focus_ring_offset"
      label="Ring offset"
      min={0}
      max={8}
      step={0.5}
      default={defaults.focus_ring_offset ?? 2}
      cssVar="--sf-focus-ring-offset"
      unit="px"
    />
    <SelectField
      section={SECTION}
      fieldKey="focus_ring_style"
      label="Ring style"
      options={['solid', 'dashed', 'dotted', 'double', 'none']}
      default={defaults.focus_ring_style ?? 'solid'}
      cssVar="--sf-focus-ring-style"
    />
  </div>
</section>

<style>
  h2 { margin-top: 0; }
  .group-heading { margin-top: 24px; }
  .hint { color: #50575e; margin-bottom: 16px; max-width: 720px; }
  .rows {
    border: 1px solid #f0f0f1;
    border-radius: 4px;
    padding: 0 12px;
    background: #fcfcfd;
  }
</style>
