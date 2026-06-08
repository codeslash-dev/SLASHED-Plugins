<script>
  /**
   * Motion tab: global scale multiplier + named duration tokens.
   *
   * Durations are stored as plain numbers in milliseconds; the framework
   * converts them to `<n>ms` strings at CSS-emit time. Storage keys follow
   * the legacy `duration_<name>` shape so the REST sanitizer accepts them.
   */
  import { meta } from '../lib/stores.svelte.js';
  import NumberField from './NumberField.svelte';

  const SECTION = 'motion';
  const defaults = meta.defaults?.[SECTION] ?? {};
  const durations = defaults.durations ?? {};

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
</script>

<section>
  <h2>Motion</h2>
  <div class="rows">
    <NumberField
      section={SECTION}
      fieldKey="motion_scale"
      label="Motion Scale"
      min={0}
      step={0.1}
      default={defaults.motion_scale ?? 1}
      cssVar="--sf-motion-scale"
    />
  </div>

  <h2 class="group-heading">Duration Values</h2>
  <p class="hint">Base duration values in milliseconds.</p>
  <div class="rows">
    {#each Object.entries(durations) as [name, defaultMs] (name)}
      <NumberField
        section={SECTION}
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
