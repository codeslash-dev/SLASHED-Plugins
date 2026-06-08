<script>
  /**
   * Font-family token field with three source modes:
   *
   *   System  — pick from a curated list of modern system-font stacks.
   *             No font loading; purely native OS fonts.
   *   Bricks  — pick from fonts already registered in Bricks Builder
   *             (custom uploads, Adobe Fonts, Google Fonts). Bricks owns all
   *             loading, including any "serve locally" GDPR configuration.
   *   Manual  — free-text input for anything else (full font stacks,
   *             var() references, fonts added outside Bricks, etc.).
   *
   * The stored token value is always a plain CSS font-family string.
   * Source is local UI state only — it is inferred from the current
   * value on mount and never persisted separately.
   *
   * Font data starts from window.slashedApp.bricksFonts (populated at
   * page load from PHP) and is refreshed on mount via the REST endpoint
   * so newly added fonts appear without a full page reload.
   */
  import { onMount } from 'svelte';
  import { meta, tokens, writeField } from '../lib/stores.svelte.js';
  import { fetchBricksFonts } from '../lib/api.js';
  import FieldRow from './FieldRow.svelte';

  let {
    section,
    fieldKey,
    label,
    default: defaultValue = '',
    cssVar = '',
    description = '',
  } = $props();

  // ── System font stacks (modern-font-stacks catalogue) ──────────────
  const SYSTEM_STACKS = [
    { label: 'System UI',           value: 'system-ui, sans-serif' },
    { label: 'Neo-Grotesque',       value: "Inter, Roboto, 'Helvetica Neue', 'Arial Nova', 'Nimbus Sans', Arial, sans-serif" },
    { label: 'Geometric Humanist',  value: "Avenir, Montserrat, Corbel, 'URW Gothic', source-sans-pro, sans-serif" },
    { label: 'Classical Humanist',  value: "Optima, Candara, 'Noto Sans', source-sans-pro, sans-serif" },
    { label: 'Humanist Sans',       value: "Seravek, 'Gill Sans Nova', Ubuntu, Calibri, 'DejaVu Sans', source-sans-pro, sans-serif" },
    { label: 'Industrial Sans',     value: "'Bahnschrift', 'DIN Alternate', 'Franklin Gothic Medium', 'Nimbus Sans Narrow', sans-serif-condensed, sans-serif" },
    { label: 'Rounded Sans',        value: "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT Bold', Calibri, source-sans-pro, sans-serif" },
    { label: 'Transitional Serif',  value: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, serif" },
    { label: 'Old Style Serif',     value: "'Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', P052, serif" },
    { label: 'Slab Serif',          value: "Rockwell, 'Rockwell Nova', 'Roboto Slab', 'DejaVu Serif', 'Sitka Small', serif" },
    { label: 'Antique Serif',       value: "Superclarendon, 'Bookman Old Style', 'URW Bookman', 'URW Bookman L', 'Georgia Pro', Georgia, serif" },
    { label: 'Didone Serif',        value: "Didact Gothic, 'Bodoni MT', 'Bodoni 72', Didot, 'Playfair Display', serif" },
    { label: 'Monospace',           value: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace" },
    { label: 'Handwritten',         value: "'Segoe Print', 'Bradley Hand', Chilanka, TSCu_Comic, casual, cursive" },
  ];

  // ── Bricks fonts: bootstrap then live refresh ────────────────────────
  // Start from the PHP bootstrap so the dropdown is populated immediately,
  // then fetch the live list on mount so fonts added since the page loaded
  // (or within the CPT transient window) appear without a full reload.
  /** @type {Array<{family:string, label:string, source:string}>} */
  let bricksFonts = $state(meta.bricksFonts);
  const bricksEnabled = meta.activeIntegrations?.bricks ?? true;

  onMount(async () => {
    const initialSource = source;
    try {
      const fresh = await fetchBricksFonts();
      bricksFonts = fresh;
      // Re-infer source: a font present only in the live list would have
      // been misclassified as 'manual' at init time.
      if (source === initialSource && initialSource === 'manual' && detectSource(effectiveValue) === 'bricks') {
        source = 'bricks';
      }
    } catch {
      // Keep bootstrap data if the fetch fails.
    }
  });

  // ── Current value ─────────────────────────────────────────────────
  const currentValue = $derived(
    tokens[section]?.[fieldKey] === undefined || tokens[section]?.[fieldKey] === null
      ? ''
      : String(tokens[section][fieldKey])
  );

  /** Effective value shown: stored override or the placeholder default. */
  const effectiveValue = $derived(currentValue || String(defaultValue));

  // ── Source detection ──────────────────────────────────────────────
  /**
   * Infer which source tab to activate from the current stored value.
   * Prefer Bricks over System so a Bricks font that happens to share a
   * name with a system stack word lands in the right tab.
   */
  function detectSource(value) {
    const v = (value || String(defaultValue)).trim().toLowerCase();
    if (bricksEnabled && bricksFonts.some(f => v === f.family.toLowerCase())) return 'bricks';
    if (SYSTEM_STACKS.some(s => v === s.value.toLowerCase())) return 'system';
    return 'manual';
  }

  let source = $state(detectSource(effectiveValue));

  // ── Source switch ─────────────────────────────────────────────────
  function switchSource(next) {
    source = next;
    // Pre-select sensible first value when switching into a dropdown mode.
    if (next === 'system') {
      const match = SYSTEM_STACKS.find(s => s.value.toLowerCase() === effectiveValue.toLowerCase());
      if (!match) writeField(section, fieldKey, SYSTEM_STACKS[0].value);
    } else if (next === 'bricks') {
      const match = bricksFonts.find(f => f.family.toLowerCase() === effectiveValue.toLowerCase());
      if (!match && bricksFonts.length > 0) writeField(section, fieldKey, bricksFonts[0].family);
    }
    // 'manual' — keep current value as-is.
  }

  function onSystemSelect(e) {
    writeField(section, fieldKey, e.currentTarget.value);
  }

  function onBricksSelect(e) {
    writeField(section, fieldKey, e.currentTarget.value);
  }

  function onManualInput(e) {
    writeField(section, fieldKey, e.currentTarget.value);
  }

  const SOURCE_BADGES = { adobe: ' (Adobe)', google: ' (Google)' };
  const sourceBadge = (src) => SOURCE_BADGES[src] ?? '';
</script>

<FieldRow {label} {cssVar} fieldId={fieldKey} {description}>
  <div class="font-field">
    <!-- Source tabs -->
    <div class="source-tabs" role="group" aria-label="Font source">
      <button
        type="button"
        class="source-tab"
        class:source-tab--active={source === 'system'}
        onclick={() => switchSource('system')}
      >System</button>
      {#if bricksEnabled}
        <button
          type="button"
          class="source-tab"
          class:source-tab--active={source === 'bricks'}
          onclick={() => switchSource('bricks')}
        >Bricks</button>
      {:else}
        <span class="source-tab source-tab--disabled" title="Enable the Bricks integration in SLASHED Settings to browse Bricks fonts here.">Bricks</span>
      {/if}
      <button
        type="button"
        class="source-tab"
        class:source-tab--active={source === 'manual'}
        onclick={() => switchSource('manual')}
      >Manual</button>
    </div>

    <!-- Input per source -->
    {#if source === 'system'}
      <select
        id={fieldKey}
        class="font-select"
        value={effectiveValue}
        onchange={onSystemSelect}
      >
        {#each SYSTEM_STACKS as stack (stack.value)}
          <option value={stack.value}>{stack.label}</option>
        {/each}
      </select>

    {:else if source === 'bricks' && bricksEnabled}
      {#if bricksFonts.length > 0}
        <select
          id={fieldKey}
          class="font-select"
          value={effectiveValue}
          onchange={onBricksSelect}
        >
          {#each bricksFonts as font (font.family)}
            <option value={font.family}>
              {font.label}{sourceBadge(font.source)}
            </option>
          {/each}
        </select>
      {:else}
        <p class="bricks-empty">
          No Bricks fonts found. Add fonts in <strong>Bricks &rsaquo; Settings &rsaquo; Custom Fonts</strong> or the Bricks Font Manager, then reload this page.
        </p>
      {/if}

    {:else}
      <input
        id={fieldKey}
        type="text"
        class="font-text"
        value={currentValue}
        placeholder={String(defaultValue)}
        spellcheck="false"
        oninput={onManualInput}
      />
    {/if}

    <!-- Live preview -->
    {#if effectiveValue}
      <span class="font-preview" style="font-family: {effectiveValue}">
        The quick brown fox
      </span>
    {/if}
  </div>
</FieldRow>

<style>
  .font-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 420px;
  }

  .source-tabs {
    display: flex;
    gap: 2px;
  }

  .source-tab {
    padding: 3px 10px;
    font-size: 11px;
    font-weight: 500;
    border: 1px solid #c3c4c7;
    background: #f6f7f7;
    color: #50575e;
    border-radius: 3px;
    cursor: pointer;
    line-height: 1.4;
  }
  .source-tab:hover { background: #f0f0f1; }
  .source-tab--active {
    background: #2271b1;
    border-color: #2271b1;
    color: #fff;
  }
  .source-tab--disabled {
    opacity: 0.45;
    cursor: default;
    pointer-events: none;
  }

  .font-select,
  .font-text {
    width: 100%;
    box-sizing: border-box;
    font-size: 13px;
    padding: 4px 8px;
    border: 1px solid #c3c4c7;
    border-radius: 3px;
    background: #fff;
    color: #1d2327;
    height: 30px;
  }
  .font-select:focus,
  .font-text:focus {
    outline: 2px solid #2271b1;
    outline-offset: 0;
    border-color: #2271b1;
  }

  .bricks-empty {
    font-size: 12px;
    color: #50575e;
    margin: 0;
    padding: 6px 8px;
    border: 1px dashed #c3c4c7;
    border-radius: 3px;
    background: #f6f7f7;
    line-height: 1.5;
  }

  .font-preview {
    font-size: 15px;
    color: #1d2327;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 2px 0;
  }
</style>
