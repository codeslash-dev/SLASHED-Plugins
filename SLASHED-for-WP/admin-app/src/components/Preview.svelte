<script>
  /**
   * Scoped live preview.
   *
   * Every framework default + the user's overrides are applied as CSS custom
   * properties on the preview root via an inline style string, so the sample
   * UI below resolves tokens exactly as the real framework would — including
   * `light-dark()` and `oklch(from …)`.
   */
  import { overrides, ui } from '../lib/store.svelte.js';
  import { buildPreviewDeclarations } from '../lib/preview.js';

  /** @type {HTMLButtonElement | undefined} */
  let closeBtn;

  // Overlay focus management (narrow viewports): the slide-over behaves like
  // a dialog, so focus lands on its close button when it opens and returns
  // to the header toggle when it unmounts. Desktop pane: no-op.
  $effect(() => {
    if (!window.matchMedia('(max-width: 1100px)').matches) return;
    closeBtn?.focus();
    return () => {
      document.querySelector('button[aria-label="Toggle preview"]')?.focus();
    };
  });

  /** Viewport width presets — the breakpoints the framework's fluid scale targets. */
  const VIEWPORTS = [
    { id: 'mobile',  emoji: '📱', label: 'Mobile',  width: 360,  hint: '360 px' },
    { id: 'tablet',  emoji: '📱', label: 'Tablet',  width: 768,  hint: '768 px' },
    { id: 'laptop',  emoji: '💻', label: 'Laptop',  width: 1024, hint: '1024 px' },
    { id: 'desktop', emoji: '🖥️', label: 'Desktop', width: 1440, hint: '1440 px' },
    { id: 'fluid',   emoji: '🌊', label: 'Fluid',   width: null, hint: 'fill pane' },
  ];

  // Combine the framework cascade with optional reduced-motion override.
  // The reduced-motion override is preview-only — it never touches the
  // user's actual override map, so they keep whatever motion-scale they
  // edited even while previewing the a11y experience.
  const baseStyle = $derived(buildPreviewDeclarations(overrides, ui.previewTheme));
  const styleStr = $derived(
    ui.previewMotion === 'reduced'
      ? `${baseStyle}\n--sf-motion-scale: 0;`
      : baseStyle
  );

  const activeViewport = $derived(VIEWPORTS.find((v) => v.id === ui.previewWidth) ?? VIEWPORTS[VIEWPORTS.length - 1]);

  const brand = ['primary', 'secondary', 'tertiary', 'action', 'neutral', 'base'];
  const status = ['success', 'warning', 'error', 'info', 'danger'];
  const surfaces = [
    { var: 'inset', label: 'Inset' },
    { var: 'bg', label: 'Background' },
    { var: 'surface', label: 'Surface' },
    { var: 'raised', label: 'Raised' },
  ];
  const spaceSteps = ['2xs', 'xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
  const typeScale = ['2xl', 'xl', 'l', 'm', 's', 'xs'];
  const radii = ['s', 'm', 'l', 'xl', 'full'];
  const shadows = ['s', 'm', 'l', 'xl'];
  const gradients = ['primary', 'secondary', 'tertiary', 'brand', 'surface'];
  const durations = ['instant', 'fast', 'normal', 'slow'];
</script>

<section class="preview">
  <header class="preview__bar">
    <div class="preview__title">
      <span class="preview__dot" aria-hidden="true"></span>
      <strong>Live preview</strong>
    </div>
    <div class="preview__viewports cfg-seg" role="group" aria-label="Preview viewport width">
      {#each VIEWPORTS as v (v.id)}
        <button
          class="cfg-seg__btn preview__vp-btn"
          class:cfg-seg__btn--on={ui.previewWidth === v.id}
          onclick={() => (ui.previewWidth = v.id)}
          aria-pressed={ui.previewWidth === v.id}
          title="{v.emoji} {v.label} — {v.hint}"
        >{v.emoji}<span class="preview__vp-text"> {v.label}</span></button>
      {/each}
    </div>
    <!-- Theme / motion toggles live in the header too, but on narrow
         viewports the slide-over overlay covers the header — so the bar
         carries its own copies (they bind the same ui state). -->
    <div class="cfg-seg preview__modes" role="group" aria-label="Preview theme and motion">
      <button
        class="cfg-seg__btn"
        class:cfg-seg__btn--on={ui.previewTheme === 'light'}
        onclick={() => (ui.previewTheme = 'light')}
        aria-pressed={ui.previewTheme === 'light'}
        title="Light preview theme"
      >☀</button>
      <button
        class="cfg-seg__btn"
        class:cfg-seg__btn--on={ui.previewTheme === 'dark'}
        onclick={() => (ui.previewTheme = 'dark')}
        aria-pressed={ui.previewTheme === 'dark'}
        title="Dark preview theme"
      >☾</button>
      <button
        class="cfg-seg__btn"
        class:cfg-seg__btn--on={ui.previewMotion === 'reduced'}
        onclick={() => (ui.previewMotion = ui.previewMotion === 'reduced' ? 'normal' : 'reduced')}
        aria-pressed={ui.previewMotion === 'reduced'}
        title="Reduced motion in preview only"
      >🐢</button>
    </div>
    <span class="preview__hint">
      {ui.previewTheme}{ui.previewMotion === 'reduced' ? ' · reduced motion' : ''}{activeViewport.width ? ` · ${activeViewport.width} px` : ''}
    </span>
    <button
      bind:this={closeBtn}
      class="preview__close"
      onclick={() => (ui.previewOpen = false)}
      title="Close the preview overlay"
      aria-label="Close preview"
    >✕</button>
  </header>

  <div class="preview__viewport">
    <div
      class="preview__stage"
      class:preview__stage--rm={ui.previewMotion === 'reduced'}
      style="{styleStr}{activeViewport.width ? `;max-inline-size:${activeViewport.width}px;margin-inline:auto;box-shadow:0 0 0 1px var(--cfg-border) inset;` : ''}"
    >
    <div class="pv">
      <!-- Typography -->
      <section class="pv__block">
        <p class="pv__eyebrow">Typography</p>
        <h2 class="pv__h">The quick brown fox</h2>
        <p class="pv__p">
          Jumps over the lazy dog. This paragraph uses the framework's body
          font, text size and <a class="pv__a" href="#a">an inline link</a>
          with <code class="pv__code">--sf-color-code</code> styling inline code.
        </p>
        <p class="pv__muted">Muted caption · secondary hierarchy · auto-contrasting.</p>
      </section>

      <section class="pv__block">
        <p class="pv__eyebrow">Display type</p>
        <p class="pv__display pv__display--l">Display L</p>
        <p class="pv__display pv__display--m">Display M</p>
        <p class="pv__display pv__display--s">Display S</p>
      </section>

      <section class="pv__block">
        <p class="pv__eyebrow">Type scale</p>
        <div class="pv__scale">
          {#each typeScale as s (s)}
            <div class="pv__scale-row">
              <span class="pv__scale-sample" style="font-size: var(--sf-text-{s});">Aa</span>
              <code>--sf-text-{s}</code>
            </div>
          {/each}
        </div>
      </section>

      <!-- Surfaces / elevation -->
      <section class="pv__block">
        <p class="pv__eyebrow">Surfaces</p>
        <div class="pv__surfaces">
          {#each surfaces as s (s.var)}
            <div class="pv__surface" style="background: var(--sf-color-{s.var});">
              <span>{s.label}</span>
            </div>
          {/each}
        </div>
      </section>

      <!-- Brand + status -->
      <section class="pv__block">
        <p class="pv__eyebrow">Brand &amp; status</p>
        <div class="pv__swatches">
          {#each brand as c (c)}
            <div class="pv__sw" style="background: var(--sf-color-{c});">
              <span style="color: var(--sf-color-text--on-{c}, #fff);">{c}</span>
            </div>
          {/each}
        </div>
        <div class="pv__swatches">
          {#each status as c (c)}
            <div class="pv__sw" style="background: var(--sf-color-{c});">
              <span style="color: var(--sf-color-text--on-{c}, #fff);">{c}</span>
            </div>
          {/each}
        </div>
      </section>

      <!-- Gradients -->
      <section class="pv__block">
        <p class="pv__eyebrow">Gradients</p>
        <div class="pv__gradients">
          {#each gradients as g (g)}
            <div class="pv__grad" style="background: var(--sf-gradient-{g}, var(--sf-color-{g}, #888));">
              <span class="pv__grad-label">{g}</span>
            </div>
          {/each}
        </div>
      </section>

      <!-- Buttons -->
      <section class="pv__block">
        <p class="pv__eyebrow">Buttons</p>
        <div class="pv__btns">
          <button class="pv__btn pv__btn--primary">Primary</button>
          <button class="pv__btn pv__btn--secondary">Secondary</button>
          <button class="pv__btn pv__btn--action">Action</button>
          <button class="pv__btn pv__btn--outline">Outline</button>
          <button class="pv__btn pv__btn--ghost">Ghost</button>
          <button class="pv__btn pv__btn--outline pv__btn--focused" tabindex="-1" aria-label="Focus ring demo">Focus ring</button>
        </div>
      </section>

      <!-- Navigation -->
      <section class="pv__block">
        <p class="pv__eyebrow">Navigation</p>
        <div class="pv__tabs" role="tablist">
          <button class="pv__tab pv__tab--active" role="tab" aria-selected="true">Overview</button>
          <button class="pv__tab" role="tab" aria-selected="false">Analytics</button>
          <button class="pv__tab" role="tab" aria-selected="false">Settings</button>
          <button class="pv__tab" role="tab" aria-selected="false">Team</button>
        </div>
        <nav class="pv__breadcrumb" aria-label="Breadcrumb">
          <a class="pv__a pv__crumb" href="#a">Home</a>
          <span class="pv__crumb-sep" aria-hidden="true">›</span>
          <a class="pv__a pv__crumb" href="#a">Products</a>
          <span class="pv__crumb-sep" aria-hidden="true">›</span>
          <span class="pv__crumb" aria-current="page">Design Tokens</span>
        </nav>
      </section>

      <!-- Feedback -->
      <section class="pv__block">
        <p class="pv__eyebrow">Feedback</p>
        <div class="pv__alerts">
          {#each status as c (c)}
            <div
              class="pv__alert"
              style="background: var(--sf-color-{c}-subtle); border-inline-start-color: var(--sf-color-{c});"
            >
              <span class="pv__badge" style="background: var(--sf-color-{c}); color: var(--sf-color-text--on-{c}, #fff);">{c}</span>
              <span class="pv__alert-text">{c} message — readable on its own subtle tint.</span>
            </div>
          {/each}
        </div>
      </section>

      <!-- Card -->
      <section class="pv__block">
        <p class="pv__eyebrow">Card component</p>
        <div class="pv__card">
          <div class="pv__card-accent"></div>
          <div class="pv__card-body">
            <div class="pv__card-top">
              <div class="pv__avatar" style="background: var(--sf-color-secondary); color: var(--sf-color-text--on-secondary, #fff);">S</div>
              <div>
                <p class="pv__card-title">Card Component</p>
                <p class="pv__card-sub">Design token preview</p>
              </div>
              <span class="pv__badge pv__badge--push" style="background: var(--sf-color-success); color: var(--sf-color-text--on-success, #fff);">Active</span>
            </div>
            <p class="pv__card-text">
              Radius, shadow, colours, surfaces and typography working together
              — every value updates live as you adjust tokens.
            </p>
            <div class="pv__card-footer">
              <span class="pv__badge" style="background: var(--sf-color-info); color: var(--sf-color-text--on-info, #fff);">Info</span>
              <span class="pv__btn pv__btn--action pv__btn--sm pv__btn--push">Save</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Form states -->
      <section class="pv__block">
        <p class="pv__eyebrow">Form states</p>
        <div class="pv__form-row">
          <label class="pv__field">
            <span class="pv__field-label">Email</span>
            <input class="pv__field-input" type="text" placeholder="you@example.com" readonly />
          </label>
          <label class="pv__field">
            <span class="pv__field-label pv__field-label--valid">Verified</span>
            <input class="pv__field-input pv__field-input--valid" type="text" value="alex@example.com" readonly />
            <span class="pv__field-hint pv__field-hint--valid">✓ Looks good</span>
          </label>
          <label class="pv__field">
            <span class="pv__field-label pv__field-label--error">Password</span>
            <input class="pv__field-input pv__field-input--error" type="text" value="abc" readonly />
            <span class="pv__field-hint pv__field-hint--error">✗ At least 8 characters</span>
          </label>
          <label class="pv__field">
            <span class="pv__field-label pv__field-label--disabled">Disabled</span>
            <input class="pv__field-input pv__field-input--disabled" type="text" placeholder="Not editable" disabled />
          </label>
        </div>
      </section>

      <!-- Spacing scale -->
      <section class="pv__block">
        <p class="pv__eyebrow">Spacing scale</p>
        <div class="pv__space">
          {#each spaceSteps as s (s)}
            <div class="pv__space-row">
              <code>--sf-space-{s}</code>
              <span class="pv__space-bar" style="inline-size: var(--sf-space-{s});"></span>
            </div>
          {/each}
        </div>
      </section>

      <!-- Border radii -->
      <section class="pv__block">
        <p class="pv__eyebrow">Border radius</p>
        <div class="pv__radii">
          {#each radii as r (r)}
            <div class="pv__radii-item">
              <span class="pv__radii-box" style="border-radius: var(--sf-radius-{r});"></span>
              <code>{r}</code>
            </div>
          {/each}
        </div>
      </section>

      <!-- Shadows -->
      <section class="pv__block">
        <p class="pv__eyebrow">Shadows</p>
        <div class="pv__shadows">
          {#each shadows as s (s)}
            <div class="pv__shadow-item" style="box-shadow: var(--sf-shadow-{s});">
              <code>{s}</code>
            </div>
          {/each}
        </div>
      </section>

      <!-- Motion & animation -->
      <section class="pv__block">
        <p class="pv__eyebrow">Motion — hit 🐢 to preview reduced motion</p>
        <div class="pv__motion-demos">
          <div class="pv__motion-cell">
            <span class="pv__anim pv__anim--pulse" style="background: var(--sf-color-success, #22c55e);"></span>
            <code class="pv__anim-label">pulse</code>
          </div>
          <div class="pv__motion-cell">
            <span class="pv__anim pv__anim--spin" style="border-color: var(--sf-color-primary, #4f8cff); border-top-color: transparent;"></span>
            <code class="pv__anim-label">spin</code>
          </div>
          <div class="pv__motion-cell">
            <span class="pv__anim pv__anim--bounce" style="background: var(--sf-color-action, #0891b2);"></span>
            <code class="pv__anim-label">bounce</code>
          </div>
          <div class="pv__motion-cell">
            <span class="pv__anim pv__anim--slide" style="background: var(--sf-color-tertiary, #888);"></span>
            <code class="pv__anim-label">slide·fade</code>
          </div>
        </div>
        <div class="pv__durations">
          {#each durations as d (d)}
            <div class="pv__dur-row">
              <code class="pv__dur-label">--sf-duration-{d}</code>
              <div class="pv__dur-track">
                <span class="pv__dur-bar" style="animation-duration: var(--sf-duration-{d}, 200ms);"></span>
              </div>
            </div>
          {/each}
        </div>
      </section>
    </div>
  </div>
  </div>
</section>

<style>
  .preview {
    grid-area: preview;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    height: 100%;
    overflow: hidden;
    background: var(--cfg-surface);
    border-left: 1px solid var(--cfg-border);
  }
  .preview__bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--cfg-border);
    flex-wrap: wrap;
  }
  .preview__viewports { flex-shrink: 0; }
  .preview__vp-btn {
    padding-inline: 9px;
    font-size: 11.5px;
  }
  .preview__viewport {
    flex: 1;
    overflow: auto;
    background: var(--cfg-bg-2);
    padding: 0;
    min-height: 0;
  }
  .preview__stage {
    /* When a viewport preset is active the stage is constrained inline so
       the surrounding `.preview__viewport` "device frame" is visible; when
       Fluid is active the stage simply fills the pane. */
    background: var(--sf-color-bg, #fff);
    color: var(--sf-color-text, #111);
    min-height: 100%;
    transition: max-inline-size 0.15s ease;
  }
  /* Reduced-motion preview mode disables transitions/animations on EVERY
     element under the stage — the preview-only --sf-motion-scale: 0 already
     zeroes durations declared via the framework, but components that ignore
     the scale still respect this scoped killswitch. */
  .preview__stage--rm,
  .preview__stage--rm *,
  .preview__stage--rm *::before,
  .preview__stage--rm *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
  }
  .preview__title { display: inline-flex; align-items: center; gap: 8px; }
  .preview__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--cfg-ok);
    box-shadow: 0 0 0 3px rgba(90, 210, 122, 0.18);
  }
  .preview__hint {
    font-size: 11px;
    color: var(--cfg-text-faint);
    text-transform: capitalize;
  }
  .preview__modes :global(.cfg-seg__btn) { padding: 4px 9px; font-size: 12px; }
  /* Close affordance for the slide-over overlay; redundant on desktop where
     the pane has the header ◨ toggle, so it only renders on narrow widths. */
  .preview__close {
    display: none;
    margin-left: auto;
    width: 26px;
    height: 26px;
    padding: 0;
    font-size: 13px;
    line-height: 1;
    color: var(--cfg-text-muted);
    background: var(--cfg-surface-2);
    border: 1px solid var(--cfg-border-strong);
    border-radius: var(--cfg-radius-s);
    cursor: pointer;
    flex-shrink: 0;
  }
  .preview__close:hover { color: var(--cfg-text); border-color: var(--cfg-accent-strong); }
  @media (max-width: 1100px) {
    /* Minimum 44 × 44 px touch target per WCAG 2.5.5. */
    .preview__close { display: inline-grid; place-items: center; min-width: 44px; min-height: 44px; }
    .preview__hint { display: none; }
    .preview__bar { flex-wrap: wrap; gap: 8px; }
  }
  /* On very narrow phones the viewport-button labels push the row past the
     pane width; show only the emoji so all five buttons stay accessible. */
  @media (max-width: 430px) {
    .preview__vp-text { display: none; }
    .preview__vp-btn { padding-inline: 7px; }
  }
  /* Sample UI authored against framework tokens with sane fallbacks. */
  .pv {
    font-family: var(--sf-font-body, system-ui, sans-serif);
    padding: clamp(16px, 3vw, 32px);
    display: flex;
    flex-direction: column;
    gap: var(--sf-space-l, 24px);
  }
  .pv__block { display: flex; flex-direction: column; gap: 8px; margin: 0; }
  .pv__eyebrow {
    margin: 0;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--sf-color-text--muted, #888);
  }
  .pv__h {
    font-family: var(--sf-font-heading, inherit);
    font-size: var(--sf-text-2xl, 2rem);
    line-height: var(--sf-leading-tight, 1.15);
    margin: 0;
    color: var(--sf-color-heading, inherit);
  }
  .pv__p {
    font-size: var(--sf-text-m, 1rem);
    margin: 0;
    max-width: 60ch;
    color: var(--sf-color-text--secondary, inherit);
  }
  .pv__muted {
    margin: 0;
    font-size: var(--sf-text-s, 0.85rem);
    color: var(--sf-color-text--muted, inherit);
  }
  .pv__display {
    margin: 0;
    font-family: var(--sf-font-display, var(--sf-font-heading, inherit));
    font-weight: var(--sf-font-weight-display, 800);
    color: var(--sf-color-heading, inherit);
    line-height: 1.05;
    overflow-wrap: anywhere;
    max-width: 100%;
  }
  .pv__display--l { font-size: var(--sf-text-display-l, 3rem); line-height: var(--sf-display-l-line-height, 1.05); }
  .pv__display--m { font-size: var(--sf-text-display-m, 2.4rem); line-height: var(--sf-display-m-line-height, 1.1); }
  .pv__display--s { font-size: var(--sf-text-display-s, 1.9rem); line-height: var(--sf-display-s-line-height, 1.15); }

  .pv__scale { display: flex; flex-direction: column; gap: 6px; }
  .pv__scale-row { display: flex; align-items: baseline; gap: 10px; }
  .pv__scale-sample {
    font-family: var(--sf-font-heading, inherit);
    color: var(--sf-color-text, inherit);
    line-height: 1.1;
    min-width: 2.2em;
  }
  .pv__scale-row code {
    font-family: var(--sf-font-mono, monospace);
    font-size: 11px;
    color: var(--sf-color-text--muted, inherit);
  }
  .pv__a { color: var(--sf-color-link, #4f8cff); }
  .pv__code {
    font-family: var(--sf-font-mono, monospace);
    background: var(--sf-color-inset, rgba(127, 127, 127, 0.15));
    padding: 0.1em 0.4em;
    border-radius: var(--sf-radius-s, 4px);
    color: var(--sf-color-code, inherit);
  }

  .pv__surfaces {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--sf-space-s, 8px);
  }
  .pv__surface {
    min-height: 54px;
    border: 1px solid var(--sf-color-border, rgba(127, 127, 127, 0.3));
    border-radius: var(--sf-radius-s, 4px);
    box-shadow: var(--sf-shadow-s, 0 1px 3px rgba(0, 0, 0, 0.1));
    display: flex;
    align-items: flex-end;
    padding: 6px 8px;
    font-size: 11px;
    font-weight: 600;
    color: var(--sf-color-text--secondary, inherit);
  }

  .pv__btns { display: flex; gap: var(--sf-space-s, 8px); flex-wrap: wrap; }
  .pv__btn {
    border: 1px solid transparent;
    border-radius: var(--sf-radius-m, 8px);
    padding: 0.5em 1.1em;
    font-weight: 600;
    font-size: var(--sf-text-s, 0.9rem);
    cursor: default;
    transition: filter 0.12s;
  }
  .pv__btn:hover { filter: brightness(1.05); }
  .pv__btn--primary { background: var(--sf-color-primary, #4f8cff); color: var(--sf-color-text--on-primary, #fff); }
  .pv__btn--secondary { background: var(--sf-color-secondary, #6b7280); color: var(--sf-color-text--on-secondary, #fff); }
  .pv__btn--action { background: var(--sf-color-action, #0891b2); color: var(--sf-color-text--on-action, #fff); }
  .pv__btn--outline {
    background: transparent;
    border-color: var(--sf-color-primary, currentColor);
    color: var(--sf-color-primary, inherit);
  }
  .pv__btn--ghost { background: transparent; border-color: var(--sf-color-border, currentColor); color: inherit; }
  .pv__btn--sm { padding: 0.35em 0.9em; font-size: var(--sf-text-xs, 0.8rem); }
  .pv__btn--push { margin-inline-start: auto; }

  .pv__swatches {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 6px;
  }
  .pv__sw {
    aspect-ratio: 3 / 2;
    border-radius: var(--sf-radius-m, 8px);
    border: 1px solid var(--sf-color-border, rgba(127, 127, 127, 0.3));
    display: flex;
    align-items: flex-end;
    padding: 6px 8px;
    font-size: 12px;
    text-transform: capitalize;
  }

  .pv__alerts { display: flex; flex-direction: column; gap: 6px; }
  .pv__alert {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: var(--sf-radius-s, 4px);
    border-inline-start: 3px solid;
    font-size: var(--sf-text-s, 0.85rem);
    color: var(--sf-color-text, inherit);
  }
  .pv__alert-text { color: var(--sf-color-text, inherit); }
  .pv__badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: var(--sf-radius-full, 999px);
    font-size: 10px;
    font-weight: 700;
    text-transform: capitalize;
    white-space: nowrap;
  }
  .pv__badge--push { margin-inline-start: auto; }

  .pv__card {
    background: var(--sf-color-surface, rgba(127, 127, 127, 0.06));
    border: 1px solid var(--sf-color-border, rgba(127, 127, 127, 0.3));
    border-radius: var(--sf-radius-m, 8px);
    box-shadow: var(--sf-shadow-m, 0 2px 8px rgba(0, 0, 0, 0.12));
    overflow: hidden;
  }
  .pv__card-accent { height: 4px; background: var(--sf-color-primary, #4f8cff); }
  .pv__card-body { padding: var(--sf-space-m, 16px); display: flex; flex-direction: column; gap: 10px; }
  .pv__card-top { display: flex; align-items: center; gap: 10px; }
  .pv__avatar {
    width: 36px; height: 36px;
    border-radius: var(--sf-radius-full, 50%);
    flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700;
  }
  .pv__card-title {
    margin: 0;
    font-family: var(--sf-font-heading, inherit);
    font-size: var(--sf-text-m, 1rem);
    font-weight: 600;
    color: var(--sf-color-heading, inherit);
    line-height: 1.3;
  }
  .pv__card-sub { margin: 0; font-size: var(--sf-text-xs, 0.8rem); color: var(--sf-color-text--muted, inherit); line-height: 1.3; }
  .pv__card-text { margin: 0; font-size: var(--sf-text-s, 0.9rem); color: var(--sf-color-text--secondary, inherit); }
  .pv__card-footer {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    padding-top: 8px;
    border-top: 1px solid var(--sf-color-border, rgba(127, 127, 127, 0.2));
  }

  .pv__field { display: flex; flex-direction: column; gap: 5px; max-width: 320px; }
  .pv__field-label { font-size: var(--sf-text-xs, 0.8rem); font-weight: 600; color: var(--sf-color-text--secondary, inherit); }
  .pv__field-input {
    font-size: var(--sf-text-s, 0.9rem);
    padding: 7px 10px;
    border-radius: var(--sf-radius-s, 4px);
    border: 1px solid var(--sf-color-border, rgba(127, 127, 127, 0.4));
    background: var(--sf-color-bg, #fff);
    color: var(--sf-color-text, inherit);
  }

  .pv__space { display: flex; flex-direction: column; gap: 4px; }
  .pv__space-row { display: flex; align-items: center; gap: 10px; font-size: 12px; overflow: hidden; }
  .pv__space-row code {
    font-family: var(--sf-font-mono, monospace);
    min-width: 13ch;
    flex-shrink: 0;
    color: var(--sf-color-text--muted, inherit);
  }
  .pv__space-bar {
    block-size: 12px;
    max-inline-size: 100%;
    background: var(--sf-color-action, #4f8cff);
    border-radius: 3px;
    flex-shrink: 1;
  }

  .pv__radii {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .pv__radii-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-family: var(--sf-font-mono, monospace);
    font-size: 11px;
    color: var(--sf-color-text--muted, inherit);
  }
  .pv__radii-box {
    width: 56px;
    height: 56px;
    background: var(--sf-color-primary, #4f8cff);
    display: block;
  }

  .pv__shadows {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 14px;
    padding: 8px 6px;
  }
  .pv__shadow-item {
    aspect-ratio: 1 / 1;
    background: var(--sf-color-surface, #fff);
    border-radius: var(--sf-radius-m, 8px);
    display: grid;
    place-items: center;
    color: var(--sf-color-text--muted, inherit);
    font-family: var(--sf-font-mono, monospace);
    font-size: 11px;
  }

  /* Gradients */
  .pv__gradients {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
    gap: 6px;
  }
  .pv__grad {
    aspect-ratio: 2 / 1;
    border-radius: var(--sf-radius-m, 8px);
    border: 1px solid var(--sf-color-border, rgba(127, 127, 127, 0.3));
    display: flex;
    align-items: flex-end;
    padding: 6px 8px;
  }
  .pv__grad-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  /* Focus ring demo button */
  .pv__btn--focused {
    outline: var(--sf-focus-ring-width, 2px) solid var(--sf-focus-ring-color, var(--sf-color-primary, #4f8cff));
    outline-offset: var(--sf-focus-ring-offset, 2px);
  }

  /* Navigation: tabs */
  .pv__tabs {
    display: flex;
    border-bottom: 1px solid var(--sf-color-border, rgba(127, 127, 127, 0.3));
    flex-wrap: wrap;
  }
  .pv__tab {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    padding: 7px 14px;
    font-size: var(--sf-text-s, 0.875rem);
    font-weight: 500;
    color: var(--sf-color-text--muted, #888);
    cursor: default;
    margin-bottom: -1px;
  }
  .pv__tab--active {
    color: var(--sf-color-primary, #4f8cff);
    border-bottom-color: var(--sf-color-primary, #4f8cff);
    font-weight: 600;
  }

  /* Navigation: breadcrumb */
  .pv__breadcrumb {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: var(--sf-text-s, 0.875rem);
    flex-wrap: wrap;
  }
  .pv__crumb { text-decoration: none; }
  .pv__crumb[aria-current="page"] { color: var(--sf-color-text, inherit); font-weight: 500; }
  .pv__crumb-sep { color: var(--sf-color-text--muted, #888); }

  /* Form states */
  .pv__form-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 10px;
  }
  .pv__field-label--valid { color: var(--sf-color-success, #16a34a); }
  .pv__field-label--error { color: var(--sf-color-error, #dc2626); }
  .pv__field-label--disabled { color: var(--sf-color-text--muted, #888); }
  .pv__field-input--valid {
    border-color: var(--sf-color-success, #16a34a);
    background: var(--sf-color-success-subtle, rgba(22, 163, 74, 0.08));
  }
  .pv__field-input--error {
    border-color: var(--sf-color-error, #dc2626);
    background: var(--sf-color-error-subtle, rgba(220, 38, 38, 0.08));
  }
  .pv__field-input--disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--sf-color-inset, rgba(127, 127, 127, 0.1));
  }
  .pv__field-hint {
    font-size: var(--sf-text-xs, 0.75rem);
    margin-top: -2px;
  }
  .pv__field-hint--valid { color: var(--sf-color-success, #16a34a); }
  .pv__field-hint--error { color: var(--sf-color-error, #dc2626); }

  /* Motion & animation */
  .pv__motion-demos {
    display: flex;
    gap: var(--sf-space-l, 24px);
    flex-wrap: wrap;
    padding: 4px 0;
  }
  .pv__motion-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .pv__anim-label {
    font-family: var(--sf-font-mono, monospace);
    font-size: 10px;
    color: var(--sf-color-text--muted, #888);
    white-space: nowrap;
  }
  .pv__anim {
    display: block;
    width: 28px;
    height: 28px;
    border-radius: var(--sf-radius-full, 999px);
  }
  @keyframes pv-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
  }
  @keyframes pv-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pv-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes pv-slide {
    0% { opacity: 0.25; transform: translateX(-10px); }
    50% { opacity: 1; transform: translateX(0); }
    100% { opacity: 0.25; transform: translateX(10px); }
  }
  @keyframes pv-sweep {
    0% { transform: scaleX(0); transform-origin: left; }
    50% { transform: scaleX(1); transform-origin: left; }
    51% { transform: scaleX(1); transform-origin: right; }
    100% { transform: scaleX(0); transform-origin: right; }
  }
  .pv__anim--pulse {
    animation: pv-pulse var(--sf-duration-slow, 900ms) var(--sf-ease-in-out, ease-in-out) infinite;
  }
  .pv__anim--spin {
    border: 3px solid;
    border-radius: var(--sf-radius-full, 999px);
    animation: pv-spin var(--sf-duration-slow, 700ms) linear infinite;
  }
  .pv__anim--bounce {
    border-radius: var(--sf-radius-m, 8px);
    animation: pv-bounce var(--sf-duration-slow, 700ms) var(--sf-ease-in-out, ease-in-out) infinite;
  }
  .pv__anim--slide {
    border-radius: var(--sf-radius-m, 8px);
    animation: pv-slide calc(var(--sf-duration-slow, 700ms) * 1.5) var(--sf-ease-in-out, ease-in-out) infinite;
  }
  .pv__durations {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 4px;
  }
  .pv__dur-row {
    display: flex;
    align-items: center;
    gap: 10px;
    overflow: hidden;
  }
  .pv__dur-label {
    font-family: var(--sf-font-mono, monospace);
    font-size: 11px;
    color: var(--sf-color-text--muted, #888);
    min-width: 16ch;
    flex-shrink: 0;
  }
  .pv__dur-track {
    flex: 1;
    height: 10px;
    background: var(--sf-color-inset, rgba(127, 127, 127, 0.12));
    border-radius: var(--sf-radius-full, 999px);
    overflow: hidden;
    position: relative;
  }
  .pv__dur-bar {
    display: block;
    height: 100%;
    background: var(--sf-color-primary, #4f8cff);
    border-radius: inherit;
    animation: pv-sweep var(--sf-duration-normal, 250ms) linear infinite;
  }
</style>
