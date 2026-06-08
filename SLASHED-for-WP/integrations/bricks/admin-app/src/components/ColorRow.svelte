<script>
  /**
   * Paired HEX picker / advanced raw input for a single color token.
   *
   * Replaces the most JS-heavy block in the legacy admin page:
   *   - server-rendered hidden inputs with _hex / _raw suffixes
   *   - .slashed-color-toggle button with manual hidden attribute swaps
   *   - wpColorPicker init + change/clear callbacks
   *   - cross-input clearing logic when toggling modes
   *   - dirty + preview hooks duplicated for each input
   *
   * Here it's one component, ~80 lines, with the hex/raw mode owned
   * locally and the merged value written into the store on every edit.
   * The merge rule mirrors PHP's sanitize_color_section: raw wins when
   * present, hex otherwise.
   */
  import { tokens, markDirty } from '../lib/stores.svelte.js';

  let {
    /** Stored token key, e.g. "brand_primary" - lives under tokens.colors. */
    storeKey,
    /** Display label, e.g. "Primary". */
    label,
    /** HEX placeholder for the picker when nothing is saved. */
    hexHint = '',
    /** Raw placeholder for the advanced input (e.g. an oklch string). */
    rawHint = '',
    /** Underlying CSS custom property name shown for reference. */
    cssVar = '',
  } = $props();

  // Detect starting mode from the stored value's shape, same heuristic
  // as Slashed_Token_Sanitizer::is_hex_color() in class-token-sanitizer.php.
  const HEX = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

  // One-shot hydration from the store. Wrapping in an IIFE makes it
  // explicit to the Svelte compiler that we want a single read of the
  // storeKey prop at component init time (not a reactive subscription).
  /**
   * Initial mode + value pair derived from the stored token. Runs once
   * at component creation; `mode`, `hexValue`, and `rawValue` then
   * become independent local `$state` and the seed is discarded.
   *
   * @returns {{ mode: 'hex' | 'raw', hex: string, raw: string }}
   */
  const seed = (() => {
    const v = (tokens.colors?.[storeKey] ?? '').trim();
    const isHex = v === '' || HEX.test(v);
    return { mode: isHex ? 'hex' : 'raw', hex: isHex ? v : '', raw: isHex ? '' : v };
  })();

  let mode     = $state(seed.mode);
  let hexValue = $state(seed.hex);
  let rawValue = $state(seed.raw);

  /**
   * Collapse the two inputs into the single stored value the rest of
   * the system (CSS generator, REST sanitizer) expects. Whitespace-only
   * values are treated as empty, same as the PHP merger.
   */
  function commit() {
    if (!tokens.colors) tokens.colors = {};
    const raw = rawValue.trim();
    const hex = hexValue.trim();
    const merged = mode === 'raw' ? raw : hex;
    if (merged === '') {
      delete tokens.colors[storeKey];
    } else {
      tokens.colors[storeKey] = merged;
    }
    markDirty();
  }

  /**
   * Switch between HEX picker mode and Advanced (raw value) mode.
   * Mirrors the legacy admin page's two-input toggle: clearing the
   * inactive side is intentional so the merged save resolves to the
   * user's currently visible value, not a stale leftover from the
   * other input.
   */
  function toggleMode() {
    if (mode === 'hex') {
      mode = 'raw';
      hexValue = ''; // mirror legacy: clear the inactive side so save is unambiguous
    } else {
      mode = 'hex';
      rawValue = '';
    }
    commit();
  }

  // Live swatch always reflects whichever side is active, falling back
  // to the hex hint so an empty field still shows something visible.
  const swatch = $derived(
    (mode === 'raw' ? rawValue : hexValue) || hexHint || 'transparent'
  );
</script>

<div class="row">
  <div class="row__label">
    <label for={storeKey}>{label}</label>
    {#if cssVar}
      <code class="row__var">{cssVar}</code>
    {/if}
  </div>

  <div class="row__inputs">
    <span
      class="row__swatch"
      style:background={swatch}
      aria-hidden="true"
    ></span>

    {#if mode === 'hex'}
      <input
        id={storeKey}
        type="color"
        bind:value={hexValue}
        oninput={commit}
        title="Pick a color (HEX)"
        class="row__hex"
      />
      <input
        type="text"
        bind:value={hexValue}
        oninput={commit}
        placeholder={hexHint}
        spellcheck="false"
        class="row__hex-text"
        aria-label="HEX value"
      />
    {:else}
      <input
        id={storeKey}
        type="text"
        bind:value={rawValue}
        oninput={commit}
        placeholder={rawHint}
        spellcheck="false"
        class="row__raw"
        aria-label="Advanced color value"
      />
    {/if}

    <button type="button" class="row__toggle" onclick={toggleMode}>
      {mode === 'hex' ? 'Advanced (oklch / raw)' : 'Use HEX picker'}
    </button>
  </div>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 220px 1fr;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f1;
  }
  .row:last-child { border-bottom: none; }

  .row__label label {
    font-weight: 500;
    display: block;
    color: #1d2327;
  }
  .row__var {
    display: inline-block;
    margin-top: 4px;
    background: #f6f7f7;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 11px;
    color: #50575e;
  }

  .row__inputs {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .row__swatch {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    border: 1px solid #c3c4c7;
    flex-shrink: 0;
  }

  .row__hex {
    width: 44px;
    height: 28px;
    padding: 0;
    border: 1px solid #8c8f94;
    border-radius: 3px;
    cursor: pointer;
    background: white;
  }
  .row__hex-text {
    width: 110px;
  }
  .row__raw {
    flex: 1;
    min-width: 240px;
    font-family: ui-monospace, monospace;
  }

  .row__toggle {
    background: transparent;
    border: none;
    color: #2271b1;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 12px;
    text-decoration: underline;
  }
  .row__toggle:hover { color: #135e96; }
</style>
