<script>
  /**
   * WCAG Contrast Checker tab.
   *
   * Lets the user check the WCAG 2.1 contrast of the legibility-relevant token
   * pairs (text-on-surface) and pick any pair for a detailed AA/AAA readout for
   * normal and large text.
   *
   * ⚠ In-context resolution: the WP admin page does NOT load the SLASHED
   * stylesheet, so a token like `--sf-color-text` (derived from neutral via
   * relative-color syntax) has no value to read here. The old checker fed the
   * RAW stored brand string to a canvas resolver, which silently failed for
   * `var(...)`, derived surfaces, and dark-mode colors — so the grid was wrong.
   *
   * Instead we now build the SAME derived CSS-var block the live preview uses
   * (lib/preview-vars.js — one source of truth), apply it to a hidden probe
   * root, and read back each measured token's computed `color`. That resolves
   * surfaces, auto-contrasting text and dark mode exactly as the front-end
   * would. Maths lives in the shared, unit-tested ../lib/color.js so the WP
   * checker and the framework configurator never drift.
   */
  import { tokens, meta } from '../lib/stores.svelte.js';
  import { saveSection } from '../lib/api.js';
  import { buildPreviewVars } from '../lib/preview-vars.js';
  import {
    resolveToRgb,
    contrastRatio,
    wcagLevel,
    wcagLevelLarge,
    levelClass,
    suggestAccessiblePalette,
  } from '../lib/color.js';

  // ── Light / dark toggle (parity with the framework WcagPanel) ────────
  let darkMode = $state(false);

  // Derived CSS-var blocks: `active` follows the toggle (matrix + picker);
  // `light` is always the light source palette (optimizer inputs, which feed
  // light-mode brand overrides).
  const declActive = $derived(buildPreviewVars(tokens, meta, darkMode));
  const declLight  = $derived(buildPreviewVars(tokens, meta, false));

  // ── Curated, legibility-relevant tokens (mirrors framework WcagPanel) ─
  const FG = [
    { key: 'text',           label: 'Text',           cssVar: '--c-text' },
    { key: 'text-secondary', label: 'Text secondary', cssVar: '--c-text-secondary' },
    { key: 'text-muted',     label: 'Text muted',     cssVar: '--c-text-muted' },
    { key: 'link',           label: 'Link',           cssVar: '--c-link' },
    { key: 'primary',        label: 'Primary',        cssVar: '--c-primary' },
    { key: 'action',         label: 'Action',         cssVar: '--c-action' },
  ];
  const BG = [
    { key: 'bg',      label: 'Background', cssVar: '--c-bg' },
    { key: 'surface', label: 'Surface',   cssVar: '--c-surface' },
    { key: 'inset',   label: 'Inset',     cssVar: '--c-inset' },
    { key: 'base',    label: 'Base',      cssVar: '--c-base' },
    { key: 'primary', label: 'Primary',   cssVar: '--c-primary' },
    { key: 'action',  label: 'Action',    cssVar: '--c-action' },
  ];

  const fgByKey = new Map(FG.map((e) => [e.key, e]));
  const bgByKey = new Map(BG.map((e) => [e.key, e]));
  const fgVar = (key) => fgByKey.get(key)?.cssVar ?? '--c-text';
  const bgVar = (key) => bgByKey.get(key)?.cssVar ?? '--c-bg';

  // Unique cssVars to probe for the matrix + picker.
  const measured = [...new Set([...FG, ...BG].map((e) => e.cssVar))];

  /** Parse a computed `rgb()` / `rgba()` string to [r,g,b] or null. */
  function parseRgb(str) {
    const m = /rgba?\(([^)]+)\)/.exec(str || '');
    if (!m) return null;
    const parts = m[1].split(/[ ,/]+/).map(Number).filter((n) => !Number.isNaN(n));
    if (parts.length < 3) return null;
    if (parts.length >= 4 && parts[3] === 0) return null;
    return [parts[0], parts[1], parts[2]];
  }

  // ── Probe DOM: name -> resolved [r,g,b] ──────────────────────────────
  let probes = {};
  let resolved = $state({});

  $effect(() => {
    void declActive; // re-read after any token/theme change hits the DOM
    const next = {};
    for (const cssVar of measured) {
      const el = probes[cssVar];
      if (!el) continue;
      const computed = getComputedStyle(el).color;
      next[cssVar] = parseRgb(computed) ?? resolveToRgb(computed);
    }
    resolved = next;
  });

  // Optimizer inputs resolved from the LIGHT source palette.
  const OPT_VARS = { base: '--c-base', neutral: '--c-neutral', action: '--c-action' };
  const OPT_ROLES = ['base', 'neutral', 'action'];
  let optProbes = {};
  let optResolved = $state({});

  $effect(() => {
    void declLight;
    const next = {};
    for (const role of OPT_ROLES) {
      const el = optProbes[role];
      if (!el) continue;
      const computed = getComputedStyle(el).color;
      next[role] = parseRgb(computed) ?? resolveToRgb(computed);
    }
    optResolved = next;
  });

  // ── Pair picker ──────────────────────────────────────────────────────
  let fgKey = $state(FG[0].key);
  let bgKey = $state(BG[0].key);

  const fgRgb = $derived(resolved[fgVar(fgKey)] ?? null);
  const bgRgb = $derived(resolved[bgVar(bgKey)] ?? null);
  const ratio = $derived(fgRgb && bgRgb ? contrastRatio(fgRgb, bgRgb) : null);
  const normalText = $derived(ratio !== null ? wcagLevel(ratio) : null);
  const largeText  = $derived(ratio !== null ? wcagLevelLarge(ratio) : null);

  // ── Matrix: FG (rows) × BG (cols) ────────────────────────────────────
  const grid = $derived(
    FG.map((f) =>
      BG.map((b) => {
        const a = resolved[f.cssVar];
        const c = resolved[b.cssVar];
        if (!a || !c) return { ratio: null, level: null };
        const r = contrastRatio(a, c);
        return { ratio: r, level: wcagLevel(r) };
      })
    )
  );

  function selectPair(fKey, bKey) {
    fgKey = fKey;
    bgKey = bKey;
  }

  /**
   * Swap the picker's foreground and background. FG and BG are curated, partly
   * different lists, so a key is only carried across when it exists on the
   * other side; otherwise that side keeps its current selection.
   */
  function swapPair() {
    const newFg = fgByKey.has(bgKey) ? bgKey : fgKey;
    const newBg = bgByKey.has(fgKey) ? fgKey : bgKey;
    fgKey = newFg;
    bgKey = newBg;
  }

  // ── Palette Optimizer + color locks ──────────────────────────────────
  let suggestion  = $state(null);
  let optimizing  = $state(false);
  let applying    = $state(false);
  let applyStatus = $state('');
  let locked      = $state({ base: false, neutral: false, action: false });

  function toggleLock(role) {
    locked[role] = !locked[role];
    if (suggestion) runOptimizer();
  }

  function runOptimizer() {
    optimizing  = true;
    applyStatus = '';
    suggestion  = suggestAccessiblePalette({
      baseRgb:    optResolved.base,
      neutralRgb: optResolved.neutral,
      actionRgb:  optResolved.action,
      locked:     { ...locked },
    });
    optimizing = false;
  }

  async function applySuggestions() {
    if (!suggestion) return;
    applying    = true;
    applyStatus = '';
    try {
      // Write only generated (unlocked) roles — locked anchors keep their value.
      const updates = {};
      for (const role of OPT_ROLES) {
        const s = suggestion[role];
        if (s && s.color && !s.locked) updates[`brand_${role}`] = s.color;
      }
      const merged = { ...(tokens.colors ?? {}), ...updates };
      await saveSection('colors', merged);

      tokens.colors ??= {};
      Object.assign(tokens.colors, updates);

      applyStatus = 'Applied ✓';
      setTimeout(() => { applyStatus = ''; }, 3000);
      suggestion = null;
    } catch (e) {
      applyStatus = 'Error: ' + (e.message || 'save failed');
    } finally {
      applying = false;
    }
  }

  function dismissSuggestion() {
    suggestion  = null;
    applyStatus = '';
  }

  /** Current light-source value for an optimizer role (for swatch rendering). */
  function roleValue(role) {
    return (
      tokens.colors?.[`brand_${role}`] ??
      meta.defaults?.colors?.brand_hex_hints?.[role] ??
      meta.defaults?.colors?.brand?.[role] ??
      '#888'
    );
  }

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
</script>

<!-- Hidden resolution probes: derived vars applied, one span per measured token. -->
<div class="wcag-probe" style={declActive} aria-hidden="true">
  {#each measured as cssVar (cssVar)}
    <span bind:this={probes[cssVar]} style="color: var({cssVar})"></span>
  {/each}
</div>
<div class="wcag-probe" style={declLight} aria-hidden="true">
  {#each OPT_ROLES as role (role)}
    <span bind:this={optProbes[role]} style="color: var({OPT_VARS[role]})"></span>
  {/each}
</div>

<section style={declActive}>
  <div class="head">
    <div>
      <h2>WCAG Contrast Checker</h2>
      <p class="hint">
        Contrast for your token palette, resolved with the current overrides in
        <strong>{darkMode ? 'dark' : 'light'}</strong> mode — including derived surfaces and
        auto-contrasting text. Click any matrix cell to load it into the picker.
      </p>
    </div>
    <div class="mode-toggle" role="group" aria-label="Preview theme">
      <button class="mode-btn" class:active={!darkMode} onclick={() => (darkMode = false)}>☀ Light</button>
      <button class="mode-btn" class:active={darkMode} onclick={() => (darkMode = true)}>☾ Dark</button>
    </div>
  </div>

  <!-- ── Pair picker ───────────────────────────────────────────────── -->
  <div class="checker">
    <div class="checker__controls">
      <label class="checker__field">
        <span>Foreground</span>
        <select bind:value={fgKey}>
          {#each FG as e (e.key)}<option value={e.key}>{e.label}</option>{/each}
        </select>
      </label>
      <button class="swap-btn" title="Swap foreground and background" aria-label="Swap colors"
        onclick={swapPair}>⇅</button>
      <label class="checker__field">
        <span>Background</span>
        <select bind:value={bgKey}>
          {#each BG as e (e.key)}<option value={e.key}>{e.label}</option>{/each}
        </select>
      </label>
    </div>

    <div class="result" style="background: var({bgVar(bgKey)})">
      {#if ratio !== null}
        <div class="result__sample" style="color: var({fgVar(fgKey)})">Aa</div>
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
        <div class="result__empty">Could not resolve this pair.</div>
      {/if}
    </div>
  </div>

  <!-- ── Text-on-background matrix ─────────────────────────────────── -->
  <h3 class="grid-heading">Text on background</h3>
  <div class="grid-wrap">
    <table class="contrast-grid">
      <thead>
        <tr>
          <th class="grid-corner"></th>
          {#each BG as b (b.key)}
            <th class="grid-col-header" title={b.label}>
              <span class="grid-swatch" style="background: var({b.cssVar})"></span>
              <span class="grid-lbl">{b.label}</span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each FG as f, fi (f.key)}
          <tr>
            <th class="grid-row-header">{f.label}</th>
            {#each BG as b, bi (b.key)}
              {@const cell = grid[fi][bi]}
              <td
                class="grid-cell"
                class:grid-cell--aaa={cell.level === 'AAA'}
                class:grid-cell--aa={cell.level === 'AA'}
                class:grid-cell--aa-large={cell.level === 'AA-large'}
                class:grid-cell--fail={cell.level === 'fail'}
                class:grid-cell--na={cell.ratio === null}
                class:grid-cell--active={fgKey === f.key && bgKey === b.key}
                title="{f.label} on {b.label}: {cell.ratio !== null ? cell.ratio.toFixed(2) + ':1' : '—'}"
                onclick={() => cell.ratio !== null && selectPair(f.key, b.key)}
                role={cell.ratio !== null ? 'button' : undefined}
                tabindex={cell.ratio !== null ? 0 : undefined}
                onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && cell.ratio !== null && (e.preventDefault(), selectPair(f.key, b.key))}
              >{cell.ratio !== null ? cell.ratio.toFixed(1) : '—'}</td>
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

  <!-- ── Palette Optimizer + color locks ───────────────────────────── -->
  <div class="optimizer">
    <h3 class="optimizer__heading">Palette Optimizer</h3>
    <p class="hint">
      Keep your brand hues and let SLASHED search lightness for the most accessible
      <strong>BASE</strong>, <strong>Neutral</strong> and <strong>Action</strong> values.
      <strong>Lock</strong> one or two colors to pin them as fixed anchors — the rest are
      generated to clear WCAG against your locked base.
    </p>

    <div class="locks" role="group" aria-label="Lock colors as fixed anchors">
      {#each OPT_ROLES as role (role)}
        <button
          type="button"
          class="lock"
          class:lock--on={locked[role]}
          onclick={() => toggleLock(role)}
          aria-pressed={locked[role]}
          title={locked[role] ? `${cap(role)} is locked — kept as-is` : `Lock ${cap(role)} as a fixed anchor`}
        >
          <span class="lock__ico" aria-hidden="true">{locked[role] ? '🔒' : '🔓'}</span>
          <span class="lock__sw" style="background:{roleValue(role)}"></span>
          <span class="lock__name">{cap(role)}</span>
        </button>
      {/each}
    </div>

    <button type="button" class="optimizer__btn" onclick={runOptimizer} disabled={optimizing}>
      {optimizing ? 'Analyzing…' : 'Suggest accessible palette'}
    </button>

    {#if applyStatus && !suggestion}
      <span class="optimizer__status optimizer__status--ok">{applyStatus}</span>
    {/if}

    {#if suggestion}
      <div class="optimizer__results">
        {#each OPT_ROLES as role (role)}
          {@const s = suggestion[role]}
          <div class="optimizer__row" class:optimizer__row--warn={!s}>
            <span class="optimizer__swatch" style="background:{s && s.color ? s.color : roleValue(role)};"></span>
            <div class="optimizer__info">
              <strong>{cap(role)}{#if s && s.locked} 🔒{/if}</strong>
              {#if s && s.color}
                <code class="optimizer__value">{s.color}</code>
              {:else if s && s.locked}
                <span>Locked — kept unchanged</span>
              {:else if !s}
                <span>No accessible value on this hue</span>
              {/if}
            </div>
            {#if s && s.ratio != null}
              <span class="badge {levelClass(wcagLevel(s.ratio))}">{s.ratio.toFixed(2)}:1 &nbsp;{wcagLevel(s.ratio)}</span>
            {:else if s}
              <span class="badge badge--neutral">Surface</span>
            {/if}
          </div>
        {/each}

        <div class="optimizer__actions">
          <button type="button" class="optimizer__apply-btn" onclick={applySuggestions} disabled={applying}>
            {applying ? 'Saving…' : 'Apply generated colors'}
          </button>
          <button type="button" class="optimizer__dismiss-btn" onclick={dismissSuggestion} disabled={applying}>Dismiss</button>
          {#if applyStatus}
            <span class="optimizer__status optimizer__status--ok">{applyStatus}</span>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</section>

<style>
  .wcag-probe {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
    visibility: hidden;
    pointer-events: none;
  }

  h2 { margin-top: 0; }
  h3 { margin: 0 0 8px; font-size: 14px; }
  .grid-heading { margin: 24px 0 8px; }
  .hint { color: #50575e; margin-bottom: 16px; max-width: 760px; }
  .hint strong { color: #1d2327; }

  /* ── Header + mode toggle ─────────────────────────────────────────── */
  .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .mode-toggle { display: flex; border: 1px solid #c3c4c7; border-radius: 4px; overflow: hidden; flex-shrink: 0; }
  .mode-btn {
    padding: 5px 12px;
    font-size: 12px;
    background: #fff;
    border: none;
    cursor: pointer;
    color: #50575e;
  }
  .mode-btn + .mode-btn { border-left: 1px solid #c3c4c7; }
  .mode-btn.active { background: #2271b1; color: #fff; }

  /* ── Picker ───────────────────────────────────────────────────────── */
  .checker { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: stretch; margin-bottom: 8px; }
  .checker__controls { display: flex; align-items: flex-end; gap: 10px; }
  .checker__field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
  .checker__field span { font-size: 12px; color: #50575e; }
  .checker__field select {
    width: 100%;
    padding: 6px 9px;
    border: 1px solid #8c8f94;
    border-radius: 4px;
    font-size: 13px;
    background: #fff;
    color: #1d2327;
  }
  .swap-btn {
    align-self: flex-end;
    font-size: 16px;
    padding: 5px 10px;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
    background: #f6f7f7;
    cursor: pointer;
    color: #1d2327;
  }
  .swap-btn:hover { background: #f0f0f1; }

  /* ── Result card ──────────────────────────────────────────────────── */
  .result {
    min-width: 190px;
    border: 1px solid rgba(0,0,0,0.12);
    border-radius: 6px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    justify-content: center;
  }
  .result__sample { font-size: 48px; font-weight: 700; line-height: 1; }
  .result__ratio {
    font-size: 22px;
    font-weight: 700;
    color: #1d2327;
    background: rgba(255,255,255,0.82);
    padding: 2px 8px;
    border-radius: 3px;
  }
  .result__badges { display: flex; flex-direction: column; gap: 4px; width: 100%; }
  .result__badge-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    background: rgba(255,255,255,0.82);
    padding: 3px 8px;
    border-radius: 3px;
  }
  .badge-label { font-size: 11px; color: #50575e; }
  .result__thresholds {
    font-size: 10px;
    color: #50575e;
    background: rgba(255,255,255,0.78);
    padding: 2px 6px;
    border-radius: 3px;
    text-align: center;
  }
  .result__empty { font-size: 13px; color: #787c82; text-align: center; }

  .badge { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 3px; white-space: nowrap; }
  .badge--aaa      { background: #00a32a; color: #fff; }
  .badge--aa       { background: #2271b1; color: #fff; }
  .badge--aa-large { background: #dba617; color: #fff; }
  .badge--fail     { background: #d63638; color: #fff; }
  .badge--neutral  { background: #f0f0f1; color: #50575e; border: 1px solid #c3c4c7; }

  /* ── Matrix ───────────────────────────────────────────────────────── */
  .grid-wrap { overflow-x: auto; margin-bottom: 12px; }
  .contrast-grid { border-collapse: collapse; font-size: 11px; }
  .grid-corner { width: 28px; height: 28px; }
  .grid-col-header { padding: 4px 6px; text-align: center; font-weight: 500; color: #50575e; }
  .grid-row-header { padding: 4px 10px 4px 4px; text-align: right; font-weight: 500; color: #50575e; white-space: nowrap; }
  .grid-lbl { display: block; font-size: 10px; margin-top: 3px; }
  .grid-swatch {
    display: block;
    width: 22px;
    height: 22px;
    border-radius: 3px;
    border: 1px solid rgba(0,0,0,0.12);
    margin: 0 auto;
  }
  .grid-cell {
    width: 56px;
    height: 38px;
    text-align: center;
    vertical-align: middle;
    font-weight: 700;
    color: #1a1a1a;
    border: 1px solid rgba(0,0,0,0.06);
    cursor: pointer;
  }
  .grid-cell--na { background: #f0f0f1; color: #a7aaad; cursor: default; }
  .grid-cell--aaa      { background: #d8f5e0; }
  .grid-cell--aa       { background: #d8e9f7; }
  .grid-cell--aa-large { background: #fdf2d0; }
  .grid-cell--fail     { background: #fde8e8; }
  .grid-cell--active   { outline: 2px solid #1d2327; outline-offset: -2px; }
  .grid-cell:hover:not(.grid-cell--na) { filter: brightness(0.96); }

  /* ── Legend ───────────────────────────────────────────────────────── */
  .legend { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: #50575e; }
  .legend-item { display: flex; align-items: center; gap: 5px; }
  .legend-dot { width: 12px; height: 12px; border-radius: 2px; display: inline-block; }
  .legend-dot--aaa      { background: #d8f5e0; border: 1px solid #00a32a; }
  .legend-dot--aa       { background: #d8e9f7; border: 1px solid #2271b1; }
  .legend-dot--aa-large { background: #fdf2d0; border: 1px solid #dba617; }
  .legend-dot--fail     { background: #fde8e8; border: 1px solid #d63638; }

  /* ── Optimizer ────────────────────────────────────────────────────── */
  .optimizer { margin-top: 28px; padding-top: 20px; border-top: 1px solid #e2e4e7; }
  .optimizer__heading { margin: 0 0 6px; font-size: 15px; }

  .locks { display: flex; gap: 8px; flex-wrap: wrap; margin: 0 0 14px; }
  .lock {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 10px;
    background: #fff;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
    color: #50575e;
    font-size: 12px;
    cursor: pointer;
    transition: border-color 120ms, color 120ms, background 120ms;
  }
  .lock:hover { color: #1d2327; }
  .lock--on { border-color: #2271b1; color: #1d2327; background: #f0f6fb; font-weight: 600; }
  .lock__ico { font-size: 13px; line-height: 1; }
  .lock__sw { width: 16px; height: 16px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.18); }

  .optimizer__btn {
    background: #2271b1;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }
  .optimizer__btn:hover:not(:disabled) { background: #135e96; }
  .optimizer__btn:disabled { opacity: .6; cursor: not-allowed; }

  .optimizer__results { margin-top: 16px; border: 1px solid #c3c4c7; border-radius: 6px; overflow: hidden; max-width: 580px; }
  .optimizer__row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-bottom: 1px solid #e2e4e7;
    background: #fff;
  }
  .optimizer__row:last-of-type { border-bottom: none; }
  .optimizer__row--warn { opacity: .7; }
  .optimizer__swatch { width: 36px; height: 36px; border-radius: 4px; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.12); }
  .optimizer__info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .optimizer__info strong { font-size: 13px; }
  .optimizer__info span { font-size: 12px; color: #50575e; }
  .optimizer__value {
    font-size: 11px;
    background: #f0f0f1;
    padding: 1px 5px;
    border-radius: 3px;
    color: #1e1e1e;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 220px;
    display: inline-block;
  }

  .optimizer__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 14px;
    background: #f6f7f7;
    border-top: 1px solid #e2e4e7;
    flex-wrap: wrap;
  }
  .optimizer__apply-btn {
    background: #00a32a;
    color: #fff;
    border: none;
    padding: 7px 14px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }
  .optimizer__apply-btn:hover:not(:disabled) { background: #007017; }
  .optimizer__apply-btn:disabled { opacity: .6; cursor: not-allowed; }
  .optimizer__dismiss-btn {
    background: transparent;
    color: #50575e;
    border: 1px solid #c3c4c7;
    padding: 7px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
  }
  .optimizer__dismiss-btn:hover:not(:disabled) { background: #f0f0f1; }
  .optimizer__status { font-size: 13px; font-weight: 500; }
  .optimizer__status--ok { color: #00a32a; }
</style>
