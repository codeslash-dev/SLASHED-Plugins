<script>
  /**
   * Colors tab body. Pulls the brand and status defaults from the
   * hydrated metadata and renders a ColorRow per token.
   *
   * Supports both light-mode (source) and dark-mode (optional override)
   * colors. Dark-mode values are optional — if left empty, the framework
   * auto-derives dark variants from the light source tokens via relative
   * color syntax. Setting an explicit dark value overrides auto-derivation.
   *
   * The "dark_overrides_enabled" flag (stored in the colors section) controls
   * whether custom dark values are included in generated CSS. When OFF, the
   * values are preserved in the DB but skipped — pure auto-derivation is used.
   */
  import { meta, readField, writeField } from '../lib/stores.svelte.js';
  import ColorRow from './ColorRow.svelte';
  import AdvancedSection from './AdvancedSection.svelte';

  const colors = meta.defaults?.colors ?? {};

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const brandEntries = Object.entries(colors.brand ?? {});

  /** Whether custom dark overrides are active (default: true when not set). */
  const darkOn = $derived(readField('colors', 'dark_overrides_enabled') !== '0');

  function toggleDark() {
    writeField('colors', 'dark_overrides_enabled', darkOn ? '0' : '1');
  }
</script>

<section>
  <h2>Brand Colors — Light Mode</h2>
  <p class="hint">
    Pick a color via the HEX input, or switch to <em>Advanced</em> to paste any
    CSS color value (oklch, rgb, hsl, var(...), etc). Whatever you save is fed
    straight into the framework as the source of the brand scale.
  </p>

  <div class="rows">
    {#each brandEntries as [name, oklch] (name)}
      <ColorRow
        storeKey={`brand_${name}`}
        label={cap(name)}
        hexHint={colors.brand_hex_hints?.[name] ?? ''}
        rawHint={oklch}
        cssVar={`--sf-color-${name}-light`}
      />
    {/each}
  </div>

  <AdvancedSection>
    <h2 class="status-heading">Status Colors — Light Mode</h2>
    <div class="rows">
      {#each Object.entries(colors.status ?? {}) as [name, oklch] (name)}
        <ColorRow
          storeKey={`status_${name}`}
          label={cap(name)}
          hexHint={colors.status_hex_hints?.[name] ?? ''}
          rawHint={oklch}
          cssVar={`--sf-color-${name}-light`}
        />
      {/each}
    </div>

    <!-- ── Dark mode toggle ──────────────────────────────────────── -->
    <div class="dark-toggle-section">
      <div class="dark-toggle-row">
        <button
          type="button"
          class="dark-toggle-btn"
          class:on={darkOn}
          onclick={toggleDark}
          aria-pressed={darkOn}
        >
          <span class="dark-toggle-btn__track">
            <span class="dark-toggle-btn__thumb"></span>
          </span>
          Custom dark mode colors
        </button>
        <span class="dark-toggle-status">
          {darkOn ? 'Active — custom values override auto-derivation' : 'Off — dark mode auto-derived from light source colors'}
        </span>
      </div>
      <p class="hint">
        The framework auto-derives dark mode from light source colors using CSS relative color syntax
        (<code>oklch(from light clamp(0.65, 0.95−l·0.5, 0.88) c·0.9 h)</code>). Turn this on only
        when you need precise per-color dark overrides; auto-derivation is usually good enough.
      </p>
    </div>

    {#if darkOn}
      <h2 class="dark-heading">Brand Colors — Dark Mode</h2>
      <div class="rows rows--dark">
        {#each Object.entries(colors.brand_dark ?? colors.brand ?? {}) as [name] (name)}
          <ColorRow
            storeKey={`brand_dark_${name}`}
            label={cap(name)}
            hexHint={colors.brand_dark_hex_hints?.[name] ?? ''}
            rawHint={colors.brand_dark?.[name] ?? ''}
            cssVar={`--sf-color-${name}-dark`}
          />
        {/each}
      </div>

      <h2 class="dark-heading">Status Colors — Dark Mode</h2>
      <div class="rows rows--dark">
        {#each Object.entries(colors.status_dark ?? colors.status ?? {}) as [name] (name)}
          <ColorRow
            storeKey={`status_dark_${name}`}
            label={cap(name)}
            hexHint={colors.status_dark_hex_hints?.[name] ?? ''}
            rawHint={colors.status_dark?.[name] ?? ''}
            cssVar={`--sf-color-${name}-dark`}
          />
        {/each}
      </div>
    {/if}
  </AdvancedSection>
</section>

<style>
  h2 { margin-top: 0; }
  .status-heading { margin-top: 24px; }
  .dark-heading { margin-top: 24px; }
  .hint { color: #50575e; margin-bottom: 16px; max-width: 720px; font-size: 13px; }
  .hint code { background: #f0f0f1; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
  .rows {
    border: 1px solid #f0f0f1;
    border-radius: 4px;
    padding: 0 12px;
    background: #fcfcfd;
  }
  .rows--dark {
    background: #f8f8fc;
    border-color: #e2e4e9;
  }

  /* ── Dark mode toggle ───────────────────────────────────────── */
  .dark-toggle-section {
    margin-top: 24px;
    padding: 14px 16px;
    background: #f6f7f7;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }
  .dark-toggle-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
  }
  .dark-toggle-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-size: 13px;
    font-weight: 600;
    color: #1d2327;
  }
  .dark-toggle-btn__track {
    position: relative;
    display: inline-block;
    width: 36px;
    height: 20px;
    background: #c3c4c7;
    border-radius: 10px;
    transition: background 150ms;
    flex-shrink: 0;
  }
  .dark-toggle-btn.on .dark-toggle-btn__track {
    background: #2271b1;
  }
  .dark-toggle-btn__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    transition: left 150ms;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }
  .dark-toggle-btn.on .dark-toggle-btn__thumb {
    left: 18px;
  }
  .dark-toggle-status {
    font-size: 12px;
    color: #50575e;
  }
  .dark-toggle-section .hint {
    margin-bottom: 0;
  }
</style>
