<script>
  /**
   * A single colour swatch button.
   *
   * Renders the framework token's resolved colour. In 'both' mode the square
   * is split on the diagonal — light variant top-left, dark variant
   * bottom-right — so the adaptive pair reads at a glance (the whole point of
   * an adaptive `light-dark()` system). In 'light' / 'dark' mode it paints a
   * single solid variant. Translucent tokens (alpha steps, overlays) sit over
   * a checkerboard so transparency is visible.
   *
   * Pure presentation + a single onPick callback; all the apply/copy logic
   * lives in ColorPanel.
   */
  import { swatchHex } from '../lib/color-model.js';

  /** @type {{ swatch: object, mode: 'light'|'dark'|'both', onPick?: (s: object) => void }} */
  let { swatch, mode, onPick = undefined } = $props();

  const title = $derived(
    `${swatch.name}\nlight ${swatch.light}  ·  dark ${swatch.dark}`
  );
</script>

<button
  type="button"
  class="slashed-cp-swatch"
  class:slashed-cp-swatch--alpha={swatch.alpha}
  class:slashed-cp-swatch--split={mode === 'both'}
  style="--cp-l:{swatch.light}; --cp-d:{swatch.dark}; --cp-solid:{swatchHex(swatch, mode === 'dark' ? 'dark' : 'light')};"
  {title}
  aria-label={swatch.name}
  onclick={() => onPick?.(swatch)}
>
  <span class="slashed-cp-swatch__fill" aria-hidden="true"></span>
</button>
