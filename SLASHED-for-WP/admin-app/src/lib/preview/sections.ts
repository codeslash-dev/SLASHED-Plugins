// Section builders for the live-preview gallery. Each returns an HTML string
// built from real framework classes + the pv-* skin, arranged so every
// configurable token/class is visible and reacts live to the configurator.
// Foundations enumerate the real API via ./catalog; components are curated.

import { page, section, specimen, specimenFull, tag, cluster, grid, stack, well, frame, esc } from "./specimen";
import { familySteps, classesOfKind, tokensMatching, tokensByGroup, classesByKind, GRADS } from "./catalog";

const RAMP_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const RAMP_FAMILIES = ["primary", "secondary", "tertiary", "action", "base", "neutral"];
const STATUS = ["success", "warning", "danger", "info"];

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
      specimen(name, `<div class="sf-card" style="inline-size:100%;background:var(${name});block-size:56px"></div>`),
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
    <span style="color:var(--sf-color-text--subtle)">Secondary — --sf-color-text--subtle</span>
    <span style="color:var(--sf-color-text--muted)">Muted — --sf-color-text--muted</span>
    <a href="#" onclick="event.preventDefault()" style="color:var(--sf-color-link)">Link — --sf-color-link</a>
  </div>`);
  const borders = grid(
    10,
    ...["border", "border--subtle", "border--strong"].map((b) =>
      specimen(
        `--sf-color-${b}`,
        `<div style="inline-size:100%;block-size:48px;border:2px solid var(--sf-color-${b});border-radius:var(--sf-radius-m)"></div>`,
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
      specimenFull(
        `sf-grid-cols-${n}`,
        `<div class="sf-grid sf-grid-cols-${n}">${Array.from({ length: n }, (_, i) => box(String(i + 1))).join("")}</div>`,
      ),
    ),
  );
  const switcherDemo = specimenFull(
    "sf-switcher (auto row→stack)",
    `<div class="sf-switcher">${box("a")}${box("b")}${box("c")}</div>`,
  );
  const sidebarDemo = specimenFull(
    "sf-sidebar",
    `<div class="sf-sidebar"><div class="pv-box pv-box--tall" style="min-inline-size:6rem">aside</div><div class="pv-box pv-box--tall">main content area</div></div>`,
  );
  const centerDemo = specimenFull(
    "sf-center",
    `<div class="sf-center" style="min-block-size:5rem;background:var(--sf-color-inset);border-radius:var(--sf-radius-m)">${box("centered")}</div>`,
  );
  const asymGrid = stack(
    "s",
    ...(["1-2", "2-1", "1-3"] as const).map((c) =>
      specimenFull(
        `sf-grid-cols-${c}`,
        `<div class="sf-grid sf-grid-cols-${c}">${box("a")}${box("b")}</div>`,
      ),
    ),
  );
  const bentoDemo = specimenFull(
    "sf-bento — sf-bento-featured / -wide / -tall span modifiers",
    `<div class="sf-bento">${[
      ["sf-bento-featured", "featured (2×2)"],
      ["", "b"],
      ["", "c"],
      ["sf-bento-wide", "wide (2×1)"],
      ["sf-bento-tall", "tall (1×2)"],
      ["", "f"],
    ]
      .map(([mods, t]) => `<div class="pv-box pv-box--tall ${mods}">${esc(t)}</div>`)
      .join("")}</div>`,
  );
  const frameDemo = grid(
    9,
    ...(["video", "square", "portrait"] as const).map((r) =>
      specimen(
        `sf-frame--${r}`,
        `<div class="sf-frame sf-frame--${r}" style="inline-size:100%;background:var(--sf-color-primary-100);border-radius:var(--sf-radius-m)"></div>`,
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
// [modifier suffix, visible label] — "" is the default (medium) rung.
const BTN_SIZES: [string, string][] = [["xs", "XS"], ["s", "S"], ["", "M"], ["l", "L"], ["xl", "XL"]];

export function components(): string {
  const btn = (mods: string, label: string) => `<button class="sf-btn ${mods}">${esc(label)}</button>`;

  // Button rows use frame() (a non-card backdrop), NOT well(): the framework's
  // `.sf-card .sf-btn` rule pins a nested button's label to --sf-text-s, which
  // would flatten the per-rung font ladder in the Size-scale demo (padding and
  // min-height still grow, but the label wouldn't). Cards below keep .sf-card.

  // Families — every shipped colour family as a fill button.
  const families = frame(cluster(
    ...BTN_FAMILIES.map((f) => btn(`sf-btn--${f}`, f[0].toUpperCase() + f.slice(1))),
  ));

  // Styles — fill · soft · outline · gradient, on a brand family and a neutral.
  const styleRow = (family: string, withGradient: boolean) => cluster(
    btn(`sf-btn--${family}`, "Fill"),
    btn(`sf-btn--${family} sf-btn--soft`, "Soft"),
    btn(`sf-btn--${family} sf-btn--outline`, "Outline"),
    ...(withGradient ? [btn(`sf-btn--${family} sf-btn--gradient`, "Gradient")] : []),
  );
  const styles = frame(stack("s", styleRow("primary", true), styleRow("neutral", false)));

  // Size scale — the hero. Aligned to a common baseline so the per-rung
  // font-size / padding / min-height ladder reads as a clear staircase.
  const sizes = frame(
    `<div class="sf-cluster sf-cluster--s" style="align-items:flex-end">${BTN_SIZES.map(
      ([s, label]) => btn(`sf-btn--primary${s ? ` sf-btn--${s}` : ""}`, label),
    ).join("")}</div>`,
  );

  // Full width — --block stretches unconditionally; --block-cq only inside a
  // query container narrower than 20rem, so it's shown inside a 16rem container
  // (dashed) where it actually fills its width.
  // align-items:flex-start so buttons size to content — only --block (explicit
  // 100%) and the block-cq inside the 16rem query container actually stretch.
  const widths = frame(`<div class="sf-stack sf-stack--s" style="align-items:flex-start">
    <button class="sf-btn sf-btn--primary sf-btn--block">Block — full width</button>
    <button class="sf-btn sf-btn--neutral sf-btn--outline sf-btn--block">Block — outline</button>
    <button class="sf-btn sf-btn--primary sf-btn--block-cq">Block-cq — auto here (wide container)</button>
    <div style="container-type:inline-size;inline-size:16rem;padding:var(--sf-space-s);border:1px dashed var(--sf-color-border);border-radius:var(--sf-radius-s)">
      <button class="sf-btn sf-btn--primary sf-btn--block-cq">Block-cq — fills</button>
    </div>
  </div>`);

  // States — default, disabled, loading.
  const states = frame(cluster(
    btn("sf-btn--primary", "Default"),
    `<button class="sf-btn sf-btn--primary" disabled>Disabled</button>`,
    `<button class="sf-btn sf-btn--primary sf-is-loading">Loading</button>`,
  ));

  // A rich card that exercises the full slot API: media, avatar header,
  // title, body and a footer action row. Media/avatar use a token-driven
  // gradient (no external asset) so they re-tint live with the colour panel.
  const swatch = "var(--sf-gradient-primary, var(--sf-color-primary))";
  const mediaCard = `<article class="sf-card sf-card--elevated" style="max-inline-size:22rem">
    <div class="sf-card__media" style="background:${swatch}"></div>
    <div class="sf-card__header">
      <div class="sf-cluster sf-cluster--s" style="align-items:center;flex-wrap:nowrap">
        <div class="sf-card__avatar" style="background:${swatch}"></div>
        <div class="sf-stack sf-stack--xs">
          <h3 class="sf-card__title" style="margin:0">Media card</h3>
          <span class="pv-secondary">__media · __avatar · __title</span>
        </div>
      </div>
    </div>
    <div class="sf-card__body"><p class="pv-secondary">Composed from the full card slot API. Every dimension — padding, radius, gap, media ratio, avatar size — is token-driven and reacts live.</p></div>
    <div class="sf-card__footer">${cluster(
      btn("sf-btn--primary sf-btn--s", "Open"),
      btn("sf-btn--outline sf-btn--s", "Share"),
    )}</div>
  </article>`;

  // The three shipped card modifiers, side by side.
  const card = (mods: string, title: string, body: string, btnMods: string, action: string) =>
    `<article class="sf-card ${mods}">
      <div class="sf-card__header"><h3 class="sf-card__title">${esc(title)}</h3></div>
      <div class="sf-card__body"><p class="pv-secondary">${esc(body)}</p></div>
      <div class="sf-card__footer">${btn(btnMods, action)}</div>
    </article>`;
  const cardModifiers = grid(
    15,
    card("", "Base", "Default surface, radius, border and shadow.", "sf-btn--primary sf-btn--s", "Open"),
    card("sf-card--bordered", "Bordered", "Keeps the border, drops the shadow.", "sf-btn--outline sf-btn--s", "Details"),
    card("sf-card--elevated sf-card--interactive", "Interactive", "Elevated, with a hover/focus lift.", "sf-btn--soft sf-btn--s", "Select"),
  );

  return page(
    "Components",
    "Buttons and cards built from the real .sf-btn / .sf-card classes — every family and style, the full XS–XL size ladder, states, full-width and the card slot API. Edit the Components panel and each specimen reacts live.",
    section("Button families", families, `${BTN_FAMILIES.length} shipped colour families`),
    section("Styles", styles, "fill · soft · outline · gradient"),
    section("Size scale (xs · s · default · l · xl)", sizes, "Each rung has its own font-size, padding and min-height knob (Components panel ▸ Per-size); the Label-size multiplier scales the whole ladder proportionally."),
    section("Full width", widths, "sf-btn--block stretches to the container; sf-btn--block-cq does so only in a narrow query container."),
    section("States", states),
    section("Card — full slot API", mediaCard),
    section("Card modifiers", cardModifiers, "base · bordered · elevated + interactive"),
  );
}

// ── Macros & utilities ─────────────────────────────────────────────────────
// Every one of the 58 shipped macro classes is applied here for real — this
// gallery is a coverage floor (tests/preview-coverage.test.ts), not just a
// reference; a bare class-name chip doesn't satisfy that spirit, so each
// macro gets an actual specimen instead of only appearing in a text list.
const LOREM_MACRO =
  "SLASHED ships a token-driven CSS framework with no build step and no JavaScript required to render a page.";

export function macros(): string {
  // Surfaces — the generic form (any colour via --sf-surface-color) plus
  // all 10 precomputed named variants.
  const surfaceNamed = ["primary", "secondary", "tertiary", "action", "neutral", "inverse", "success", "warning", "info", "danger"];
  const surfaces = grid(
    12,
    specimen(
      "sf-surface (custom --sf-surface-color)",
      `<div class="sf-surface" style="--sf-surface-color:var(--sf-color-primary-100);padding:var(--sf-space-m);border-radius:var(--sf-radius-m)">Aa</div>`,
    ),
    ...surfaceNamed.map((s) =>
      specimen(
        `sf-surface--${s}`,
        `<div class="sf-surface sf-surface--${s}" style="padding:var(--sf-space-m);border-radius:var(--sf-radius-m)">Aa</div>`,
      ),
    ),
  );

  // Prose, not-prose & flow — real rhythm, not a swatch.
  const prose = well(`<div class="sf-prose">
    <h3 style="margin:0">Article heading</h3>
    <p>Paragraphs get automatic vertical rhythm from <code>.sf-prose</code> — no utility classes needed between them.</p>
    <ul><li>First point</li><li>Second point</li></ul>
    <div class="sf-not-prose" style="padding:var(--sf-space-s);border:var(--sf-border-width-1) dashed var(--sf-color-border);border-radius:var(--sf-radius-s)">
      <p style="margin:0"><code>.sf-not-prose</code> opts this box out of the prose rhythm above.</p>
    </div>
    <p>…and rhythm resumes after it.</p>
  </div>`);
  const flow = well(`<div class="sf-flow">
    <div class="pv-box">One</div>
    <div class="pv-box">Two — margin-block-start</div>
    <div class="pv-box">Three — margin-block-start</div>
  </div>`);

  // Truncation — one line, then 2/3/N-line clamps, all on the same copy.
  const truncation = grid(
    14,
    specimen("sf-truncate", `<div class="sf-truncate" style="max-inline-size:12rem">${LOREM_MACRO}</div>`),
    specimen("sf-line-clamp-2", `<p class="sf-line-clamp-2" style="max-inline-size:12rem;margin:0">${LOREM_MACRO}</p>`),
    specimen("sf-line-clamp-3", `<p class="sf-line-clamp-3" style="max-inline-size:12rem;margin:0">${LOREM_MACRO}</p>`),
    specimen(
      "sf-line-clamp-N (--sf-line-clamp:5)",
      `<p class="sf-line-clamp-N" style="max-inline-size:12rem;margin:0;--sf-line-clamp:5">${LOREM_MACRO} ${LOREM_MACRO}</p>`,
    ),
  );

  // Equal height — three unevenly-tall children forced level.
  const equalHeight = well(
    `<div class="sf-equal-height" style="gap:var(--sf-space-s)"><div class="pv-box">Short</div><div class="pv-box">Two<br>lines</div><div class="pv-box">Three<br>lines<br>here</div></div>`,
  );

  // Aspect ratio — content-agnostic, distinct from the .sf-frame primitive.
  const aspect = well(
    `<div class="sf-cluster sf-cluster--m">${["16 / 9", "1 / 1", "4 / 3"]
      .map(
        (r) =>
          `<div class="sf-stack sf-stack--xs sf-stack--center pv-center-text"><div class="sf-aspect" style="--sf-aspect:${r};inline-size:8rem;background:var(--sf-color-primary-100);border-radius:var(--sf-radius-m)"></div>${tag(`--sf-aspect:${r}`)}</div>`,
      )
      .join("")}</div>`,
  );

  // Tabular numbers — a real numeric column so digits visibly align.
  const tabularNums = well(`<table class="sf-tabular-nums" style="border-collapse:collapse">
    <tbody>
      <tr><td class="pv-secondary" style="padding-inline-end:var(--sf-space-m)">Invoice #1</td><td>1,024.50</td></tr>
      <tr><td class="pv-secondary" style="padding-inline-end:var(--sf-space-m)">Invoice #82</td><td>398.00</td></tr>
      <tr><td class="pv-secondary" style="padding-inline-end:var(--sf-space-m)">Invoice #913</td><td>12,760.75</td></tr>
    </tbody>
  </table>`);

  // Links — external marker + underline affordances, as real anchors.
  const links = well(`<div class="sf-cluster sf-cluster--l">
    <a href="#" onclick="event.preventDefault()" class="sf-link-external">sf-link-external</a>
    <a href="#" onclick="event.preventDefault()" class="sf-link--subtle">sf-link--subtle (hover me)</a>
    <a href="#" onclick="event.preventDefault()" class="sf-link--reverse">sf-link--reverse (hover me)</a>
  </div>`);

  // Drop shadows — filter: drop-shadow() follows alpha shape, so a ring
  // (mask-cut circle) shows the hole surviving the shadow, unlike box-shadow.
  const dropShadows = grid(
    9,
    ...(["xs", "s", "m", "l", "xl"] as const).map((s) =>
      specimen(
        `sf-drop-shadow-${s}`,
        `<div class="sf-drop-shadow-${s}" style="inline-size:48px;block-size:48px;background:var(--sf-color-primary-500);-webkit-mask-image:radial-gradient(circle at center,transparent 30%,black 32%);mask-image:radial-gradient(circle at center,transparent 30%,black 32%)"></div>`,
      ),
    ),
  );

  // Scrolling — shadow mask, snap, and content-visibility, all with real
  // overflowing content so the effect is actually observable.
  const scrollShadow = well(
    `<div class="sf-scroll-shadow" style="block-size:12rem;overflow-y:auto"><div class="sf-stack sf-stack--xs" style="padding-block:var(--sf-space-m)">${Array.from(
      { length: 8 },
      (_, i) => `<div class="pv-box">Row ${i + 1}</div>`,
    ).join("")}</div></div>`,
  );
  const scrollSnap = well(
    `<div class="sf-scroll-snap" style="block-size:8rem;overflow-y:auto;border-radius:var(--sf-radius-m)">${["a", "b", "c"]
      .map(
        (l, i) =>
          `<div style="block-size:8rem;background:var(--sf-color-primary-${100 + i * 100});display:flex;align-items:center;justify-content:center">${tag(`section ${l}`)}</div>`,
      )
      .join("")}</div>`,
  );
  const contentAuto = well(
    `<section class="sf-content-auto" style="--sf-content-intrinsic-size:4rem;padding:var(--sf-space-m);background:var(--sf-color-inset);border-radius:var(--sf-radius-m)"><p class="pv-secondary" style="margin:0">content-visibility:auto — off-screen instances of this section skip layout/paint until scrolled near.</p></section>`,
  );

  // Overflow fade — genuinely overflowing content in the axis each variant
  // fades: a single-line nowrap row for the horizontal/inline variants, and
  // a fixed-height column for the vertical/block variants. flex-wrap must
  // be forced off on the row: .sf-cluster wraps by default, which would
  // just break it onto multiple lines instead of overflowing it.
  const fadeRow = () =>
    `<div style="display:flex;flex-wrap:nowrap;gap:var(--sf-space-xs);overflow:hidden;inline-size:9rem">${Array.from(
      { length: 10 },
      (_, i) => `<span class="pv-box" style="flex:none">${i + 1}</span>`,
    ).join("")}</div>`;
  const fadeColumn = () =>
    `<div style="display:flex;flex-direction:column;gap:var(--sf-space-xs);overflow:hidden;block-size:6rem">${Array.from(
      { length: 6 },
      (_, i) => `<span class="pv-box" style="flex:none">${i + 1}</span>`,
    ).join("")}</div>`;
  const overflowFade = grid(
    11,
    ...([
      ["", fadeRow],
      ["--right", fadeRow],
      ["--left", fadeRow],
      ["--inline", fadeRow],
      ["--top", fadeColumn],
      ["--bottom", fadeColumn],
      ["--block", fadeColumn],
    ] as const).map(([m, shape]) => specimen(`sf-overflow-fade${m}`, `<div class="sf-overflow-fade${m}">${shape()}</div>`)),
  );

  // Scrim, surface-bg & text-protect — text over a token-driven gradient
  // "photo" (no external asset needed).
  const photo = "var(--sf-gradient-brand, var(--sf-color-primary))";
  const scrimCard = (mods: string, label: string) =>
    `<div class="sf-scrim ${mods}" style="position:relative;background:${photo};border-radius:var(--sf-radius-m);block-size:8rem;overflow:hidden">
      <div class="sf-scrim__content" style="position:absolute;inset-block-end:0;padding:var(--sf-space-s);color:#fff">${esc(label)}</div>
    </div>`;
  const scrims = grid(
    12,
    specimen("sf-scrim sf-scrim--bottom", scrimCard("sf-scrim--bottom", "Legible headline")),
    specimen("sf-scrim sf-scrim--top", scrimCard("sf-scrim--top", "Legible headline")),
    specimen("sf-scrim sf-scrim--full", scrimCard("sf-scrim--full", "Legible headline")),
  );
  const surfaceBg = well(
    `<div class="sf-surface-bg" style="--sf-surface-bg-image:${photo};--sf-surface-bg-overlay:var(--sf-scrim-gradient);block-size:8rem;border-radius:var(--sf-radius-m);display:flex;align-items:flex-end;padding:var(--sf-space-s);color:#fff">sf-surface-bg — named background preset</div>`,
  );
  const textProtect = `<div style="position:relative;background:${photo};border-radius:var(--sf-radius-m);padding:var(--sf-space-l)">
    <h3 class="sf-text-protect" style="margin:0;color:#fff">Readable over a photo</h3>
  </div>`;

  // Text gradient.
  const textGradient = well(`<h2 class="sf-text-gradient pv-strong" style="margin:0;font-size:var(--sf-text-2xl)">Gradient headline</h2>`);

  // Overlap — an avatar pulled down over the card that follows it
  // (.sf-overlap--down; the plain .sf-overlap pulls UP onto whatever
  // precedes it instead — not what a leading avatar needs here), plus the
  // two block-axis directional variants on their own swatches.
  const avatar = `<div style="inline-size:3rem;block-size:3rem;border-radius:var(--sf-radius-full);background:${photo};border:var(--sf-border-width-2) solid var(--sf-color-surface)"></div>`;
  const overlapHost = frame(`<div style="max-inline-size:14rem;margin-inline:auto">
    <div class="sf-overlap--down">${avatar}</div>
    <div class="sf-card sf-overlap-host"><p class="pv-secondary" style="margin:0">.sf-overlap-host reserves space so in-flow content clears the intruding avatar above.</p></div>
  </div>`);
  const overlapDirections = grid(
    10,
    ...([
      ["", "sf-overlap (pulls up)"],
      ["--down", "sf-overlap--down (pulls down)"],
    ] as const).map(([m, label]) =>
      specimen(label, `<div style="position:relative;inline-size:3rem;block-size:3rem;border-radius:var(--sf-radius-full);background:${photo}" class="sf-overlap${m}"></div>`),
    ),
  );

  // No-tap-highlight — no visual difference to show (it only suppresses the
  // mobile tap-highlight overlay); still applied to a real element for
  // coverage rather than left to a text mention.
  const noTapHighlight = well(
    `<a href="#" onclick="event.preventDefault()" class="sf-no-tap-highlight">sf-no-tap-highlight — suppresses the mobile tap-highlight overlay (no on-screen difference here)</a>`,
  );

  return page(
    "Macros & utilities",
    "Every shipped macro (@layer slashed.macros), applied for real — not just named.",
    section("Surfaces (sf-surface, sf-surface--*)", surfaces),
    section("Prose, not-prose & flow", well(stack("m", prose, flow))),
    section("Truncation (sf-truncate, sf-line-clamp-*)", truncation),
    section("Equal height (sf-equal-height)", equalHeight),
    section("Aspect ratio (sf-aspect)", aspect),
    section("Tabular numbers (sf-tabular-nums)", tabularNums),
    section("Links (sf-link-external, sf-link--subtle, sf-link--reverse)", links),
    section("Drop shadows (sf-drop-shadow-*)", dropShadows, "Alpha-following filter: drop-shadow() — note the shadow survives the masked hole."),
    section("Scroll shadow (sf-scroll-shadow)", scrollShadow),
    section("Scroll snap (sf-scroll-snap)", scrollSnap),
    section("Content-visibility (sf-content-auto)", contentAuto),
    section("Overflow fade (sf-overflow-fade + edge/axis modifiers)", overflowFade),
    section("Scrim over media (sf-scrim, sf-scrim--*, sf-scrim__content)", scrims),
    section("Named background preset (sf-surface-bg)", surfaceBg),
    section("Text protect (sf-text-protect)", well(textProtect)),
    section("Text gradient (sf-text-gradient)", textGradient),
    section("Overlap (sf-overlap, sf-overlap-host)", well(stack("m", overlapHost, overlapDirections))),
    section("No tap highlight (sf-no-tap-highlight)", noTapHighlight),
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
