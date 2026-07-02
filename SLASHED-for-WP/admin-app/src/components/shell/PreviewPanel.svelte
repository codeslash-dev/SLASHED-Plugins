<script lang="ts">
  import { Sun, Moon, Smartphone, Tablet, Monitor, RefreshCw, ExternalLink, Columns2 } from '@lucide/svelte';
  import type { PreviewTemplate } from '../../types';
  import { generateCSS } from '../../lib/codec';
  import { computeDerivedOverrides } from '../../lib/persistence';
  import { registerPreviewDoc, bumpPreviewVersion } from '../../lib/previewResolver.svelte';
  import { lumlockerPreview } from '../../lib/lumlockerPreview.svelte';
  // Import the built framework CSS at Vite compile time — always in sync with badges/.
  // The @framework-css alias is remapped by the WP plugin to its vendored bundle.
  import frameworkCSSStatic from '@framework-css/badges/slashed.full.css?raw';

  let { overrides, previewTheme, previewWidth, previewMotion, previewTemplate,
    onThemeChange, onWidthChange, onMotionChange, onTemplateChange }: {
    overrides: Record<string, string>;
    previewTheme: "light" | "dark";
    previewWidth: "fluid" | "mobile" | "tablet" | "desktop";
    previewMotion: "normal" | "slow" | "none";
    previewTemplate: PreviewTemplate;
    onThemeChange: (t: "light" | "dark") => void;
    onWidthChange: (w: "fluid" | "mobile" | "tablet" | "desktop") => void;
    onMotionChange: (m: "normal" | "slow" | "none") => void;
    onTemplateChange: (t: PreviewTemplate) => void;
  } = $props();

  function withDerivedOverrides(ov: Record<string, string>): Record<string, string> {
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const derived = computeDerivedOverrides(ov, { reduceMotion });
    return Object.keys(derived).length > 0 ? { ...derived, ...ov } : ov;
  }

  const TEMPLATES: { id: PreviewTemplate; label: string }[] = [
    { id: "marketing", label: "Marketing" },
    { id: "components", label: "Components" },
    { id: "stylescape", label: "Stylescape" },
  ];

  // --- Google Fonts helpers ---

  const SYSTEM_FONT_NAMES = new Set([
    "system-ui", "-apple-system", "BlinkMacSystemFont",
    "ui-monospace", "ui-serif", "ui-sans-serif",
    "sans-serif", "serif", "monospace", "cursive", "fantasy",
    "Georgia", "Times New Roman", "Times", "Impact",
    "Arial Narrow", "Arial", "Helvetica", "Helvetica Neue",
    "Courier New", "Courier", "Fira Code", "Verdana",
  ]);

  function extractFontName(familyValue: string): string | null {
    if (!familyValue?.trim()) return null;
    const quotedMatch = familyValue.trim().match(/^['"]([^'"]+)['"]/);
    const name = quotedMatch ? quotedMatch[1] : familyValue.split(",")[0];
    const trimmed = name.trim();
    return trimmed && !SYSTEM_FONT_NAMES.has(trimmed) ? trimmed : null;
  }

  function getGoogleFonts(ov: Record<string, string>): { name: string; url: string }[] {
    const seen = new Set<string>();
    const result: { name: string; url: string }[] = [];
    for (const token of ["--sf-font-body", "--sf-font-heading", "--sf-font-mono"]) {
      const name = extractFontName(ov[token] ?? "");
      if (!name || seen.has(name)) continue;
      seen.add(name);
      result.push({
        name,
        url: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap`,
      });
    }
    return result;
  }

  function injectFontsIntoDoc(doc: Document, ov: Record<string, string>) {
    for (const { name, url } of getGoogleFonts(ov)) {
      const id = `gf-${name.replace(/\s+/g, "-").toLowerCase()}`;
      if (!doc.getElementById(id)) {
        const link = doc.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = url;
        doc.head.appendChild(link);
      }
    }
  }

  // Preview "skin": presentational classes for the demo templates. SLASHED is
  // BEM-first and ships no utility classes, so the demos lean on real framework
  // classes (.pv-btn, .pv-card, .sf-container, …) plus this thin skin for the
  // bits the framework has no class for (token swatch grids, the type-scale
  // ramp, demo chrome). EVERY value here references a live --sf-* token, so the
  // configurator panels drive these classes exactly like the framework's own —
  // and there is not a single inline style left in the template bodies.
  const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const RADII = ["xs", "s", "m", "l", "xl", "2xl", "full"];
  const SHADOWS = ["xs", "s", "m", "l", "xl", "2xl"];
  const SPACES = ["3xs", "2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"];
  const TYPE_STEPS = ["display-l", "display-m", "display-s", "2xl", "xl", "l", "m", "s", "xs"];

  function previewSkinCSS(): string {
    const ramp = (cls: string, token: string, fallback?: string) =>
      RAMP_STEPS.map(
        (s) =>
          `.pv-sw--${cls}-${s}{background:var(--sf-color-${token}-${s}${
            fallback ? `,var(--sf-color-${fallback}-${s})` : ""
          });}`
      ).join("");
    return `
    /* Text roles (core ships no utility classes — these mirror semantic tokens) */
    .pv-eyebrow{font-size:var(--sf-text-xs);font-weight:var(--sf-font-weight-heading);text-transform:uppercase;letter-spacing:0.08em;color:var(--sf-color-text--muted);}
    .pv-lead{font-size:var(--sf-text-l);color:var(--sf-color-text--secondary);}
    .pv-muted{color:var(--sf-color-text--muted);}
    .pv-secondary{color:var(--sf-color-text--secondary);}
    .pv-accent{color:var(--sf-color-primary-600);}
    .pv-on-primary{color:var(--sf-color-text--on-primary);}
    .pv-center-text{text-align:center;}
    .pv-emoji{font-size:2rem;line-height:1;}
    .pv-brand{font-weight:700;font-size:var(--sf-text-l);color:var(--sf-color-primary-600);}
    .pv-measure{max-inline-size:34rem;}
    /* BEM components — .sf-btn / .sf-card / .sf-tag / .sf-field are staged off in
       core until v0.8, so the preview ships its own token-driven equivalents.
       These mirror the framework's reserved definitions one-to-one. */
    .pv-btn{display:inline-flex;align-items:center;justify-content:center;gap:var(--sf-space-2xs);padding-block:var(--sf-space-xs);padding-inline:var(--sf-space-m);min-block-size:var(--sf-touch-target);font-family:inherit;font-size:var(--sf-text-m);font-weight:var(--sf-font-weight-interactive);line-height:var(--sf-leading-tight);white-space:nowrap;text-decoration:none;border:var(--sf-border-width-1) solid var(--sf-color-action);border-radius:var(--sf-radius-m);cursor:pointer;background:var(--sf-color-action);color:var(--sf-color-text--on-action);transition:var(--sf-transition-form-field);}
    .pv-btn--primary{background:var(--sf-color-primary);color:var(--sf-color-text--on-primary);border-color:var(--sf-color-primary);}
    .pv-btn--secondary{background:transparent;color:var(--sf-color-action);border-color:var(--sf-color-action);}
    .pv-btn--ghost{background:transparent;color:var(--sf-color-action);border-color:transparent;}
    .pv-btn--neutral{background:var(--sf-color-neutral);color:var(--sf-color-text--on-neutral);border-color:var(--sf-color-neutral);}
    .pv-btn--danger{background:var(--sf-color-danger);color:var(--sf-color-text--on-danger);border-color:var(--sf-color-danger);}
    .pv-btn--block{inline-size:100%;}
    .pv-btn:disabled{opacity:var(--sf-opacity-disabled);cursor:not-allowed;}
    /* No 'display' here: .pv-card is unlayered and would beat .sf-stack's
       layered flex, breaking 'pv-card sf-stack' combos. Default block is fine. */
    .pv-card{padding:var(--sf-space-l);background:var(--sf-color-surface);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-l);box-shadow:var(--sf-shadow-s);}
    .pv-tag{display:inline-flex;align-items:center;gap:var(--sf-space-2xs);padding-block:var(--sf-space-3xs,0.125rem);padding-inline:var(--sf-space-xs);font-size:var(--sf-text-xs);line-height:var(--sf-leading-tight);white-space:nowrap;background:var(--sf-color-inset);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-s);color:var(--sf-color-text);}
    .pv-tag--primary{color:var(--sf-color-action);border-color:var(--sf-color-action);background:color-mix(in oklab,var(--sf-color-action) 8%,var(--sf-color-surface));}
    .pv-tag--info{color:var(--sf-color-info);border-color:var(--sf-color-info);background:color-mix(in oklab,var(--sf-color-info) 8%,var(--sf-color-surface));}
    .pv-field{display:grid;gap:var(--sf-space-2xs);align-content:start;}
    .pv-field__label{font-size:var(--sf-text-s);font-weight:var(--sf-font-weight-interactive);color:var(--sf-color-text);}
    /* Demo chrome */
    .pv-header{padding-block:var(--sf-space-s);border-block-end:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);background:var(--sf-color-surface);}
    .pv-panel{background:var(--sf-color-surface);border-inline-end:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);}
    .pv-cta{background:var(--sf-gradient-primary);border-radius:var(--sf-radius-xl);}
    .pv-code-block{font-family:var(--sf-font-mono);font-size:var(--sf-text-s);background:var(--sf-color-inset);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-m);padding:var(--sf-space-m) var(--sf-space-l);color:var(--sf-color-text);}
    /* Sidebar nav */
    .pv-nav{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:2px;}
    .pv-nav__item{padding:var(--sf-space-2xs) var(--sf-space-xs);border-radius:var(--sf-radius-s);font-size:var(--sf-text-s);color:var(--sf-color-text--secondary);cursor:pointer;}
    .pv-nav__item.is-active{background:var(--sf-color-primary-100);color:var(--sf-color-primary-700);font-weight:600;}
    /* Stat blocks */
    .pv-stat{font-size:var(--sf-text-2xl);font-weight:800;line-height:var(--sf-leading-tight);color:var(--sf-color-heading);}
    .pv-stat-label{font-size:var(--sf-text-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--sf-color-text--muted);}
    .pv-delta{font-size:var(--sf-text-xs);}
    .pv-delta--up{color:var(--sf-color-success);}
    .pv-delta--down{color:var(--sf-color-danger);}
    .pv-delta--flat{color:var(--sf-color-warning);}
    /* Type-scale ramp — one class per scale step, all token-driven */
    ${TYPE_STEPS.map((t) => `.pv-type--${t}{font-size:var(--sf-text-${t});line-height:var(--sf-leading-tight);}`).join("")}
    /* Colour ramps */
    .pv-ramp{display:flex;gap:2px;block-size:36px;border-radius:var(--sf-radius-m);overflow:hidden;}
    .pv-ramp>*{flex:1;}
    ${ramp("primary", "primary")}
    ${ramp("base", "base")}
    ${ramp("action", "action", "primary")}
    .pv-chip{display:block;inline-size:28px;block-size:28px;border-radius:var(--sf-radius-s);}
    .pv-chip--success{background:var(--sf-color-success);}
    .pv-chip--warning{background:var(--sf-color-warning);}
    .pv-chip--danger{background:var(--sf-color-danger);}
    .pv-chip--info{background:var(--sf-color-info);}
    /* Gradients */
    .pv-grad{block-size:44px;border-radius:var(--sf-radius-m);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);}
    .pv-grad--primary{background:var(--sf-gradient-primary);}
    .pv-grad--brand{background:var(--sf-gradient-brand);}
    .pv-grad--tertiary{background:var(--sf-gradient-tertiary);}
    .pv-grad--surface{background:var(--sf-gradient-surface);}
    /* Radius + shadow demo boxes */
    .pv-demo-box{inline-size:52px;block-size:52px;background:var(--sf-color-primary-100);border:2px solid var(--sf-color-primary-300);}
    ${RADII.map((r) => `.pv-radius--${r}{border-radius:var(--sf-radius-${r});}`).join("")}
    .pv-shadow-box{inline-size:52px;block-size:52px;background:var(--sf-color-surface);border-radius:var(--sf-radius-m);}
    ${SHADOWS.map((s) => `.pv-shadow--${s}{box-shadow:var(--sf-shadow-${s});}`).join("")}
    /* Spacing scale bars */
    .pv-space-bar{background:var(--sf-color-primary-400);border-radius:2px;min-inline-size:3px;min-block-size:3px;}
    ${SPACES.map((s) => {
      // --sf-space-3xs is not a defined core token (core starts at 2xs); give it
      // the same fallback the framework uses elsewhere so the bar still renders.
      const size = s === "3xs" ? "var(--sf-space-3xs,0.125rem)" : `var(--sf-space-${s})`;
      return `.pv-space--${s}{inline-size:${size};block-size:${size};}`;
    }).join("")}
    .pv-swatch-label{font-size:var(--sf-text-2xs);font-family:var(--sf-font-mono);color:var(--sf-color-text--muted);}
    /* Stylescape demo layout */
    .pv-heading{font-family:var(--sf-font-heading);color:var(--sf-color-heading);}
    .pv-strong{font-weight:var(--sf-font-weight-heading);}
    .pv-ramp-row{display:grid;grid-template-columns:4rem 1fr;gap:var(--sf-space-s);align-items:center;}
    .pv-spacing-track{display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--sf-space-xs);}
    /* Tinted card variants — unlayered, so they reliably override .pv-card's bg */
    .pv-card--primary{background:var(--sf-color-primary);color:var(--sf-color-text--on-primary);}
    .pv-card--soft{background:var(--sf-color-primary-100);color:var(--sf-color-primary-700);}`;
  }

  const MARKETING_BODY = `
<header class="pv-header">
  <div class="sf-container sf-cluster sf-cluster--between">
    <span class="pv-brand">SlashedUI</span>
    <nav class="sf-cluster sf-cluster--m">
      <a class="sf-link--subtle" href="#">Docs</a>
      <a class="sf-link--subtle" href="#">Components</a>
      <a class="sf-link--subtle" href="#">Themes</a>
    </nav>
    <button class="pv-btn pv-btn--primary">Get Started</button>
  </div>
</header>
<main class="sf-container sf-section">
  <section class="sf-stack sf-stack--l sf-stack--center pv-center-text sf-section--s">
    <span class="pv-tag pv-tag--primary">✨ Now in v2 — OKLCH color engine</span>
    <h1 class="pv-type--display-l">Design systems,<br/><span class="pv-accent">perfected.</span></h1>
    <p class="pv-lead pv-measure">A CSS framework built on 840 design tokens. One line to install, infinitely customisable.</p>
    <div class="sf-cluster sf-cluster--center">
      <button class="pv-btn pv-btn--primary">Start for free</button>
      <button class="pv-btn pv-btn--ghost">View docs →</button>
    </div>
  </section>
  <section class="sf-grid sf-grid-cols-3 sf-section--s">
    <article class="pv-card sf-stack sf-stack--xs">
      <div class="pv-emoji">🎨</div>
      <h3>OKLCH Colors</h3>
      <p class="pv-secondary">Perceptually uniform color ramps with auto dark-mode derivation.</p>
    </article>
    <article class="pv-card sf-stack sf-stack--xs">
      <div class="pv-emoji">📐</div>
      <h3>Fluid Scales</h3>
      <p class="pv-secondary">Type and space that scales smoothly from mobile to 4K.</p>
    </article>
    <article class="pv-card sf-stack sf-stack--xs">
      <div class="pv-emoji">⚡</div>
      <h3>Zero JS</h3>
      <p class="pv-secondary">Pure CSS custom properties — works with any framework.</p>
    </article>
  </section>
  <section class="pv-cta sf-section sf-stack sf-stack--m sf-stack--center pv-center-text pv-on-primary">
    <h2 class="pv-type--display-s">Ready to ship faster?</h2>
    <p>Join 12,000+ developers using SLASHED in production.</p>
    <button class="pv-btn pv-btn--neutral">Install now — it's free</button>
  </section>
</main>`;

  const COMPONENTS_BODY = `
<div class="sf-container sf-section sf-stack sf-stack--xl">
  <h2>Component showcase</h2>
  <section class="sf-stack sf-stack--s">
    <div class="pv-eyebrow">Buttons</div>
    <div class="sf-cluster">
      <button class="pv-btn pv-btn--primary">Primary</button>
      <button class="pv-btn pv-btn--secondary">Secondary</button>
      <button class="pv-btn pv-btn--ghost">Ghost</button>
      <button class="pv-btn pv-btn--danger">Danger</button>
      <button class="pv-btn pv-btn--primary" disabled>Disabled</button>
    </div>
  </section>
  <section class="sf-stack sf-stack--s">
    <div class="pv-eyebrow">Form &amp; links</div>
    <label class="pv-field pv-measure">
      <span class="pv-field__label">Your handle</span>
      <input type="text" placeholder="Type here — see caret &amp; focus ring" />
    </label>
    <p class="pv-secondary">Read the <a href="#">documentation link</a> to learn more.</p>
    <hr class="sf-divider" />
  </section>
  <section class="sf-stack sf-stack--s">
    <div class="pv-eyebrow">Typography ramp</div>
    <div class="sf-stack sf-stack--xs">
      <span class="pv-type--display-m">Display M</span>
      <span class="pv-type--2xl">Heading 2XL</span>
      <span class="pv-type--xl">Heading XL</span>
      <span class="pv-type--m pv-secondary">Body text. The quick brown fox jumps over the lazy dog.</span>
      <span class="pv-type--s pv-muted">Small caption text for metadata and secondary info.</span>
    </div>
  </section>
</div>`;

  const swatchRow = (label: string, cls: string) =>
    `<div class="pv-ramp-row"><span class="pv-swatch-label">${label}</span><div class="pv-ramp">${RAMP_STEPS.map((s) => `<i class="pv-sw--${cls}-${s}"></i>`).join("")}</div></div>`;

  const STYLESCAPE_BODY = `
<div class="sf-container sf-section sf-stack sf-stack--2xl">

  <header class="sf-stack sf-stack--s">
    <div class="sf-cluster sf-cluster--s">
      <span class="pv-type--display-s pv-heading pv-strong">Design System</span>
      <span class="pv-tag pv-tag--primary">Stylescape</span>
    </div>
    <hr class="sf-divider" />
  </header>

  <section class="sf-stack sf-stack--m">
    <div class="pv-eyebrow">Color palette</div>
    ${swatchRow("Primary", "primary")}
    ${swatchRow("Action", "action")}
    ${swatchRow("Neutral", "base")}
    <div class="sf-grid sf-grid-cols-4">
      ${[["success", "Success"], ["warning", "Warning"], ["danger", "Danger"], ["info", "Info"]]
        .map(([cls, label]) => `<article class="pv-card sf-stack sf-stack--xs"><span class="pv-chip pv-chip--${cls}"></span><span class="pv-swatch-label">${label}</span></article>`)
        .join("")}
    </div>
    <div class="pv-swatch-label">Gradients</div>
    <div class="sf-grid sf-grid-cols-4">
      ${["primary", "brand", "tertiary", "surface"]
        .map((g) => `<div class="sf-stack sf-stack--xs"><div class="pv-grad pv-grad--${g}"></div><span class="pv-swatch-label">${g}</span></div>`)
        .join("")}
    </div>
  </section>

  <section class="sf-stack sf-stack--m">
    <div class="pv-eyebrow">Typography</div>
    <div class="pv-card sf-stack sf-stack--xs">
      <span class="pv-type--display-l pv-heading pv-strong">The quick brown fox</span>
      <span class="pv-type--display-m pv-heading pv-strong">jumps over the lazy dog</span>
      <span class="pv-type--display-s pv-heading pv-secondary">Display S — heading family</span>
    </div>
    <div class="sf-grid sf-grid-cols-2">
      <div class="sf-stack sf-stack--xs">
        <span class="pv-type--2xl pv-heading pv-strong">Heading 2XL</span>
        <span class="pv-type--xl pv-heading pv-strong">Heading XL</span>
        <span class="pv-type--l pv-heading pv-strong">Heading L</span>
        <span class="pv-type--m pv-heading pv-strong">Heading M</span>
        <span class="pv-type--s pv-heading pv-strong pv-secondary">Heading S</span>
        <span class="pv-eyebrow">Label / overline</span>
      </div>
      <div class="sf-prose sf-stack sf-stack--s">
        <p>Body — The quick brown fox jumps over the lazy dog. Good typography establishes hierarchy and builds trust with readers.</p>
        <p class="pv-secondary">Secondary — supporting text, descriptions, and metadata that help without competing with the primary content.</p>
        <p class="pv-muted">Micro / caption text for timestamps, tags, and helper copy.</p>
        <p><code>const tokens = design()</code></p>
        <p><strong>Bold</strong> — <em>italic</em> — <u>underline</u> — <s>strikethrough</s></p>
      </div>
    </div>
  </section>

  <div class="sf-grid sf-grid-cols-2">
    <section class="sf-stack sf-stack--m">
      <div class="pv-eyebrow">Border radius</div>
      <div class="sf-cluster">
        ${RADII.map((r) => `<div class="sf-stack sf-stack--xs sf-stack--center pv-center-text"><div class="pv-demo-box pv-radius--${r}"></div><span class="pv-swatch-label">${r}</span></div>`).join("")}
      </div>
    </section>
    <section class="sf-stack sf-stack--m">
      <div class="pv-eyebrow">Shadows</div>
      <div class="sf-cluster">
        ${SHADOWS.map((s) => `<div class="sf-stack sf-stack--xs sf-stack--center pv-center-text"><div class="pv-shadow-box pv-shadow--${s}"></div><span class="pv-swatch-label">${s}</span></div>`).join("")}
      </div>
    </section>
  </div>

  <section class="sf-stack sf-stack--m">
    <div class="pv-eyebrow">Components</div>
    <div class="sf-cluster">
      <button class="pv-btn pv-btn--primary">Primary</button>
      <button class="pv-btn pv-btn--secondary">Secondary</button>
      <button class="pv-btn pv-btn--ghost">Ghost</button>
      <button class="pv-btn pv-btn--danger">Danger</button>
      <button class="pv-btn pv-btn--primary" disabled>Disabled</button>
    </div>
    <div class="sf-grid sf-grid-cols-3">
      <article class="pv-card sf-stack sf-stack--xs">
        <div class="sf-icon sf-icon--boxed">🎨</div>
        <span class="pv-heading pv-strong">Feature card</span>
        <p class="pv-secondary">Design tokens that adapt to your brand and context automatically.</p>
      </article>
      <article class="pv-card pv-card--primary sf-stack sf-stack--xs">
        <span class="pv-eyebrow pv-on-primary">Active users</span>
        <span class="pv-type--display-s pv-strong">12,431</span>
        <span class="pv-delta">↑ 8.4% this week</span>
        <button class="pv-btn pv-btn--neutral">View report →</button>
      </article>
      <article class="pv-card sf-stack sf-stack--s">
        <label class="pv-field">
          <span class="pv-field__label">Email address</span>
          <input type="email" placeholder="you@example.com" />
        </label>
        <button class="pv-btn pv-btn--primary pv-btn--block">Subscribe</button>
      </article>
    </div>
  </section>

  <section class="sf-stack sf-stack--m">
    <div class="pv-eyebrow">Layouts &amp; macros</div>
    <h3 class="sf-text-gradient pv-type--2xl pv-strong">.sf-text-gradient heading</h3>
    <div class="sf-divider sf-divider--gradient"></div>

    <span class="pv-swatch-label">.sf-cluster</span>
    <div class="sf-cluster">
      <span class="pv-tag">Tag</span>
      <span class="pv-tag pv-tag--primary">Another</span>
      <span class="pv-tag pv-tag--info">Ghost</span>
      <span class="pv-tag">Wraps nicely</span>
    </div>

    <span class="pv-swatch-label">.sf-grid</span>
    <div class="sf-grid sf-grid--m">
      <div class="pv-card pv-secondary">Grid item 1</div>
      <div class="pv-card pv-secondary">Grid item 2</div>
      <div class="pv-card pv-secondary">Grid item 3</div>
    </div>

    <span class="pv-swatch-label">.sf-sidebar + .sf-stack</span>
    <div class="sf-sidebar sf-sidebar--narrow">
      <div class="pv-card pv-card--soft sf-stack sf-stack--xs">
        <span class="pv-strong">Sidebar</span>
        <span>Stacked</span>
        <span>items</span>
      </div>
      <div class="pv-card pv-secondary">Main content area — the sidebar holds its width while this region fills the rest, collapsing to a single column when space runs out.</div>
    </div>
  </section>

  <section class="sf-stack sf-stack--m">
    <div class="pv-eyebrow">Spacing scale</div>
    <div class="pv-card pv-spacing-track">
      ${SPACES.map((s) => `<div class="sf-stack sf-stack--xs sf-stack--center pv-center-text"><div class="pv-space-bar pv-space--${s}"></div><span class="pv-swatch-label">${s}</span></div>`).join("")}
    </div>
  </section>

</div>`;

  const BODIES: Record<PreviewTemplate, string> = {
    marketing: MARKETING_BODY,
    components: COMPONENTS_BODY,
    stylescape: STYLESCAPE_BODY,
  };

  function buildIframeHTML(
    ov: Record<string, string>,
    theme: "light" | "dark",
    motion: "normal" | "slow" | "none",
    template: PreviewTemplate,
    frameworkCSS: string,
  ): string {
    const css = generateCSS(withDerivedOverrides(ov), { mode: "root", banner: false });
    const motionCSS =
      motion === "slow"
        ? "*, *::before, *::after { transition-duration: 200% !important; animation-duration: 200% !important; }"
        : motion === "none"
        ? "*, *::before, *::after { transition: none !important; animation: none !important; }"
        : "";

    const fontLinks = getGoogleFonts(ov)
      .map(({ url }) => `  <link rel="stylesheet" href="${url}">`)
      .join("\n");

    return `<!DOCTYPE html>
<html lang="en" data-theme="${theme}">
<head>
  <meta charset="UTF-8">
  <title>SLASHED Preview</title>
${fontLinks ? fontLinks + "\n" : ""}  <style id="slashed-framework">${frameworkCSS}</style>
  <style id="slashed-overrides">${css}</style>
  <!-- Preview skin: presentational classes for the demo templates, every value
       token-driven. Buttons, cards, inputs etc. come from the real framework
       bundle above — nothing here re-implements them. -->
  <style id="slashed-preview-skin">
    html, body { height: 100%; margin: 0; padding: 0; }
    body { box-sizing: border-box; }
    ${previewSkinCSS()}
    ${motionCSS}
  </style>
</head>
<body>
${BODIES[template]}
</body>
</html>`;
  }

  let splitMode = $state(false);

  let iframeEl = $state<HTMLIFrameElement | null>(null);
  let splitLightEl = $state<HTMLIFrameElement | null>(null);
  let splitDarkEl = $state<HTMLIFrameElement | null>(null);
  // Counters increment on every load event so effects re-run after iframe reloads.
  let loadCount = $state(0);
  let splitLightLoadCount = $state(0);
  let splitDarkLoadCount = $state(0);
  let refresh = $state(0);

  // srcdoc only encodes layout/motion/template — overrides and theme are applied
  // by the effects below, avoiding a full iframe reload on every token change.
  let html = $derived(buildIframeHTML({}, previewTheme, previewMotion, previewTemplate, frameworkCSSStatic));
  let htmlLight = $derived(buildIframeHTML({}, "light", previewMotion, previewTemplate, frameworkCSSStatic));
  let htmlDark = $derived(buildIframeHTML({}, "dark", previewMotion, previewTemplate, frameworkCSSStatic));

  // SL-020: the DOM writes below (style/attribute mutation on the iframe
  // document, plus bumpPreviewVersion()'s resolveCache.clear()) are cheap
  // individually but these effects re-run on every override tick — e.g. every
  // input event while dragging a slider, many times per animation frame.
  // rAF-coalescing collapses a burst of same-frame reruns into a single
  // apply using the latest captured values ("coalesce to latest"), since only
  // the frame actually painted to the user matters. The effect body above
  // this comment still runs synchronously on every change (so Svelte's
  // dependency tracking is unaffected) — only the DOM-writing work below is
  // deferred. The `return () => cancelAnimationFrame(rafId)` cleanup fires
  // before Svelte re-runs this effect (or on unmount), so a still-pending
  // frame from a superseded run is cancelled before scheduling the next one.
  $effect(() => {
    const _ov = overrides;
    const _theme = previewTheme;
    const _count = loadCount;
    const _lock = lumlockerPreview.value;

    const rafId = requestAnimationFrame(() => {
      const iframe = iframeEl;
      if (_count === 0 || !iframe) return;
      const doc = iframe.contentDocument;
      if (!doc) return;

      const styleEl = doc.getElementById("slashed-overrides");
      if (styleEl) {
        styleEl.textContent = generateCSS(withDerivedOverrides(_ov), { mode: "root", banner: false });
      }

      injectFontsIntoDoc(doc, _ov);

      // Framework activates dark mode via [data-theme="dark"] (color-scheme +
      // light-dark()), NOT a class — keep this in sync with buildIframeHTML.
      doc.documentElement.setAttribute("data-theme", _theme);

      // Luminance lock preview — mirrors :root[data-lumlocker] in core/themes.css.
      if (_lock) doc.documentElement.setAttribute("data-lumlocker", "");
      else doc.documentElement.removeAttribute("data-lumlocker");

      // This single-mode iframe is the canonical resolver source.
      // registerPreviewDoc() always bumps internally (both its
      // activeDoc-unchanged early-return and its replace-doc path do), so an
      // explicit bumpPreviewVersion() here would double-bump/double-clear
      // resolveCache for no reason.
      registerPreviewDoc(doc);
    });

    return () => cancelAnimationFrame(rafId);
  });

  $effect(() => {
    const _splitMode = splitMode;
    const _ov = overrides;
    const _lightCount = splitLightLoadCount;
    const _darkCount = splitDarkLoadCount;
    const _lock = lumlockerPreview.value;

    // Split iframes only exist in the DOM under {#if splitMode} below — skip
    // scheduling entirely rather than doing per-frame no-op work while the
    // single-iframe effect above is the one actually driving the preview.
    if (!_splitMode) return;

    const rafId = requestAnimationFrame(() => {
      const css = generateCSS(withDerivedOverrides(_ov), { mode: "root", banner: false });

      const applyLock = (doc: Document) => {
        if (_lock) doc.documentElement.setAttribute("data-lumlocker", "");
        else doc.documentElement.removeAttribute("data-lumlocker");
      };

      // registerPreviewDoc() (light pane) already bumps internally; only
      // bump explicitly when the dark pane was the sole one updated this
      // frame, so consumers still get notified without double-bumping.
      let lightApplied = false;
      let darkApplied = false;

      if (splitLightEl && _lightCount > 0) {
        const doc = splitLightEl.contentDocument;
        if (doc) {
          const styleEl = doc.getElementById("slashed-overrides");
          if (styleEl) styleEl.textContent = css;
          injectFontsIntoDoc(doc, _ov);
          applyLock(doc);
          // In split mode the light pane is the canonical resolver source.
          registerPreviewDoc(doc);
          lightApplied = true;
        }
      }
      if (splitDarkEl && _darkCount > 0) {
        const doc = splitDarkEl.contentDocument;
        if (doc) {
          const styleEl = doc.getElementById("slashed-overrides");
          if (styleEl) styleEl.textContent = css;
          injectFontsIntoDoc(doc, _ov);
          applyLock(doc);
          darkApplied = true;
        }
      }
      if (darkApplied && !lightApplied) bumpPreviewVersion();
    });

    return () => cancelAnimationFrame(rafId);
  });

  let isConstrained = $derived(previewWidth !== "fluid");

  function getWidthStyle(): string {
    if (previewWidth === "fluid") return "width:100%;height:100%";
    if (previewWidth === "mobile") return "width:390px;height:750px;border:1px solid rgba(255,255,255,0.12);border-radius:28px;overflow:hidden;background:#fff;box-shadow:0 32px 80px rgba(0,0,0,0.5)";
    if (previewWidth === "tablet") return "width:768px;height:900px;border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden;background:#fff;box-shadow:0 32px 80px rgba(0,0,0,0.5)";
    return "width:1024px;height:720px;border:1px solid rgba(255,255,255,0.12);border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 32px 80px rgba(0,0,0,0.5)";
  }
</script>

<div class="flex flex-col flex-1 min-h-0 bg-[#09090e]">
  <!-- Preview toolbar — always a single row (scrolls horizontally instead of
       wrapping) so it can't eat a growing chunk of a short mobile viewport. -->
  <div class="min-h-10 bg-[#0d0d14] border-b border-white/8 flex flex-nowrap items-center px-3 gap-2 overflow-x-auto shrink-0">
    <!-- Template tabs -->
    <div class="shrink-0 flex bg-white/5 border border-white/8 rounded-lg p-0.5 gap-0.5 max-w-full overflow-x-auto">
      {#each TEMPLATES as t (t.id)}
        <button
          onclick={() => onTemplateChange(t.id)}
          class={`shrink-0 px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
            previewTemplate === t.id ? "bg-white/12 text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {t.label}
        </button>
      {/each}
    </div>

    <div class="w-px h-4 bg-white/10 mx-1"></div>

    <!-- Width controls -->
    <div class="shrink-0 flex bg-white/5 border border-white/8 rounded-lg p-0.5 gap-0.5">
      {#each (["fluid", "desktop", "tablet", "mobile"] as const) as w (w)}
        <button
          onclick={() => onWidthChange(w)}
          title={w === "fluid" ? "Full width" : w === "desktop" ? "Desktop (1024px)" : w === "tablet" ? "Tablet (768px)" : "Mobile (390px)"}
          class={`p-1 rounded-md transition-all cursor-pointer ${previewWidth === w ? "bg-white/12 text-white" : "text-slate-500 hover:text-slate-300"}`}
        >
          {#if w === "mobile"}
            <Smartphone class="w-3 h-3" />
          {:else if w === "tablet"}
            <Tablet class="w-3 h-3" />
          {:else}
            <Monitor class="w-3 h-3" />
          {/if}
        </button>
      {/each}
    </div>

    <!-- Light/dark/split -->
    <div class="shrink-0 flex bg-white/5 border border-white/8 rounded-lg p-0.5 gap-0.5">
      <button
        onclick={() => { splitMode = false; onThemeChange("light"); }}
        title="Light mode"
        class={`p-1 rounded-md transition-all cursor-pointer ${!splitMode && previewTheme === "light" ? "bg-white/12 text-white" : "text-slate-500 hover:text-slate-300"}`}
      >
        <Sun class="w-3 h-3" />
      </button>
      <button
        onclick={() => { splitMode = false; onThemeChange("dark"); }}
        title="Dark mode"
        class={`p-1 rounded-md transition-all cursor-pointer ${!splitMode && previewTheme === "dark" ? "bg-white/12 text-white" : "text-slate-500 hover:text-slate-300"}`}
      >
        <Moon class="w-3 h-3" />
      </button>
      <button
        onclick={() => { splitMode = !splitMode; }}
        title="Split: light + dark side by side"
        class={`p-1 rounded-md transition-all cursor-pointer ${splitMode ? "bg-white/12 text-white" : "text-slate-500 hover:text-slate-300"}`}
      >
        <Columns2 class="w-3 h-3" />
      </button>
    </div>

    <div class="hidden md:block md:flex-1"></div>

    <!-- Motion -->
    <select
      value={previewMotion}
      onchange={(e) => onMotionChange((e.target as HTMLSelectElement).value as "normal" | "slow" | "none")}
      class="shrink-0 bg-white/5 border border-white/8 text-slate-400 rounded-lg px-2 py-0.5 text-[10px] font-bold focus:outline-none cursor-pointer"
    >
      <option value="normal">Normal motion</option>
      <option value="slow">Slow motion</option>
      <option value="none">No motion</option>
    </select>

    <!-- Refresh -->
    <button
      onclick={() => { loadCount = 0; splitLightLoadCount = 0; splitDarkLoadCount = 0; refresh += 1; }}
      title="Reload preview"
      class="shrink-0 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-all cursor-pointer"
    >
      <RefreshCw class="w-3 h-3" />
    </button>

    <!-- Open in new tab -->
    <button
      onclick={() => {
        const blob = new Blob([buildIframeHTML(overrides, previewTheme, previewMotion, previewTemplate, frameworkCSSStatic)], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
      }}
      title="Open in new tab"
      class="shrink-0 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-all cursor-pointer"
    >
      <ExternalLink class="w-3 h-3" />
    </button>
  </div>

  <!-- Preview area -->
  <div class={`flex-1 min-h-0 flex overflow-auto ${isConstrained && !splitMode ? "items-center justify-center bg-[#06060a]" : ""}`}>
    {#if splitMode}
      <!-- Split view: light left, dark right -->
      <div class="flex-1 flex min-w-0 h-full">
        <div class="flex-1 flex flex-col min-w-0 border-r border-white/8">
          <div class="h-6 flex items-center justify-center bg-[#0d0d14] border-b border-white/6 shrink-0">
            <span class="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
              <Sun class="w-2.5 h-2.5" /> Light
            </span>
          </div>
          {#key refresh}
            <iframe
              bind:this={splitLightEl}
              srcdoc={htmlLight}
              sandbox="allow-scripts allow-same-origin allow-forms"
              onload={() => { splitLightLoadCount += 1; }}
              class="flex-1 w-full border-0"
              title="SLASHED light preview"
            ></iframe>
          {/key}
        </div>
        <div class="flex-1 flex flex-col min-w-0">
          <div class="h-6 flex items-center justify-center bg-[#0d0d14] border-b border-white/6 shrink-0">
            <span class="text-[9px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
              <Moon class="w-2.5 h-2.5" /> Dark
            </span>
          </div>
          {#key refresh}
            <iframe
              bind:this={splitDarkEl}
              srcdoc={htmlDark}
              sandbox="allow-scripts allow-same-origin allow-forms"
              onload={() => { splitDarkLoadCount += 1; }}
              class="flex-1 w-full border-0"
              title="SLASHED dark preview"
            ></iframe>
          {/key}
        </div>
      </div>
    {:else}
      <div style={getWidthStyle()} class={isConstrained ? "" : "w-full h-full"}>
        {#key refresh}
          <iframe
            bind:this={iframeEl}
            srcdoc={html}
            sandbox="allow-scripts allow-same-origin allow-forms"
            onload={() => { loadCount += 1; }}
            class="w-full h-full border-0"
            title="SLASHED live preview"
          ></iframe>
        {/key}
      </div>
    {/if}
  </div>
</div>
