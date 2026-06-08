<script>
  /**
   * Radius tab: just the global radius scale multiplier.
   *
   * The framework derives every named radius (`--sf-radius-s`, `-m`, `-l`,
   * etc.) from this one knob, so a single number field is enough.
   */
  import { meta } from '../lib/stores.svelte.js';
  import NumberField from './NumberField.svelte';

  const SECTION = 'radius';
  const defaults = meta.defaults?.[SECTION] ?? {};
</script>

<section>
  <h2>Radius</h2>
  <div class="rows">
    <NumberField
      section={SECTION}
      fieldKey="radius_scale"
      label="Radius Scale"
      min={0}
      step={0.1}
      default={defaults.radius_scale ?? 1}
      cssVar="--sf-radius-scale"
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
