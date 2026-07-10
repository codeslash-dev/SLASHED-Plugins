// Section builders for the live-preview gallery. Each returns an HTML string
// built from real framework classes + the pv-* skin, arranged so every
// configurable token/class is visible and reacts live to the configurator.
// Foundations enumerate the real API via ./catalog; components are curated.

import { page, section, specimen, tag, cluster, grid, stack, well, esc } from "./specimen";
import { familySteps, classesOfKind, tokensMatching, tokensByGroup, classesByKind } from "./catalog";

const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const RAMP_FAMILIES = ["primary", "secondary", "tertiary", "action", "base", "neutral"];
const STATUS = ["success", "warning", "danger", "info"];
const GRADS = ["primary", "brand", "tertiary", "surface"];

const rampRow = (family: string) =>
  specimen(
    `--sf-color-${family}-*`,
    `<div class="pv-ramp" style="inline-size:100%">${RAMP_STEPS.map(
      (s) => `<span class="pv-sw--${family}-${s}" title="${family}-${s}"></span>`,
    ).join("")}</div>`,
  );

// ── Color ────────────────────────────────────────────────────────────────
export function color(): string {
  const ramps = stack("s", ...RAMP_FAMILIES.map(rampRow));
  const status = grid(
    8,
    ...STATUS.map((s) => specimen(`--sf-color-${s}`, `<span class="pv-chip pv-chip--${s}"></span>`)),
  );
  const grads = grid(
    9,
    ...GRADS.map((g) => specimen(`--sf-gradient-${g}`, `<div class="pv-grad pv-grad--${g}"></div>`)),
  );
  const surfaceTokens = tokensMatching("--sf-color-surface", "--sf-color-canvas", "--sf-color-inset", "--sf-color-raised")
    .map((t) => t.name);
  const surfaces = grid(
    10,
    ...surfaceTokens.map((name) =>
      specimen(name, `<div class="sf-card" style="background:var(${name});block-size:56px"></div>`),
    ),
  );
  const onColor = grid(
    9,
    ...["primary", "secondary", "action", "success", "warning", "danger", "info"].map((f) =>
      specimen(
        `text--on-${f}`,
        `<div style="background:var(--sf-color-${f});color:var(--sf-color-text--on-${f});padding:var(--sf-space-s);border-radius:var(--sf-radius-s);font-weight:600">Aa</div>`,
      ),
    ),
  );
  const textRoles = well(`<div class="sf-stack sf-stack--xs">
    <span style="color:var(--sf-color-heading);font-size:var(--sf-text-l);font-weight:600">Heading — --sf-color-heading</span>
    <span style="color:var(--sf-color-text)">Body text — --sf-color-text</span>
    <span style="color:var(--sf-color-text--secondary)">Secondary — --sf-color-text--secondary</span>
    <span style="color:var(--sf-color-text--muted)">Muted — --sf-color-text--muted</span>
    <a href="#" onclick="event.preventDefault()" style="color:var(--sf-color-link)">Link — --sf-color-link</a>
  </div>`);
  const borders = grid(
    10,
    ...["border", "border--subtle", "border--strong"].map((b) =>
      specimen(
        `--sf-color-${b}`,
        `<div style="block-size:48px;border:2px solid var(--sf-color-${b});border-radius:var(--sf-radius-m)"></div>`,
      ),
    ),
  );
  return page(
    "Color",
    "Every brand family ramp (50–950), status colours, gradients, surfaces, text roles, borders and readable text-on-colour pairs. Change any colour token in the Colors panel and watch the whole system re-tint.",
    section("Brand family ramps", ramps, "primary · secondary · tertiary · action · base · neutral"),
    section("Status colours", status),
    section("Gradients", grads),
    section("Surfaces", surfaces),
    section("Text roles & links", textRoles),
    section("Borders", borders),
    section("Text on colour (contrast pairs)", onColor),
  );
}

// ── Typography ─────────────────────────────────────────────────────────────
export function type(): string {
  const display = well(stack(
    "xs",
    `<span class="pv-type--display-l pv-heading pv-strong">Display L</span>`,
    `<span class="pv-type--display-m pv-heading pv-strong">Display M</span>`,
    `<span class="pv-type--display-s pv-heading pv-strong">Display S</span>`,
  ));
  const headings = stack(
    "xs",
    ...["2xl", "xl", "l", "m", "s", "xs"].map(
      (s) => `<span class="pv-type--${s} pv-heading pv-strong">Heading ${s.toUpperCase()} — --sf-text-${s}</span>`,
    ),
  );
  const prose = `<div class="sf-prose sf-stack sf-stack--s">
    <p>Body — the quick brown fox jumps over the lazy dog. Good typography builds hierarchy and trust.</p>
    <p class="pv-secondary">Secondary — supporting copy that helps without competing.</p>
    <p class="pv-muted">Muted / caption — timestamps, tags, helper text.</p>
    <p><code>const tokens = design()</code> — <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <a href="#" onclick="event.preventDefault()">a link</a>.</p>
  </div>`;
  const families = grid(
    12,
    ...["body", "heading", "mono"].map((f) =>
      specimen(
        `--sf-font-${f}`,
        `<div style="font-family:var(--sf-font-${f});font-size:var(--sf-text-l)">Ag 123</div>`,
      ),
    ),
  );
  const weights = familySteps("--sf-font-weight-");
  const weightRow = weights.length
    ? well(cluster(
        ...weights.map((w) =>
          specimen(
            `weight-${w}`,
            `<span style="font-weight:var(--sf-font-weight-${w});font-size:var(--sf-text-l)">Aa</span>`,
          ),
        ),
      ))
    : "";
  const leading = well(`<div class="sf-cluster sf-cluster--m">
    <p style="line-height:var(--sf-leading-tight);max-inline-size:12rem">Tight leading — --sf-leading-tight. Two or three lines of copy to show the rhythm.</p>
    <p style="line-height:var(--sf-leading-normal);max-inline-size:12rem">Normal leading — --sf-leading-normal. Two or three lines of copy to show the rhythm.</p>
    <p style="line-height:var(--sf-leading-loose);max-inline-size:12rem">Loose leading — --sf-leading-loose. Two or three lines of copy to show the rhythm.</p>
  </div>`);
  return page(
    "Typography",
    "Display and heading scale, body prose, font families, weights and leading — all fluid via --sf-text-* and the type-ratio knobs.",
    section("Display scale", display),
    section("Heading scale", headings),
    section("Font families", well(families)),
    ...(weightRow ? [section("Font weights", weightRow)] : []),
    section("Line height", leading),
    section("Prose, inline & links", well(prose)),
  );
}

// ── Spacing ────────────────────────────────────────────────────────────────
export function space(): string {
  const steps = familySteps("--sf-space-");
  const bars = well(
    `<div class="pv-spacing-track">${steps
      .map(
        (s) =>
          `<div class="sf-stack sf-stack--xs sf-stack--center pv-center-text"><div class="pv-space-bar pv-space--${s}"></div>${tag(s)}</div>`,
      )
      .join("")}</div>`,
  );
  const gapDemo = stack(
    "s",
    ...(["xs", "s", "m", "l"] as const).map((g) =>
      specimen(
        `sf-cluster--${g}`,
        `<div class="sf-cluster sf-cluster--${g}"><span class="pv-box">A</span><span class="pv-box">B</span><span class="pv-box">C</span></div>`,
      ),
    ),
  );
  const sizeSteps = familySteps("--sf-size-");
  const sizes = sizeSteps.length
    ? well(`<div class="sf-cluster sf-cluster--s" style="align-items:flex-end">${sizeSteps
        .map(
          (s) =>
            `<div class="sf-stack sf-stack--xs sf-stack--center pv-center-text"><div style="inline-size:var(--sf-size-${s});block-size:var(--sf-size-${s});background:var(--sf-color-primary-300);border-radius:var(--sf-radius-s)"></div>${tag(`size-${s}`)}</div>`,
        )
        .join("")}</div>`)
    : "";
  return page(
    "Spacing",
    "The fluid spacing scale (--sf-space-*), the control-size scale (--sf-size-*), and how they drive real gaps. Adjust the base/scale in the Spacing panel and every bar and gap rescales together.",
    section("Spacing scale", bars),
    ...(sizes ? [section("Size scale (--sf-size-*)", sizes)] : []),
    section("Gaps in context (sf-cluster)", gapDemo),
  );
}

// ── Borders & radius ──────────────────────────────────────────────────────
export function borders(): string {
  const radii = ["xs", "s", "m", "l", "xl", "2xl", "full"];
  const radiusRow = well(cluster(
    ...radii.map((r) => specimen(`--sf-radius-${r}`, `<div class="pv-demo-box pv-radius--${r}"></div>`)),
  ));
  const widthSteps = familySteps("--sf-border-width-");
  const widths = well(cluster(
    ...widthSteps.map((w) =>
      specimen(
        `--sf-border-width-${w}`,
        `<div style="inline-size:56px;block-size:56px;border:var(--sf-border-width-${w}) solid var(--sf-color-border);border-radius:var(--sf-radius-m)"></div>`,
      ),
    ),
  ));
  const styles = well(cluster(
    ...["solid", "dashed", "dotted"].map((s) =>
      specimen(
        s,
        `<div style="inline-size:56px;block-size:56px;border:2px ${s} var(--sf-color-border);border-radius:var(--sf-radius-m)"></div>`,
      ),
    ),
  ));
  const divider = well(`<div class="sf-stack sf-stack--s">
    <span class="pv-secondary">Above</span><hr class="sf-divider" />
    <span class="pv-secondary">Dashed</span><hr class="sf-divider sf-divider--dashed" />
    <span class="pv-secondary">Below</span>
  </div>`);
  return page(
    "Borders & radius",
    "Radius scale, border widths, styles and the divider — driven by --sf-radius-* and --sf-border-*.",
    section("Radius scale", radiusRow),
    section("Border widths", widths),
    section("Border styles", styles),
    section("Dividers (.sf-divider)", divider),
  );
}

// ── Shadows ────────────────────────────────────────────────────────────────
export function shadows(): string {
  const steps = ["xs", "s", "m", "l", "xl", "2xl"];
  const row = well(cluster(
    ...steps.map((s) => specimen(`--sf-shadow-${s}`, `<div class="pv-shadow-box pv-shadow--${s}"></div>`)),
  ));
  return page(
    "Shadows & elevation",
    "The elevation scale (--sf-shadow-*). Tune shadow colour/opacity/spread in the Shadows panel to restyle every level at once.",
    section("Elevation scale", row),
  );
}

// ── Effects ────────────────────────────────────────────────────────────────
export function effects(): string {
  const grads = grid(
    9,
    ...GRADS.map((g) => specimen(`--sf-gradient-${g}`, `<div class="pv-grad pv-grad--${g}"></div>`)),
  );
  const util = classesOfKind("utility").slice(0, 24);
  const utilList = util.length
    ? well(`<div class="sf-cluster sf-cluster--xs">${util.map((c) => `<code class="pv-swatch-label">${esc(c.selector)}</code>`).join("")}</div>`)
    : "";
  return page(
    "Effects",
    "Gradients, blur/opacity and background-layer utilities.",
    section("Gradients", grads),
    ...(utilList ? [section("Utility classes", utilList)] : []),
  );
}

// ── Motion ─────────────────────────────────────────────────────────────────
export function motion(): string {
  const anim = classesOfKind("motion").filter((c) => c.selector.startsWith(".sf-"));
  const tiles = grid(
    10,
    ...anim.slice(0, 24).map((c) => {
      const cls = c.selector.replace(/^\./, "").split(/[ :>]/)[0];
      return specimen(c.selector, `<div class="pv-motion-tile ${esc(cls)}"></div>`);
    }),
  );
  return page(
    "Motion",
    "Animation presets and transition tokens. Switch the preview motion mode (top-right) to preview slow / reduced motion.",
    section("Animation presets", tiles, "Tiles replay their animation on load / tab switch."),
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────
export function layout(): string {
  const box = (t: string) => `<span class="pv-box">${esc(t)}</span>`;
  const stackDemo = specimen(
    "sf-stack (vertical rhythm)",
    `<div class="sf-stack sf-stack--s" style="inline-size:100%">${box("1")}${box("2")}${box("3")}</div>`,
  );
  const clusterDemo = specimen(
    "sf-cluster (wrap + gap)",
    `<div class="sf-cluster sf-cluster--s">${box("one")}${box("two")}${box("three")}${box("four")}</div>`,
  );
  const gridCols = stack(
    "s",
    ...([2, 3, 4] as const).map((n) =>
      specimen(
        `sf-grid-cols-${n}`,
        `<div class="sf-grid sf-grid-cols-${n}">${Array.from({ length: n }, (_, i) => box(String(i + 1))).join("")}</div>`,
      ),
    ),
  );
  const switcherDemo = specimen(
    "sf-switcher (auto row→stack)",
    `<div class="sf-switcher">${box("a")}${box("b")}${box("c")}</div>`,
  );
  const sidebarDemo = specimen(
    "sf-sidebar",
    `<div class="sf-sidebar"><div class="pv-box pv-box--tall" style="min-inline-size:6rem">aside</div><div class="pv-box pv-box--tall">main content area</div></div>`,
  );
  const centerDemo = specimen(
    "sf-center",
    `<div class="sf-center" style="min-block-size:5rem;background:var(--sf-color-inset);border-radius:var(--sf-radius-m)">${box("centered")}</div>`,
  );
  const asymGrid = stack(
    "s",
    ...(["1-2", "2-1", "1-3"] as const).map((c) =>
      specimen(
        `sf-grid-cols-${c}`,
        `<div class="sf-grid sf-grid-cols-${c}">${box("a")}${box("b")}</div>`,
      ),
    ),
  );
  const bentoDemo = specimen(
    "sf-bento",
    `<div class="sf-bento">${["a", "b", "c", "d", "e"].map((t) => `<div class="pv-box pv-box--tall">${t}</div>`).join("")}</div>`,
  );
  const frameDemo = grid(
    9,
    ...(["video", "square", "portrait"] as const).map((r) =>
      specimen(
        `sf-frame--${r}`,
        `<div class="sf-frame sf-frame--${r}" style="background:var(--sf-color-primary-100);border-radius:var(--sf-radius-m)"></div>`,
      ),
    ),
  );
  return page(
    "Layout",
    "The token-driven layout primitives — stack, cluster, grid, switcher, sidebar, center, bento and aspect-ratio frames. Boxes make the gaps and columns visible; every gap is a --sf-space-* token.",
    section("Stack & cluster", well(stack("m", stackDemo, clusterDemo))),
    section("Grid column presets", well(gridCols)),
    section("Asymmetric grids", well(asymGrid)),
    section("Bento grid", well(bentoDemo)),
    section("Aspect-ratio frames", well(frameDemo)),
    section("Switcher, sidebar & center", well(stack("m", switcherDemo, sidebarDemo, centerDemo))),
  );
}

// ── Components ─────────────────────────────────────────────────────────────
const BTN_FAMILIES = ["primary", "secondary", "tertiary", "action", "base", "neutral", "success", "warning", "danger", "info"];
const BTN_SIZES: [string, string][] = [["xs", "XS"], ["s", "Small"], ["", "Default"], ["l", "Large"], ["xl", "XL"]];

export function components(): string {
  const btn = (mods: string, label: string) => `<button class="sf-btn ${mods}">${esc(label)}</button>`;

  const families = well(cluster(...BTN_FAMILIES.map((f) => btn(`sf-btn--${f}`, f[0].toUpperCase() + f.slice(1)))));
  const stylesRow = well(cluster(
    btn("sf-btn--primary", "Fill"),
    btn("sf-btn--primary sf-btn--soft", "Soft"),
    btn("sf-btn--primary sf-btn--outline", "Outline"),
    btn("sf-btn--primary sf-btn--gradient", "Gradient"),
  ));
  const sizes = well(`<div class="sf-cluster sf-cluster--s" style="align-items:center">${BTN_SIZES.map(
    ([s, label]) => btn(`sf-btn--primary${s ? ` sf-btn--${s}` : ""}`, label),
  ).join("")}</div>`);
  const states = well(cluster(
    btn("sf-btn--primary", "Default"),
    `<button class="sf-btn sf-btn--primary" disabled>Disabled</button>`,
    `<button class="sf-btn sf-btn--primary sf-is-loading">Loading</button>`,
  ));

  const card = (mods: string, title: string, body: string, btnMods: string, action: string) =>
    `<article class="sf-card ${mods}">
      <div class="sf-card__header"><h3 class="sf-card__title">${esc(title)}</h3></div>
      <div class="sf-card__body"><p class="pv-secondary">${esc(body)}</p></div>
      <div class="sf-card__footer">${btn(btnMods, action)}</div>
    </article>`;
  const cards = grid(
    16,
    card("", "Base card", "Default surface, radius, border and text tokens.", "sf-btn--primary sf-btn--s", "Open"),
    card("sf-card--bordered", "Bordered card", "The shipped bordered modifier for clearer structure.", "sf-btn--outline sf-btn--s", "Details"),
    card("sf-card--elevated sf-card--interactive", "Interactive card", "Elevation and interaction states react to tokens.", "sf-btn--soft sf-btn--s", "Select"),
  );

  return page(
    "Components",
    "Buttons and cards — every family, style, the full XS–XL size scale and states. This is where the size-scale knobs in the Components panel show their effect immediately.",
    section("Button families", families),
    section("Styles", stylesRow),
    section("Size scale (xs · s · default · l · xl)", sizes, "Global Padding / Min-height / Label-size knobs override this whole scale."),
    section("States", states),
    section("Cards", cards),
  );
}

// ── Macros & utilities ─────────────────────────────────────────────────────
export function macros(): string {
  const surfaces = grid(
    12,
    ...["primary", "secondary", "tertiary", "action", "neutral", "success", "warning", "info"].map((s) =>
      specimen(
        `sf-surface--${s}`,
        `<div class="sf-surface sf-surface--${s}" style="padding:var(--sf-space-m);border-radius:var(--sf-radius-m)">Aa</div>`,
      ),
    ),
  );
  const macroClasses = classesOfKind("macro").filter((c) => c.selector.startsWith(".sf-"));
  const list = well(
    `<div class="sf-cluster sf-cluster--xs">${macroClasses
      .map((c) => `<code class="pv-swatch-label">${esc(c.selector)}</code>`)
      .join("")}</div>`,
  );
  return page(
    "Macros & utilities",
    "Surface macros and the full set of shipped macro utility classes.",
    section("Surfaces (sf-surface--*)", surfaces),
    section("All macro classes", list, `${macroClasses.length} classes in @layer slashed.macros`),
  );
}

// ── Advanced / All (exhaustive, searchable reference) ──────────────────────
const chips = (items: string[]) =>
  `<div class="sf-cluster sf-cluster--xs">${items
    .map((s) => `<code class="pv-swatch-label">${esc(s)}</code>`)
    .join("")}</div>`;

export function advanced(): string {
  // Every class, grouped by kind — guarantees the whole class API is at least
  // listed even where a rich specimen would be noise (state/print/a11y).
  const classSections = classesByKind().map(({ kind, classes }) =>
    section(`${kind} · ${classes.length}`, well(chips(classes.map((c) => c.name))))
  );
  // Every public token, grouped — the full variable reference the domain tabs
  // visualise. Kept exhaustive so nothing configurable is undocumented here.
  const tokenSections = tokensByGroup().map(({ group, tokens }) =>
    section(`${group} · ${tokens.length}`, well(chips(tokens.map((t) => t.name))))
  );
  return page(
    "Advanced / All",
    "The exhaustive reference: every class and every variable in the framework, grouped. The domain tabs visualise these live — this tab is the complete searchable index (including advanced and draft surface).",
    section("Classes", stack("s", ...classSections.map((s) => s))),
    section("Variables (tokens)", stack("s", ...tokenSections.map((s) => s))),
  );
}
