<script>
  /**
   * Live preview panel — a compact design-set showcase.
   *
   * The panel renders a token-driven "canvas" that mirrors what the
   * framework actually paints: surfaces, text hierarchy, brand swatches,
   * buttons, status/feedback, a card, and a form field — all reacting to
   * the reactive `tokens` store with zero DOM walking.
   *
   * Why the inline CSS-variable block is large: the WP admin page does
   * NOT load the SLASHED stylesheet (it would clobber wp-admin's own UI),
   * so the framework's `--sf-color-*` derivations can't resolve here. We
   * recompute the handful we preview, mirroring core/tokens.css verbatim:
   *
   *   - resolved active-mode colors        (`--c-*`)
   *   - text-on-color, auto-contrasting    (`--on-*`)  ← fixes the old
   *     "white text on a light status colour" unreadable bug
   *   - surfaces derived from base          (`--c-surface/bg/raised/inset`)
   *   - text hierarchy + borders + links    (mode-dependent formulas)
   *
   * Because the on-color tokens use the same `sign(threshold - l)` luminance
   * switch the framework uses, every label/button/badge stays legible in
   * both light and dark, for any brand palette the user picks.
   */
  import { tokens, meta } from '../lib/stores.svelte.js';
  import { generateExportCSS } from '../lib/export.js';

  const brand = ['primary', 'secondary', 'tertiary', 'action', 'neutral', 'base'];
  const statuses = ['success', 'warning', 'error', 'info', 'danger'];
  const defaultColors = meta.defaults?.colors ?? {};

  // Auto-derivation formulas matching core/tokens.css verbatim.
  // Module-level so they're defined once, not recreated per render.
  const autoDarkStandard = (light) =>
    `oklch(from var(${light}) clamp(0.65, calc(0.95 - l * 0.5), 0.88) calc(c * 0.9) h)`;
  const autoDarkBase = (light) =>
    `oklch(from var(${light}) clamp(0.16, calc(1.18 - l), 0.24) calc(c * 0.5) h)`;
  const autoDark = (name) => {
    const light = `--sf-color-${name}-light`;
    return name === 'base' ? autoDarkBase(light) : autoDarkStandard(light);
  };

  /** Light / dark mode toggle for the preview panel. */
  let darkMode = $state(false);

  /** The active color-mode suffix for all swatch/button lookups. */
  const mode = $derived(darkMode ? 'dark' : 'light');

  /**
   * Build inline CSS custom properties for the preview canvas. Includes
   * source brand/status colors, resolved active-mode tokens, on-color
   * text, surfaces, text hierarchy, borders, links, and preview-only
   * radius/shadow vars so the whole showcase responds live.
   */
  const inlineStyle = $derived.by(() => {
    const pairs = [];
    const colors = tokens.colors ?? {};
    const typography = tokens.typography ?? {};
    const radius = tokens.radius ?? {};
    const shadows = tokens.shadows ?? {};
    const contrast = tokens.contrast ?? {};
    const m = darkMode ? 'dark' : 'light';

    // Contrast knobs — mirror the framework defaults so derived tokens
    // match what the generator would emit.
    const TH = (() => {
      const v = contrast.contrast_threshold;
      const n = v !== undefined && v !== '' ? parseFloat(v) : parseFloat(meta.defaults?.contrast?.contrast_threshold ?? 0.6);
      return Number.isFinite(n) ? n : 0.6;
    })();
    const BIAS = (() => {
      const v = contrast.contrast_bias;
      const n = v !== undefined && v !== '' ? parseFloat(v) : parseFloat(meta.defaults?.contrast?.contrast_bias ?? 0);
      return Number.isFinite(n) ? n : 0;
    })();

    // 1. Source light/dark colors (swatch lookups read these by mode).
    for (const name of brand) {
      const v = colors[`brand_${name}`] ?? defaultColors.brand_hex_hints?.[name];
      if (v) pairs.push(`--sf-color-${name}-light:${v}`);
      const darkEnabled = colors.dark_overrides_enabled !== '0';
      const storedDark = darkEnabled ? colors[`brand_dark_${name}`] : '';
      pairs.push(`--sf-color-${name}-dark:${storedDark || autoDark(name)}`);
    }
    for (const name of statuses) {
      const v = colors[`status_${name}`] ?? defaultColors.status_hex_hints?.[name];
      if (v) pairs.push(`--sf-color-${name}-light:${v}`);
      const darkEnabled = colors.dark_overrides_enabled !== '0';
      const storedDark = darkEnabled ? colors[`status_dark_${name}`] : '';
      pairs.push(`--sf-color-${name}-dark:${storedDark || autoDark(name)}`);
    }

    // 2. Resolved active-mode color + auto-contrasting on-color text.
    const onColor = (cvar) =>
      `oklch(from ${cvar} clamp(0.1, sign(${TH} - l) * 999, 0.95) 0 0)`;
    for (const name of [...brand, ...statuses]) {
      pairs.push(`--c-${name}:var(--sf-color-${name}-${m})`);
      pairs.push(`--on-${name}:${onColor(`var(--c-${name})`)}`);
    }

    // 3. Surfaces — derived from --c-base, matching tokens.css.
    pairs.push(`--c-surface:var(--c-base)`);
    pairs.push(`--c-bg:oklch(from var(--c-base) calc(l + 0.02) c h)`);
    pairs.push(`--c-raised:oklch(from var(--c-base) calc(l + 0.04) c h)`);
    pairs.push(`--c-inset:oklch(from var(--c-base) calc(l - 0.02) c h)`);

    // 4. Text hierarchy — opposite formula directions per mode.
    const neutralSrc = m === 'dark' ? 'var(--c-neutral)' : 'var(--sf-color-neutral-light)';
    if (m === 'dark') {
      pairs.push(`--c-text:oklch(from ${neutralSrc} clamp(0.70, calc(l + 0.25 + ${BIAS}), 1) c h)`);
      pairs.push(`--c-text-secondary:oklch(from ${neutralSrc} clamp(0.55, calc(l + 0.1 + ${BIAS}), 0.90) c h)`);
      pairs.push(`--c-border:oklch(from ${neutralSrc} clamp(0.25, calc(l - 0.3), 0.55) 0.005 h)`);
      pairs.push(`--c-border-subtle:oklch(from ${neutralSrc} clamp(0.20, calc(l - 0.38), 0.45) 0.005 h)`);
      pairs.push(`--c-link:oklch(from var(--c-action) clamp(0.68, l, 1) c h)`);
    } else {
      pairs.push(`--c-text:oklch(from ${neutralSrc} clamp(0.05, calc(l - 0.4 - ${BIAS}), 0.35) c h)`);
      pairs.push(`--c-text-secondary:oklch(from ${neutralSrc} clamp(0.15, calc(l - 0.25 - ${BIAS}), 0.45) c h)`);
      pairs.push(`--c-border:oklch(from ${neutralSrc} clamp(0.70, calc(l + 0.35), 0.95) 0.005 h)`);
      pairs.push(`--c-border-subtle:oklch(from ${neutralSrc} clamp(0.75, calc(l + 0.4), 0.97) 0.005 h)`);
      pairs.push(`--c-link:oklch(from var(--c-action) clamp(0, min(l - 0.07, 0.48), 1) c h)`);
    }
    pairs.push(`--c-text-muted:var(--c-neutral)`);

    // 5. Status tints (translucent fills for alerts) + on-color already set.
    for (const name of statuses) {
      pairs.push(`--tint-${name}:oklch(from var(--c-${name}) l c h / 0.14)`);
    }

    // 6. Font families.
    if (typography.font_body)    pairs.push(`--sf-font-body:${typography.font_body}`);
    if (typography.font_heading) pairs.push(`--sf-font-heading:${typography.font_heading}`);

    // 7. Radius + shadow preview vars.
    const rs = parseFloat(radius.radius_scale ?? meta.defaults?.radius?.radius_scale ?? 1) || 1;
    pairs.push(`--preview-radius-s:${Math.round(4 * rs)}px`);
    pairs.push(`--preview-radius-m:${Math.round(8 * rs)}px`);
    pairs.push(`--preview-radius-l:${Math.round(16 * rs)}px`);

    const ssRaw = shadows.shadow_strength;
    const ss = ssRaw !== undefined && ssRaw !== ''
      ? parseFloat(ssRaw)
      : parseFloat(meta.defaults?.shadows?.shadow_strength ?? 0.08);
    pairs.push(`--preview-shadow:0 2px 8px 0 rgba(0,0,0,${(ss * 2).toFixed(3)}),0 1px 3px 0 rgba(0,0,0,${ss.toFixed(3)})`);

    return pairs.join(';');
  });

  /** Surfaces shown as elevation tiles. */
  const surfaceTiles = [
    { var: '--c-inset',   label: 'Inset' },
    { var: '--c-bg',      label: 'Background' },
    { var: '--c-surface', label: 'Surface' },
    { var: '--c-raised',  label: 'Raised' },
  ];

  /** Full CSS override output — mirrors what the plugin emits server-side. */
  const css = $derived(generateExportCSS(tokens));
</script>

<div class="slashed-preview" class:is-dark={darkMode} style={inlineStyle}>
  <!-- Header with mode toggle (admin chrome — always legible) -->
  <div class="slashed-preview__header">
    <h3>Live preview</h3>
    <div class="slashed-preview__mode-toggle">
      <button
        class="slashed-preview__mode-btn"
        class:active={!darkMode}
        onclick={() => (darkMode = false)}
      >☀ Light</button>
      <button
        class="slashed-preview__mode-btn"
        class:active={darkMode}
        onclick={() => (darkMode = true)}
      >☾ Dark</button>
    </div>
  </div>

  <!-- Token-driven canvas: background + text come from the resolved tokens
       so the whole showcase adapts the way the front-end actually would. -->
  <div class="sf-canvas">
    <!-- ── Typography ─────────────────────────────────────────────── -->
    <section class="sf-block">
      <p class="sf-eyebrow">Typography</p>
      <p class="sf-heading">The quick brown fox jumps over the lazy dog</p>
      <p class="sf-body">
        Body text uses <code>--sf-color-text--secondary</code> over the page
        background. Headings, body, secondary and muted text each pull from
        their own token so the hierarchy stays readable in both modes.
      </p>
      <p class="sf-muted">
        Muted caption · <a class="sf-link" href="#x" onclick={(e) => e.preventDefault()}>an inline link</a> · auto-contrasting.
      </p>
    </section>

    <!-- ── Surfaces / elevation ───────────────────────────────────── -->
    <section class="sf-block">
      <p class="sf-eyebrow">Surfaces</p>
      <div class="sf-surfaces">
        {#each surfaceTiles as tile (tile.var)}
          <div class="sf-surface-tile" style:background={`var(${tile.var})`}>
            <span class="sf-surface-tile__label">{tile.label}</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- ── Brand palette (labels use on-color text) ───────────────── -->
    <section class="sf-block">
      <p class="sf-eyebrow">Brand &amp; status</p>
      <div class="sf-swatches">
        {#each brand as name (name)}
          <div
            class="sf-swatch"
            style:background={`var(--c-${name})`}
            style:color={`var(--on-${name})`}
            title={name}
          >{name}</div>
        {/each}
        {#each statuses as name (name)}
          <div
            class="sf-swatch"
            style:background={`var(--c-${name})`}
            style:color={`var(--on-${name})`}
            title={name}
          >{name}</div>
        {/each}
      </div>
    </section>

    <!-- ── Buttons ────────────────────────────────────────────────── -->
    <section class="sf-block">
      <p class="sf-eyebrow">Buttons</p>
      <div class="sf-buttons">
        <span class="sf-btn" style:background="var(--c-primary)"   style:color="var(--on-primary)">Primary</span>
        <span class="sf-btn" style:background="var(--c-secondary)" style:color="var(--on-secondary)">Secondary</span>
        <span class="sf-btn" style:background="var(--c-action)"    style:color="var(--on-action)">Action</span>
        <span
          class="sf-btn sf-btn--outline"
          style:border-color="var(--c-primary)"
          style:color="var(--c-primary)"
        >Outline</span>
        <span class="sf-btn sf-btn--ghost" style:color="var(--c-text-secondary)">Ghost</span>
        <span class="sf-btn" style:background="var(--c-neutral)" style:color="var(--on-neutral)" style:opacity="0.55">Disabled</span>
      </div>
    </section>

    <!-- ── Status / feedback — tinted alerts + solid badges ──────────
         The old preview painted white text on every status colour, which
         was unreadable on light warning/info. Each alert now pairs a
         translucent tint fill with the status colour border, and badges
         use the on-color token. -->
    <section class="sf-block">
      <p class="sf-eyebrow">Feedback</p>
      <div class="sf-alerts">
        {#each statuses as name (name)}
          <div
            class="sf-alert"
            style:background={`var(--tint-${name})`}
            style:border-inline-start-color={`var(--c-${name})`}
          >
            <span
              class="sf-badge"
              style:background={`var(--c-${name})`}
              style:color={`var(--on-${name})`}
            >{name}</span>
            <span class="sf-alert__text">{name} message — readable on its tint.</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- ── Card — colours + typography + radius + shadow + on-color ── -->
    <section class="sf-block">
      <p class="sf-eyebrow">Card component</p>
      <div class="sf-card">
        <div class="sf-card__accent" style:background="var(--c-primary)"></div>
        <div class="sf-card__body">
          <div class="sf-card__top">
            <div class="sf-card__avatar"
              style:background="var(--c-secondary)"
              style:color="var(--on-secondary)"
            >S</div>
            <div>
              <p class="sf-card__title">Card Component</p>
              <p class="sf-card__sub">Design token preview</p>
            </div>
            <span class="sf-badge" style:background="var(--c-success)" style:color="var(--on-success)">Active</span>
          </div>
          <p class="sf-card__text">
            Radius, shadow, colours, surfaces, and typography working together —
            every value updates live as you adjust tokens.
          </p>
          <div class="sf-card__footer">
            <span class="sf-badge" style:background="var(--c-info)" style:color="var(--on-info)">Info</span>
            <span class="sf-badge" style:background="var(--c-warning)" style:color="var(--on-warning)">Warning</span>
            <span class="sf-btn sf-btn--sm" style:background="var(--c-action)" style:color="var(--on-action)">Save</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Form field — borders, surface, placeholder ───────────────── -->
    <section class="sf-block">
      <p class="sf-eyebrow">Form field</p>
      <label class="sf-field">
        <span class="sf-field__label">Email address</span>
        <input class="sf-field__input" type="text" placeholder="you@example.com" readonly />
      </label>
    </section>
  </div>

  <!-- Generated CSS -->
  <div class="slashed-preview__caption">
    Generated CSS:
    <code>{css || '/* (defaults — no overrides set) */'}</code>
  </div>
</div>

<style>
  .slashed-preview {
    background: #fff;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
    padding: 20px;
    margin-top: 8px;
    transition: background 200ms, color 200ms;
  }
  .slashed-preview.is-dark {
    background: #1d2327;
    border-color: #3c434a;
  }

  /* ── Header (admin chrome) ──────────────────────────────────────── */
  .slashed-preview__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .slashed-preview__header h3 { margin: 0; color: #1d2327; }
  .slashed-preview.is-dark .slashed-preview__header h3 { color: #f0f0f1; }

  .slashed-preview__mode-toggle {
    display: flex;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
    overflow: hidden;
  }
  .slashed-preview.is-dark .slashed-preview__mode-toggle { border-color: #3c434a; }
  .slashed-preview__mode-btn {
    padding: 4px 10px;
    font-size: 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: #50575e;
    line-height: 1.4;
  }
  .slashed-preview.is-dark .slashed-preview__mode-btn { color: #a7aaad; }
  .slashed-preview__mode-btn.active { background: #2271b1; color: #fff; }
  .slashed-preview__mode-btn + .slashed-preview__mode-btn { border-left: 1px solid #c3c4c7; }
  .slashed-preview.is-dark .slashed-preview__mode-btn + .slashed-preview__mode-btn { border-left-color: #3c434a; }

  /* ── Token-driven canvas ────────────────────────────────────────── */
  .sf-canvas {
    background: var(--c-bg, #fff);
    color: var(--c-text, #1d2327);
    border: 1px solid var(--c-border, #e2e2e2);
    border-radius: var(--preview-radius-m, 8px);
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .sf-block { margin: 0; }
  .sf-eyebrow {
    margin: 0 0 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--c-text-muted, #787c82);
  }

  /* Typography */
  .sf-heading {
    font-family: var(--sf-font-heading, system-ui, sans-serif);
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.25;
    color: var(--c-text, #1d2327);
  }
  .sf-body {
    font-family: var(--sf-font-body, system-ui, sans-serif);
    color: var(--c-text-secondary, #50575e);
    margin: 0 0 6px;
    font-size: 13px;
    line-height: 1.55;
  }
  .sf-body code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
    padding: 1px 4px;
    border-radius: 3px;
    background: var(--c-inset, rgba(127,127,127,0.12));
    color: var(--c-text, inherit);
  }
  .sf-muted {
    margin: 0;
    font-size: 12px;
    color: var(--c-text-muted, #787c82);
  }
  .sf-link {
    color: var(--c-link, #2271b1);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  /* Surfaces */
  .sf-surfaces {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .sf-surface-tile {
    height: 54px;
    border: 1px solid var(--c-border, #ddd);
    border-radius: var(--preview-radius-s, 4px);
    display: flex;
    align-items: flex-end;
    padding: 6px;
    box-shadow: var(--preview-shadow);
  }
  .sf-surface-tile__label {
    font-size: 10px;
    font-weight: 600;
    color: var(--c-text-secondary, #50575e);
  }

  /* Swatches */
  .sf-swatches { display: flex; gap: 8px; flex-wrap: wrap; }
  .sf-swatch {
    width: 52px;
    height: 52px;
    border-radius: var(--preview-radius-s, 4px);
    border: 1px solid var(--c-border-subtle, rgba(0,0,0,0.08));
    display: flex;
    align-items: flex-end;
    justify-content: center;
    font-size: 9px;
    font-weight: 600;
    padding: 3px;
  }

  /* Buttons */
  .sf-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
  .sf-btn {
    padding: 7px 14px;
    border-radius: var(--preview-radius-s, 4px);
    font-size: 13px;
    font-weight: 600;
    border: none;
    cursor: default;
    display: inline-flex;
    align-items: center;
    line-height: 1.2;
  }
  .sf-btn--outline { background: transparent !important; border: 1.5px solid; }
  .sf-btn--ghost { background: transparent !important; border: none; }
  .sf-btn--sm { padding: 4px 10px; font-size: 12px; }

  /* Alerts */
  .sf-alerts { display: flex; flex-direction: column; gap: 6px; }
  .sf-alert {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-radius: var(--preview-radius-s, 4px);
    border-inline-start: 3px solid;
    font-size: 12px;
  }
  .sf-alert__text { color: var(--c-text, inherit); }

  /* Badge */
  .sf-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: var(--preview-radius-l, 16px);
    font-size: 10px;
    font-weight: 700;
    white-space: nowrap;
  }

  /* Card */
  .sf-card {
    border: 1px solid var(--c-border, #e9eaeb);
    border-radius: var(--preview-radius-m, 8px);
    overflow: hidden;
    background: var(--c-surface, #fff);
    box-shadow: var(--preview-shadow);
  }
  .sf-card__accent { height: 4px; }
  .sf-card__body { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
  .sf-card__top { display: flex; align-items: center; gap: 10px; }
  .sf-card__avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
  }
  .sf-card__title {
    margin: 0;
    font-family: var(--sf-font-heading, system-ui, sans-serif);
    font-size: 14px;
    font-weight: 600;
    color: var(--c-text, #1d2327);
    line-height: 1.3;
  }
  .sf-card__sub { margin: 0; font-size: 11px; color: var(--c-text-muted, #787c82); line-height: 1.3; }
  .sf-card__top .sf-badge { margin-left: auto; }
  .sf-card__text {
    margin: 0;
    font-family: var(--sf-font-body, system-ui, sans-serif);
    font-size: 12px;
    line-height: 1.5;
    color: var(--c-text-secondary, #50575e);
  }
  .sf-card__footer {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding-top: 8px;
    border-top: 1px solid var(--c-border-subtle, #f0f0f1);
  }
  .sf-card__footer .sf-btn--sm { margin-left: auto; }

  /* Form field */
  .sf-field { display: flex; flex-direction: column; gap: 5px; max-width: 320px; }
  .sf-field__label {
    font-size: 11px;
    font-weight: 600;
    color: var(--c-text-secondary, #50575e);
  }
  .sf-field__input {
    font-size: 13px;
    padding: 7px 10px;
    border-radius: var(--preview-radius-s, 4px);
    border: 1px solid var(--c-border, #c3c4c7);
    background: var(--c-surface, #fff);
    color: var(--c-text, #1d2327);
  }
  .sf-field__input::placeholder { color: var(--c-text-muted, #9a9da1); opacity: 0.8; }

  /* ── Generated CSS caption (admin chrome) ───────────────────────── */
  .slashed-preview__caption {
    margin-top: 16px;
    color: #50575e;
    font-size: 12px;
    padding-top: 12px;
    border-top: 1px solid #e9eaeb;
  }
  .slashed-preview.is-dark .slashed-preview__caption {
    color: #a7aaad;
    border-top-color: #3c434a;
  }
  .slashed-preview__caption code {
    display: block;
    background: #f6f7f7;
    padding: 8px;
    border-radius: 3px;
    margin-top: 4px;
    white-space: pre-wrap;
    font-size: 11px;
    max-height: 120px;
    overflow: auto;
  }
  .slashed-preview.is-dark .slashed-preview__caption code {
    background: #1d2327;
    color: #a7aaad;
  }
</style>
