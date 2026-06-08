<script>
  /**
   * WCAG Contrast Checker tab.
   *
   * Lets the user pick any two SLASHED color tokens (foreground +
   * background) and instantly sees the WCAG 2.1 contrast ratio plus
   * AA / AAA pass/fail for normal text (4.5:1 / 7:1) and large text
   * (3:1 / 4.5:1).
   *
   * Below the picker, a compact reference grid shows every token pair
   * colour-coded by its worst WCAG level: green (AAA), yellow (AA),
   * orange (AA large only), red (fail all).
   *
   * Color resolution uses an offscreen canvas (fillStyle + getImageData)
   * so hex, rgb/hsl, oklch — anything the browser parser accepts — is
   * handled without a custom parser.
   */
  import { meta, tokens } from '../lib/stores.svelte.js';

  // ── Color inventory ──────────────────────────────────────────────────
  const defaultColors = meta.defaults?.colors ?? {};

  const BRAND_NAMES   = Object.keys(defaultColors.brand ?? {});
  const STATUS_NAMES  = Object.keys(defaultColors.status ?? {});
  const ALL_NAMES     = [...BRAND_NAMES, ...STATUS_NAMES];

  /** Display label for a color slug. */
  function label(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /** Effective stored/default value for a token (light variant). */
  function colorValue(name) {
    const stored = BRAND_NAMES.includes(name)
      ? tokens.colors?.[`brand_${name}`]
      : tokens.colors?.[`status_${name}`];
    if (stored) return stored;
    return (
      defaultColors.brand_hex_hints?.[name] ??
      defaultColors.status_hex_hints?.[name] ??
      defaultColors.brand?.[name] ??
      defaultColors.status?.[name] ??
      ''
    );
  }

  // ── Color resolution (browser-native) ────────────────────────────────

  /** Resolve any CSS color string to [r, g, b] via canvas, or null. */
  function resolveToRgb(cssValue) {
    if (!cssValue || typeof document === 'undefined') return null;
    if (typeof CSS !== 'undefined' && !CSS.supports('color', cssValue)) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = cssValue;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a === 0) return null;
      return [r, g, b];
    } catch {
      return null;
    }
  }

  // ── WCAG maths ───────────────────────────────────────────────────────

  function toLinear(c) {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance([r, g, b]) {
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  function contrastRatio(rgb1, rgb2) {
    const l1 = relativeLuminance(rgb1);
    const l2 = relativeLuminance(rgb2);
    const lighter = Math.max(l1, l2);
    const darker  = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /** WCAG level for a given ratio. */
  function wcagLevel(ratio) {
    if (ratio >= 7)   return 'AAA';
    if (ratio >= 4.5) return 'AA';
    if (ratio >= 3)   return 'AA-large';
    return 'fail';
  }

  /** CSS class for a WCAG level badge. */
  function levelClass(level) {
    if (level === 'AAA')      return 'badge--aaa';
    if (level === 'AA')       return 'badge--aa';
    if (level === 'AA-large') return 'badge--aa-large';
    return 'badge--fail';
  }

  // ── Resolved RGB cache (computed once per render) ─────────────────────

  const resolved = $derived.by(() => {
    const map = new Map();
    for (const name of ALL_NAMES) {
      map.set(name, resolveToRgb(colorValue(name)));
    }
    return map;
  });

  // ── Picker state ─────────────────────────────────────────────────────

  let fg = $state(ALL_NAMES[0] ?? '');
  let bg = $state(ALL_NAMES[1] ?? ALL_NAMES[0] ?? '');

  const fgRgb = $derived(resolved.get(fg) ?? null);
  const bgRgb = $derived(resolved.get(bg) ?? null);

  const ratio = $derived(
    fgRgb && bgRgb ? contrastRatio(fgRgb, bgRgb) : null
  );

  const normalText = $derived(ratio !== null ? wcagLevel(ratio) : null);

  const largeText = $derived.by(() => {
    if (ratio === null) return null;
    if (ratio >= 4.5) return 'AAA';
    if (ratio >= 3)   return 'AA';
    return 'fail';
  });

  // ── Grid ─────────────────────────────────────────────────────────────

  /**
   * For each (fg, bg) pair in the grid, compute the contrast ratio and
   * level. Derived so it refreshes if tokens change.
   */
  const grid = $derived.by(() => {
    const rows = [];
    for (const fgName of ALL_NAMES) {
      const row = [];
      for (const bgName of ALL_NAMES) {
        const r1 = resolved.get(fgName);
        const r2 = resolved.get(bgName);
        if (!r1 || !r2 || fgName === bgName) {
          row.push({ ratio: null, level: null });
        } else {
          const r = contrastRatio(r1, r2);
          row.push({ ratio: r, level: wcagLevel(r) });
        }
      }
      rows.push(row);
    }
    return rows;
  });

  /** Hex approximation for swatch rendering. */
  function swatchStyle(name) {
    const v = colorValue(name);
    return v ? `background:${v}` : 'background:#ccc';
  }

  function setFg(name) { fg = name; }
  function setBg(name) { bg = name; }

  function selectPair(fgName, bgName) {
    fg = fgName;
    bg = bgName;
  }
</script>

<section>
  <h2>WCAG Contrast Checker</h2>
  <p class="hint">
    Pick any two SLASHED color tokens to check their WCAG 2.1 contrast ratio. The
    grid below shows every token pair — click any cell to load it into the picker.
    Colors shown are the <em>light-mode</em> variants.
  </p>

  <!-- ── Pair picker ───────────────────────────────────────────────── -->
  <div class="picker">
    <div class="picker__col">
      <h3 class="picker__heading">Foreground</h3>
      <div class="swatch-strip">
        {#each ALL_NAMES as name (name)}
          <button
            type="button"
            class="swatch-btn"
            class:swatch-btn--active={fg === name}
            style={swatchStyle(name)}
            title={label(name)}
            onclick={() => setFg(name)}
            aria-label="Set foreground to {label(name)}"
          ></button>
        {/each}
      </div>
      <div class="picker__selected">
        <span class="swatch-dot" style={swatchStyle(fg)}></span>
        {label(fg)}
      </div>
    </div>

    <div class="picker__col">
      <h3 class="picker__heading">Background</h3>
      <div class="swatch-strip">
        {#each ALL_NAMES as name (name)}
          <button
            type="button"
            class="swatch-btn"
            class:swatch-btn--active={bg === name}
            style={swatchStyle(name)}
            title={label(name)}
            onclick={() => setBg(name)}
            aria-label="Set background to {label(name)}"
          ></button>
        {/each}
      </div>
      <div class="picker__selected">
        <span class="swatch-dot" style={swatchStyle(bg)}></span>
        {label(bg)}
      </div>
    </div>

    <!-- ── Result ─────────────────────────────────────────────────── -->
    <div class="result" style="background:{colorValue(bg) || '#fff'}">
      {#if ratio !== null}
        <div class="result__sample" style="color:{colorValue(fg) || '#000'}">Aa</div>
        <div class="result__ratio">{ratio.toFixed(2)}:1</div>
        <div class="result__badges">
          <span class="result__badge-row">
            <span class="badge-label">Normal text</span>
            <span class="badge {levelClass(normalText)}">{normalText}</span>
          </span>
          <span class="result__badge-row">
            <span class="badge-label">Large text</span>
            <span class="badge {levelClass(largeText)}">{largeText}</span>
          </span>
        </div>
        <div class="result__thresholds">
          Normal: 4.5:1 AA · 7:1 AAA &nbsp;|&nbsp; Large: 3:1 AA · 4.5:1 AAA
        </div>
      {:else}
        <div class="result__empty">Select different colors to compute contrast.</div>
      {/if}
    </div>
  </div>

  <!-- ── Reference grid ────────────────────────────────────────────── -->
  <h3 class="grid-heading">All-pairs reference</h3>
  <p class="hint">
    Foreground → rows · Background → columns. Click any cell to load the pair into the picker above.
  </p>

  <div class="grid-wrap">
    <table class="contrast-grid">
      <thead>
        <tr>
          <th class="grid-corner"></th>
          {#each ALL_NAMES as bgName (bgName)}
            <th class="grid-col-header" title={label(bgName)}>
              <span class="grid-swatch" style={swatchStyle(bgName)}></span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each ALL_NAMES as fgName, fi (fgName)}
          <tr>
            <td class="grid-row-header" title={label(fgName)}>
              <span class="grid-swatch" style={swatchStyle(fgName)}></span>
            </td>
            {#each ALL_NAMES as bgName, bi (bgName)}
              {@const cell = grid[fi][bi]}
              <td
                class="grid-cell"
                class:grid-cell--same={fgName === bgName}
                class:grid-cell--aaa={cell.level === 'AAA'}
                class:grid-cell--aa={cell.level === 'AA'}
                class:grid-cell--aa-large={cell.level === 'AA-large'}
                class:grid-cell--fail={cell.level === 'fail'}
                class:grid-cell--active={fg === fgName && bg === bgName}
                title="{label(fgName)} on {label(bgName)}: {cell.ratio !== null ? cell.ratio.toFixed(2) + ':1' : '—'}"
                onclick={() => fgName !== bgName && selectPair(fgName, bgName)}
                role={fgName !== bgName ? 'button' : undefined}
                tabindex={fgName !== bgName ? 0 : undefined}
                onkeydown={(e) => e.key === 'Enter' && fgName !== bgName && selectPair(fgName, bgName)}
              >
                {#if cell.ratio !== null}
                  <span class="cell-ratio">{cell.ratio.toFixed(1)}</span>
                {:else}
                  <span class="cell-ratio cell-ratio--dash">—</span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <div class="legend">
    <span class="legend-item"><span class="legend-dot legend-dot--aaa"></span> AAA (≥ 7:1)</span>
    <span class="legend-item"><span class="legend-dot legend-dot--aa"></span> AA (≥ 4.5:1)</span>
    <span class="legend-item"><span class="legend-dot legend-dot--aa-large"></span> AA large only (≥ 3:1)</span>
    <span class="legend-item"><span class="legend-dot legend-dot--fail"></span> Fail (&lt; 3:1)</span>
  </div>
</section>

<style>
  h2 { margin-top: 0; }
  h3 { margin: 0 0 8px; font-size: 14px; }
  .grid-heading { margin: 24px 0 4px; }
  .hint { color: #50575e; margin-bottom: 16px; max-width: 720px; }

  /* ── Picker ──────────────────────────────────────────────────────── */
  .picker {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 16px;
    align-items: start;
    margin-bottom: 8px;
  }

  .picker__col { display: flex; flex-direction: column; gap: 8px; }
  .picker__heading { font-size: 13px; font-weight: 600; color: #1d2327; }

  .swatch-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .swatch-btn {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: transform 80ms;
  }
  .swatch-btn:hover { transform: scale(1.12); }
  .swatch-btn--active {
    border-color: #1d2327;
    box-shadow: 0 0 0 2px #fff, 0 0 0 4px #1d2327;
  }

  .picker__selected {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #50575e;
  }

  .swatch-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 1px solid rgba(0,0,0,0.15);
    display: inline-block;
    flex-shrink: 0;
  }

  /* ── Result card ─────────────────────────────────────────────────── */
  .result {
    min-width: 160px;
    border: 1px solid rgba(0,0,0,0.12);
    border-radius: 6px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    align-self: stretch;
    justify-content: center;
  }

  .result__sample {
    font-size: 48px;
    font-weight: 700;
    line-height: 1;
  }

  .result__ratio {
    font-size: 22px;
    font-weight: 700;
    color: #1d2327;
    background: rgba(255,255,255,0.75);
    padding: 2px 8px;
    border-radius: 3px;
  }

  .result__badges {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
  }

  .result__badge-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: rgba(255,255,255,0.75);
    padding: 3px 8px;
    border-radius: 3px;
  }

  .badge-label { font-size: 11px; color: #50575e; }

  .badge {
    font-size: 11px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 3px;
    white-space: nowrap;
  }
  .badge--aaa      { background: #00a32a; color: #fff; }
  .badge--aa       { background: #2271b1; color: #fff; }
  .badge--aa-large { background: #dba617; color: #fff; }
  .badge--fail     { background: #d63638; color: #fff; }

  .result__thresholds {
    font-size: 10px;
    color: #787c82;
    background: rgba(255,255,255,0.7);
    padding: 2px 6px;
    border-radius: 3px;
    text-align: center;
  }

  .result__empty { font-size: 13px; color: #787c82; text-align: center; }

  /* ── Grid ────────────────────────────────────────────────────────── */
  .grid-wrap {
    overflow-x: auto;
    margin-bottom: 12px;
  }

  .contrast-grid {
    border-collapse: collapse;
    font-size: 11px;
  }

  .grid-corner { width: 28px; height: 28px; }

  .grid-col-header,
  .grid-row-header {
    padding: 2px;
    text-align: center;
  }

  .grid-swatch {
    display: block;
    width: 22px;
    height: 22px;
    border-radius: 3px;
    border: 1px solid rgba(0,0,0,0.12);
  }

  .grid-cell {
    width: 44px;
    height: 36px;
    text-align: center;
    vertical-align: middle;
    border: 1px solid rgba(0,0,0,0.06);
    cursor: pointer;
    transition: opacity 80ms;
    position: relative;
  }
  .grid-cell:hover:not(.grid-cell--same) { opacity: 0.8; outline: 2px solid #2271b1; }
  .grid-cell--active { outline: 2px solid #1d2327 !important; }
  .grid-cell--same { background: #f0f0f1; cursor: default; }

  .grid-cell--aaa      { background: #d8f5e0; }
  .grid-cell--aa       { background: #d8e9f7; }
  .grid-cell--aa-large { background: #fdf2d0; }
  .grid-cell--fail     { background: #fde8e8; }

  .cell-ratio { font-size: 10px; font-weight: 600; color: #1d2327; }
  .cell-ratio--dash { color: #a7aaad; }

  /* ── Legend ──────────────────────────────────────────────────────── */
  .legend {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 12px;
    color: #50575e;
  }

  .legend-item { display: flex; align-items: center; gap: 5px; }

  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    display: inline-block;
  }
  .legend-dot--aaa      { background: #d8f5e0; border: 1px solid #00a32a; }
  .legend-dot--aa       { background: #d8e9f7; border: 1px solid #2271b1; }
  .legend-dot--aa-large { background: #fdf2d0; border: 1px solid #dba617; }
  .legend-dot--fail     { background: #fde8e8; border: 1px solid #d63638; }
</style>
