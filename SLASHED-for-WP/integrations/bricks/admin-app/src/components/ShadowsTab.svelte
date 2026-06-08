<script>
  /**
   * Shadows tab: base opacity strength for derived shadow layers.
   *
   * Bounded to 0..1 since it's an opacity multiplier — anything outside
   * that range produces invisible or fully-opaque shadows.
   */
  import { meta } from '../lib/stores.svelte.js';
  import RangeField from './RangeField.svelte';

  const SECTION = 'shadows';
  const defaults = meta.defaults?.[SECTION] ?? {};
</script>

<section>
  <h2>Shadows</h2>
  <div class="rows">
    <RangeField
      section={SECTION}
      fieldKey="shadow_strength"
      label="Shadow Strength"
      description="Base opacity value for shadow layers (0–1)."
      min={0}
      max={1}
      step={0.01}
      default={defaults.shadow_strength ?? 0.08}
      cssVar="--sf-shadow-strength"
    />
  </div>
</section>

<style>
  h2 { margin-top: 0; }
  .rows {
    border: 1px solid #f0f0f1;
    border-radius: 4px;
    padding: 0 12px;
    background: #fcfcfd;
  }
</style>
