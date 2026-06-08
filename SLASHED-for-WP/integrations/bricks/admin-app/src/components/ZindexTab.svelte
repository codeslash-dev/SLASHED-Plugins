<script>
  /**
   * Z-Index tab: integer values for the named stacking layers.
   *
   * The legacy form stored each layer under its bare name (e.g. `mid`,
   * `top`) — not `z_top` — so the storage keys are intentionally
   * unprefixed to keep the REST sanitizer happy.
   */
  import { meta } from '../lib/stores.svelte.js';
  import NumberField from './NumberField.svelte';

  const SECTION = 'zindex';
  const defaults = meta.defaults?.[SECTION] ?? {};

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
</script>

<section>
  <h2>Z-Index</h2>
  <p class="hint">Z-index layer values for stacking context management.</p>
  <div class="rows">
    {#each Object.entries(defaults) as [name, defaultValue] (name)}
      <NumberField
        section={SECTION}
        fieldKey={name}
        label={cap(name)}
        step={1}
        default={defaultValue}
        cssVar={`--sf-z-${name}`}
      />
    {/each}
  </div>
</section>

<style>
  h2 { margin-top: 0; }
  .hint { color: #50575e; margin-bottom: 16px; max-width: 720px; }
  .rows {
    border: 1px solid #f0f0f1;
    border-radius: 4px;
    padding: 0 12px;
    background: #fcfcfd;
  }
</style>
