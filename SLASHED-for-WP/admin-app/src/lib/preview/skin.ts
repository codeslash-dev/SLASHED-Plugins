// Preview "skin": the ONLY non-framework CSS in the gallery. SLASHED ships no
// utility classes, so specimens lean on real framework classes (.sf-btn,
// .sf-card, .sf-grid, …) plus this thin layer for the things the framework has
// no class for: swatch/ramp grids, scale bars, demo boxes, labels. EVERY value
// references a live --sf-* token, so configurator overrides drive these exactly
// like the framework's own classes — the whole gallery reacts to every change.

const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const RAMP_FAMILIES = ["primary", "secondary", "tertiary", "action", "base", "neutral"];
const STATUS = ["success", "warning", "danger", "info"];
const RADII = ["xs", "s", "m", "l", "xl", "2xl", "full"];
const SHADOWS = ["xs", "s", "m", "l", "xl", "2xl"];
const SPACES = ["3xs", "2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"];
const TYPE_STEPS = ["display-l", "display-m", "display-s", "2xl", "xl", "l", "m", "s", "xs"];
const GRADS = ["primary", "brand", "tertiary", "surface"];

export function previewSkinCSS(): string {
  const rampClass = (family: string) =>
    RAMP_STEPS.map(
      (s) => `.pv-sw--${family}-${s}{background:var(--sf-color-${family}-${s});}`,
    ).join("");

  return `
    /* Text roles (framework ships no text utilities — these mirror semantic tokens) */
    .pv-eyebrow{font-size:var(--sf-text-xs);font-weight:var(--sf-font-weight-heading);text-transform:uppercase;letter-spacing:0.08em;color:var(--sf-color-text--muted);}
    .pv-lead{font-size:var(--sf-text-l);color:var(--sf-color-text--secondary);}
    .pv-muted{color:var(--sf-color-text--muted);}
    .pv-secondary{color:var(--sf-color-text--secondary);}
    .pv-accent{color:var(--sf-color-primary-600);}
    .pv-on-primary{color:var(--sf-color-text--on-primary);}
    .pv-center-text{text-align:center;}
    .pv-measure{max-inline-size:44rem;}
    .pv-heading{font-family:var(--sf-font-heading);color:var(--sf-color-heading);}
    .pv-strong{font-weight:var(--sf-font-weight-heading);}
    .pv-swatch-label{font-size:var(--sf-text-2xs);font-family:var(--sf-font-mono);color:var(--sf-color-text--muted);word-break:break-word;}
    /* Staged BEM bits not yet shipped as real classes */
    .pv-tag{display:inline-flex;align-items:center;gap:var(--sf-space-2xs);padding-block:0.125rem;padding-inline:var(--sf-space-xs);font-size:var(--sf-text-xs);line-height:var(--sf-leading-tight);white-space:nowrap;background:var(--sf-color-inset);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);border-radius:var(--sf-radius-s);color:var(--sf-color-text);}
    .pv-tag--primary{color:var(--sf-color-action);border-color:var(--sf-color-action);background:color-mix(in oklab,var(--sf-color-action) 8%,var(--sf-color-surface));}
    /* Type-scale ramp — one class per step, token-driven */
    ${TYPE_STEPS.map((t) => `.pv-type--${t}{font-size:var(--sf-text-${t});line-height:var(--sf-leading-tight);}`).join("")}
    /* Colour ramp swatches — every family */
    .pv-ramp{display:flex;gap:2px;block-size:40px;border-radius:var(--sf-radius-m);overflow:hidden;}
    .pv-ramp>*{flex:1;min-inline-size:0;}
    ${RAMP_FAMILIES.map(rampClass).join("")}
    /* Status chips + gradients */
    .pv-chip{display:block;inline-size:100%;block-size:44px;border-radius:var(--sf-radius-s);}
    ${STATUS.map((s) => `.pv-chip--${s}{background:var(--sf-color-${s});}`).join("")}
    .pv-grad{block-size:44px;border-radius:var(--sf-radius-m);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-border);}
    ${GRADS.map((g) => `.pv-grad--${g}{background:var(--sf-gradient-${g});}`).join("")}
    /* Radius + shadow demo boxes */
    .pv-demo-box{inline-size:56px;block-size:56px;background:var(--sf-color-primary-100);border:2px solid var(--sf-color-primary-300);}
    ${RADII.map((r) => `.pv-radius--${r}{border-radius:var(--sf-radius-${r});}`).join("")}
    .pv-shadow-box{inline-size:56px;block-size:56px;background:var(--sf-color-surface);border-radius:var(--sf-radius-m);}
    ${SHADOWS.map((s) => `.pv-shadow--${s}{box-shadow:var(--sf-shadow-${s});}`).join("")}
    /* Spacing scale bars */
    .pv-space-bar{background:var(--sf-color-primary-400);border-radius:2px;min-inline-size:3px;min-block-size:3px;}
    ${SPACES.map((s) => {
      const size = s === "3xs" ? "0.125rem" : `var(--sf-space-${s})`;
      return `.pv-space--${s}{inline-size:${size};block-size:${size};}`;
    }).join("")}
    .pv-spacing-track{display:flex;flex-wrap:wrap;align-items:flex-end;gap:var(--sf-space-xs);}
    /* Generic filled block for layout-primitive demos (stack/cluster/grid gaps) */
    .pv-box{background:var(--sf-color-primary-100);border:var(--sf-border-width-1) var(--sf-border-style) var(--sf-color-primary-300);border-radius:var(--sf-radius-s);padding:var(--sf-space-s);color:var(--sf-color-primary-700);font-size:var(--sf-text-s);font-family:var(--sf-font-mono);text-align:center;min-inline-size:3rem;}
    .pv-box--tall{min-block-size:4rem;display:flex;align-items:center;justify-content:center;}
    /* Motion demo tile */
    .pv-motion-tile{inline-size:100%;block-size:56px;background:var(--sf-gradient-primary);border-radius:var(--sf-radius-m);}
    /* Tinted card variants (demo-only; unlayered so they beat .sf-card's layer) */
    .pv-card--primary{background:var(--sf-color-primary);color:var(--sf-color-text--on-primary);}
    .pv-card--soft{background:var(--sf-color-primary-100);color:var(--sf-color-primary-700);}`;
}
