<script lang="ts">
  import type { SlashedToken } from '../../types';
  import { KNOBS_BY_DOMAIN } from '../../lib/powerKnobs';
  import { parseOklch, stringifyOklch, getRelativeLuminance, getContrastRatio } from '../../lib/colorUtils';
  import { resolveColor, resolveColorForTheme, resolveRgb, resolveBackground, previewVersion } from '../../lib/previewResolver.svelte';
  import { lumlockerPreview } from '../../lib/lumlockerPreview.svelte';
  import OklchColorDesk from '../inputs/OklchColorDesk.svelte';
  import PowerKnobRow from '../inputs/PowerKnobRow.svelte';
  import SliderRow from '../inputs/SliderRow.svelte';
  import ColorInput from '../inputs/ColorInput.svelte';

  let { tokens, overrides, onSet, onReset, onBulkChange, onSelectDomain }: {
    tokens: SlashedToken[];
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
    onBulkChange: (patch: Record<string, string | null>) => void;
    onSelectDomain?: (d: string) => void;
  } = $props();

  // Resolve real, browser-computed colors from the live preview iframe.
  // Reading previewVersion.value makes these reactive to override changes.
  function paint(expr: string, fallback: string): string {
    void previewVersion.value;
    const r = resolveColor(expr);
    return r || fallback;
  }
  function paintBg(expr: string, fallback: string): string {
    void previewVersion.value;
    const r = resolveBackground(expr);
    return r && r !== "none" ? r : fallback;
  }
  function paintTheme(expr: string, theme: "light" | "dark", fallback: string): string {
    void previewVersion.value;
    const r = resolveColorForTheme(expr, theme);
    return r || fallback;
  }

  // Each gradient carries its default formula plus the structured pieces
  // (interpolation space, angle/direction, and the two colour stops) so the UI
  // can offer granular controls and still show what the framework derives.
  type GradientDef = {
    name: string; label: string; group: "brand" | "fade";
    kind: "angle" | "dir"; space: "oklch" | "oklab";
    angle: number; dir: "right" | "left" | "top" | "bottom";
    stop1: string; stop2: string; formula: string;
  };
  const GRADIENT_TOKENS: GradientDef[] = [
    { name: "--sf-gradient-primary",   label: "Primary",   group: "brand", kind: "angle", space: "oklch", angle: 135, dir: "right",
      stop1: "var(--sf-color-primary)",   stop2: "oklch(from var(--sf-color-primary) calc(l - 0.08) c h)",
      formula: "linear-gradient(in oklch 135deg, var(--sf-color-primary), oklch(from var(--sf-color-primary) calc(l - 0.08) c h))" },
    { name: "--sf-gradient-secondary", label: "Secondary", group: "brand", kind: "angle", space: "oklch", angle: 135, dir: "right",
      stop1: "var(--sf-color-secondary)", stop2: "oklch(from var(--sf-color-secondary) calc(l - 0.08) c h)",
      formula: "linear-gradient(in oklch 135deg, var(--sf-color-secondary), oklch(from var(--sf-color-secondary) calc(l - 0.08) c h))" },
    { name: "--sf-gradient-tertiary",  label: "Tertiary",  group: "brand", kind: "angle", space: "oklch", angle: 135, dir: "right",
      stop1: "var(--sf-color-tertiary)",  stop2: "oklch(from var(--sf-color-tertiary) calc(l - 0.08) c h)",
      formula: "linear-gradient(in oklch 135deg, var(--sf-color-tertiary), oklch(from var(--sf-color-tertiary) calc(l - 0.08) c h))" },
    { name: "--sf-gradient-brand",     label: "Brand",     group: "brand", kind: "angle", space: "oklch", angle: 135, dir: "right",
      stop1: "var(--sf-color-primary)",   stop2: "oklch(from var(--sf-color-primary) l c calc(h + 30))",
      formula: "linear-gradient(in oklch 135deg, var(--sf-color-primary), oklch(from var(--sf-color-primary) l c calc(h + 30)))" },
    { name: "--sf-gradient-surface",   label: "Surface",   group: "brand", kind: "angle", space: "oklab", angle: 180, dir: "bottom",
      stop1: "var(--sf-color-surface)",   stop2: "var(--sf-color-bg)",
      formula: "linear-gradient(in oklab 180deg, var(--sf-color-surface), var(--sf-color-bg))" },
    { name: "--sf-gradient-fade--r",   label: "Fade →",    group: "fade", kind: "dir", space: "oklch", angle: 90,  dir: "right",
      stop1: "transparent", stop2: "var(--sf-color-bg)", formula: "linear-gradient(in oklch to right, transparent, var(--sf-color-bg))" },
    { name: "--sf-gradient-fade--l",   label: "Fade ←",    group: "fade", kind: "dir", space: "oklch", angle: 270, dir: "left",
      stop1: "transparent", stop2: "var(--sf-color-bg)", formula: "linear-gradient(in oklch to left, transparent, var(--sf-color-bg))" },
    { name: "--sf-gradient-fade--t",   label: "Fade ↑",    group: "fade", kind: "dir", space: "oklch", angle: 0,   dir: "top",
      stop1: "transparent", stop2: "var(--sf-color-bg)", formula: "linear-gradient(in oklch to top, transparent, var(--sf-color-bg))" },
    { name: "--sf-gradient-fade--b",   label: "Fade ↓",    group: "fade", kind: "dir", space: "oklch", angle: 180, dir: "bottom",
      stop1: "transparent", stop2: "var(--sf-color-bg)", formula: "linear-gradient(in oklch to bottom, transparent, var(--sf-color-bg))" },
  ];

  // Brand colours the luminance lock (:root[data-lumlocker]) remaps.
  const LOCKABLE = [
    { key: "primary",   label: "Primary" },
    { key: "secondary", label: "Secondary" },
    { key: "tertiary",  label: "Tertiary" },
    { key: "action",    label: "Action" },
  ];

  type ColorSource = {
    name: string; label: string; side: "light" | "dark"; default: string; colorKey: string;
  };

  const BRAND_SOURCES: ColorSource[] = [
    { name: "--sf-color-primary-source-light",   label: "Primary",   side: "light", default: "oklch(0.47 0.27 264)", colorKey: "primary" },
    { name: "--sf-color-primary-source-dark",    label: "Primary",   side: "dark",  default: "oklch(0.715 0.243 264)", colorKey: "primary" },
    { name: "--sf-color-secondary-source-light", label: "Secondary", side: "light", default: "oklch(0.22 0.04 264)", colorKey: "secondary" },
    { name: "--sf-color-secondary-source-dark",  label: "Secondary", side: "dark",  default: "oklch(0.84 0.036 264)", colorKey: "secondary" },
    { name: "--sf-color-tertiary-source-light",  label: "Tertiary",  side: "light", default: "oklch(0.42 0.22 295)", colorKey: "tertiary" },
    { name: "--sf-color-tertiary-source-dark",   label: "Tertiary",  side: "dark",  default: "oklch(0.74 0.198 295)", colorKey: "tertiary" },
    { name: "--sf-color-action-source-light",    label: "Action",    side: "light", default: "oklch(0.50 0.22 235)", colorKey: "action" },
    { name: "--sf-color-action-source-dark",     label: "Action",    side: "dark",  default: "oklch(0.70 0.198 235)", colorKey: "action" },
    { name: "--sf-color-neutral-source-light",   label: "Neutral",   side: "light", default: "oklch(0.52 0.025 260)", colorKey: "neutral" },
    { name: "--sf-color-neutral-source-dark",    label: "Neutral",   side: "dark",  default: "oklch(0.69 0.0225 260)", colorKey: "neutral" },
    { name: "--sf-color-base-source-light",      label: "Base",      side: "light", default: "oklch(0.96 0.006 250)", colorKey: "base" },
    { name: "--sf-color-base-source-dark",       label: "Base",      side: "dark",  default: "oklch(0.22 0.003 250)", colorKey: "base" },
  ];

  const STATUS_SOURCES: ColorSource[] = [
    { name: "--sf-color-success-source-light", label: "Success", side: "light", default: "oklch(0.50 0.16 145)", colorKey: "success" },
    { name: "--sf-color-success-source-dark",  label: "Success", side: "dark",  default: "oklch(0.70 0.144 145)", colorKey: "success" },
    { name: "--sf-color-warning-source-light", label: "Warning", side: "light", default: "oklch(0.75 0.17 80)", colorKey: "warning" },
    { name: "--sf-color-warning-source-dark",  label: "Warning", side: "dark",  default: "oklch(0.65 0.153 80)", colorKey: "warning" },
    { name: "--sf-color-info-source-light",    label: "Info",    side: "light", default: "oklch(0.48 0.18 235)", colorKey: "info" },
    { name: "--sf-color-info-source-dark",     label: "Info",    side: "dark",  default: "oklch(0.71 0.162 235)", colorKey: "info" },
    { name: "--sf-color-danger-source-light",  label: "Danger",  side: "light", default: "oklch(0.48 0.22 12)", colorKey: "danger" },
    { name: "--sf-color-danger-source-dark",   label: "Danger",  side: "dark",  default: "oklch(0.73 0.198 12)", colorKey: "danger" },
  ];

  // Baked per-step ramp curve — mirrors core/tokens.css: how far each step
  // pulls its lightness toward the absolute anchor, plus a chroma taper.
  // Preview-only (the shape is fixed in the framework); the two anchors below
  // are the tunable public knobs.
  const RAMP_CURVE = [
    { label: "50",  step: "tint",  frac: 0.95, taper: 0.20 },
    { label: "100", step: "tint",  frac: 0.88, taper: 0.30 },
    { label: "200", step: "tint",  frac: 0.72, taper: 0.50 },
    { label: "300", step: "tint",  frac: 0.52, taper: 0.72 },
    { label: "400", step: "tint",  frac: 0.30, taper: 0.88 },
    { label: "600", step: "shade", frac: 0.16, taper: 0.96 },
    { label: "700", step: "shade", frac: 0.36, taper: 0.88 },
    { label: "800", step: "shade", frac: 0.58, taper: 0.72 },
    { label: "900", step: "shade", frac: 0.78, taper: 0.52 },
    { label: "950", step: "shade", frac: 0.90, taper: 0.38 },
  ] as const;

  // The two PUBLIC-ADVANCED ramp anchors — absolute OKLCH lightness the tint
  // (50–400) / shade (600–950) halves reach toward. Unitless 0–1.
  const ANCHOR_KNOBS = [
    { name: "--sf-palette-tint-l",  label: "Lightest step (L)", default: 0.97 },
    { name: "--sf-palette-shade-l", label: "Darkest step (L)",  default: 0.1 },
  ];

  const CURVE_PRESETS = [
    {
      label: "Softer", desc: "Low contrast palette",
      patch: { "--sf-palette-tint-l": "0.93", "--sf-palette-shade-l": "0.2" },
    },
    {
      label: "Default", desc: "Balanced contrast",
      patch: Object.fromEntries(ANCHOR_KNOBS.map((k) => [k.name, null])) as Record<string, null>,
    },
    {
      label: "Punchy", desc: "High contrast palette",
      patch: { "--sf-palette-tint-l": "0.98", "--sf-palette-shade-l": "0.05" },
    },
  ];

  const SEMANTIC_OVERRIDES = [
    { name: "--sf-color-link",        label: "Link" },
    { name: "--sf-color-link--visited", label: "Link visited" },
    { name: "--sf-color-mark-bg",     label: "Mark background" },
    { name: "--sf-color-mark-text",   label: "Mark text" },
    { name: "--sf-color-code-bg",     label: "Code background" },
    { name: "--sf-color-code-text",   label: "Code text" },
    { name: "--sf-color-overlay",     label: "Overlay" },
    { name: "--sf-color-black",       label: "Black" },
    { name: "--sf-color-white",       label: "White" },
    { name: "--sf-color-dim",         label: "Dim (translucent black)" },
  ];

  const SWATCH_STEPS = ["50","100","200","300","400","500","600","700","800","900","950"];
  const BRAND_COLOR_KEYS = ["primary","secondary","tertiary","action","neutral"];
  // Base no longer rides the color-mix tint/shade curve like the 5 brand colors.
  // It is an absolute fixed-lightness OKLCH ramp: each step pins L and inherits
  // c + h from the source — oklch(from <base> <L> c h). Mirror those exact L
  // values from core/tokens.css so the panel preview matches the framework.
  const BASE_RAMP: Record<string, number> = {
    "50": 0.97, "100": 0.94, "200": 0.88, "300": 0.78, "400": 0.65,
    "500": 0.50, "600": 0.37, "700": 0.27, "800": 0.17, "900": 0.11, "950": 0.06,
  };
  // Keys that render light/dark palette strips. Base is included but routed
  // through its own ramp (see paletteSwatch); the rest use the mix curve.
  const PALETTE_COLOR_KEYS = [...BRAND_COLOR_KEYS, "base"];

  // Status families (success/warning/info/danger) have NO numeric 50-950
  // ramp in the framework — only these four derived values actually exist
  // (core/tokens.css: resolved color + -subtle/-muted alpha washes + a
  // light-dark() -strong shift). Mirror that here instead of faking a ramp.
  const STATUS_VARIANTS: { label: string; expr: (key: string) => string }[] = [
    { label: "Base",   expr: (k) => `var(--sf-color-${k})` },
    { label: "Subtle", expr: (k) => `var(--sf-color-${k}-subtle)` },
    { label: "Muted",  expr: (k) => `var(--sf-color-${k}-muted)` },
    { label: "Strong", expr: (k) => `var(--sf-color-${k}-strong)` },
  ];

  const ALL_SOURCES: ColorSource[] = [...BRAND_SOURCES, ...STATUS_SOURCES];

  // Live semantic-color preview shown at the very top of the panel. Each tile
  // is painted with the resolved semantic background and its paired on-color
  // text, so it doubles as a real legibility check. Resolved from the live
  // canvas via paint(), so it tracks both overrides and the active theme.
  const SEMANTIC_PREVIEW: { heading: string; items: { name: string; label: string; fg: string }[] }[] = [
    { heading: "Brand", items: [
      { name: "--sf-color-primary",   label: "Primary",   fg: "--sf-color-text--on-primary" },
      { name: "--sf-color-secondary", label: "Secondary", fg: "--sf-color-text--on-secondary" },
      { name: "--sf-color-tertiary",  label: "Tertiary",  fg: "--sf-color-text--on-tertiary" },
      { name: "--sf-color-action",    label: "Action",    fg: "--sf-color-text--on-action" },
      { name: "--sf-color-neutral",   label: "Neutral",   fg: "--sf-color-text--on-neutral" },
    ] },
    { heading: "Status", items: [
      { name: "--sf-color-success", label: "Success", fg: "--sf-color-text--on-success" },
      { name: "--sf-color-warning", label: "Warning", fg: "--sf-color-text--on-warning" },
      { name: "--sf-color-info",    label: "Info",    fg: "--sf-color-text--on-info" },
      { name: "--sf-color-danger",  label: "Danger",  fg: "--sf-color-text--on-danger" },
    ] },
    { heading: "Surfaces & text", items: [
      { name: "--sf-color-bg",      label: "Bg",      fg: "--sf-color-text" },
      { name: "--sf-color-surface", label: "Surface", fg: "--sf-color-text" },
      { name: "--sf-color-raised",  label: "Raised",  fg: "--sf-color-text" },
      { name: "--sf-color-inset",   label: "Inset",   fg: "--sf-color-text" },
      { name: "--sf-color-inverse", label: "Inverse", fg: "--sf-color-text--on-inverse" },
    ] },
  ];

  // Separate contrast/focus knobs
  const contrastKnobs = (KNOBS_BY_DOMAIN["colors"] ?? []).filter(
    (k) => k.name === "--sf-contrast-bias" || k.name === "--sf-contrast-threshold"
  );
  const focusKnobs = (KNOBS_BY_DOMAIN["colors"] ?? []).filter(
    (k) => k.name === "--sf-focus-ring-width"
  );

  let showBrandSources = $state(false);
  let showTextContrast = $state(false);
  let showShadeCurve = $state(false);
  let showStatus = $state(false);
  let showSemanticOverrides = $state(false);
  let showColorScheme = $state(false);
  let showGradients = $state(false);
  let showLumlocker = $state(false);
  let curvePreviewSide = $state<"light" | "dark">("light");
  // Per-gradient structured editors, seeded lazily from the defaults above.
  let gradientEdits = $state<Record<string, { space: string; kind: string; angle: number; dir: string; stop1: string; stop2: string }>>({});

  let lumlockerL = $derived(parseFloat(overrides["--sf-lumlocker"] ?? "0.65"));

  function parseLinearGradient(css: string): { space: string; kind: string; angle: number; dir: string; stop1: string; stop2: string } | null {
    const m = css.match(/^linear-gradient\(\s*in\s+(\S+)\s+(to\s+\w+|\d+deg)\s*,(.+)\)$/i);
    if (!m) return null;
    const space = m[1];
    const head = m[2].trim();
    const isDir = head.startsWith("to ");
    const dir = isDir ? head.slice(3).trim() : "right";
    const angle = isDir ? 0 : parseInt(head);
    // Paren-aware comma split for stops
    let depth = 0, start = 0;
    const stops: string[] = [];
    const s = m[3];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "(") depth++;
      else if (s[i] === ")") depth--;
      else if (s[i] === "," && depth === 0) { stops.push(s.slice(start, i).trim()); start = i + 1; }
    }
    stops.push(s.slice(start).trim());
    if (stops.length < 2) return null;
    return { space, kind: isDir ? "dir" : "angle", angle, dir, stop1: stops[0], stop2: stops[1] };
  }

  function gradEditDefaults(g: GradientDef) {
    const raw = overrides[g.name];
    const fromOverride = raw ? parseLinearGradient(raw) : null;
    return fromOverride ?? { space: g.space, kind: g.kind, angle: g.angle, dir: g.dir, stop1: g.stop1, stop2: g.stop2 };
  }
  // Pure read — safe to call during template render (no $state mutation).
  function gradEdit(g: GradientDef) {
    return gradientEdits[g.name] ?? gradEditDefaults(g);
  }
  function composeGradient(g: GradientDef): string {
    const e = gradEdit(g);
    const head = e.kind === "dir" ? `to ${e.dir}` : `${e.angle}deg`;
    return `linear-gradient(in ${e.space} ${head}, ${e.stop1}, ${e.stop2})`;
  }
  function setGradientPart(g: GradientDef, part: "angle" | "dir" | "stop1" | "stop2", value: string | number) {
    if (!gradientEdits[g.name]) {
      gradientEdits[g.name] = gradEditDefaults(g);
    }
    (gradientEdits[g.name] as Record<string, string | number>)[part] = value;
    onSet(g.name, composeGradient(g));
  }

  // LumLocker swatch preview: mirrors the framework's oklch(from <source> L c h).
  // Works for any valid CSS color input, not just oklch() literals.
  function lockedColor(colorKey: string, side: "light" | "dark"): string {
    const srcName = `--sf-color-${colorKey}-source-${side}`;
    const src = overrides[srcName] ?? BRAND_SOURCES.find(s => s.name === srcName)?.default ?? "";
    if (!src) return "";
    return `oklch(from ${src} ${lumlockerL} c h)`;
  }

  // Track which color rows are in Auto dark mode.
  // A key starts in auto only if its dark token is NOT already in overrides — otherwise the user
  // has an existing dark value (loaded from URL/localStorage) that we must not silently overwrite.
  let autoDarkSet = $state<Set<string>>(new Set(
    ALL_SOURCES.filter(s => s.side === "light" && !(
      (ALL_SOURCES.find(d => d.colorKey === s.colorKey && d.side === "dark")?.name ?? "") in overrides
    )).map(s => s.colorKey)
  ));

  let sourceTokenMap = $derived.by(() => {
    const map: Record<string, SlashedToken> = {};
    for (const t of tokens) {
      if (ALL_SOURCES.some((s) => s.name === t.name)) map[t.name] = t;
    }
    return map;
  });

  // Resolve a source token's effective value with the panel-wide precedence:
  // explicit override → loaded token value → hardcoded default. Every place
  // that reads or derives from a source value must go through this so the
  // auto-dark seed/preview never disagrees with the swatch strips and inputs.
  function sourceValue(source: ColorSource | undefined): string {
    if (!source) return "";
    return overrides[source.name] ?? sourceTokenMap[source.name]?.value ?? source.default;
  }

  function sourceByName(name: string): ColorSource | undefined {
    return ALL_SOURCES.find((s) => s.name === name);
  }

  let activeCurvePreset = $derived(CURVE_PRESETS.find((p) =>
    Object.entries(p.patch).every(([k, v]) =>
      v === null ? !(k in overrides) : overrides[k] === v
    )
  ));

  function getAnchor(name: string, def: number): number {
    const raw = overrides[name];
    if (raw === undefined) return def;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : def;
  }

  // Build brand pairs: group by colorKey then render light/dark
  const BRAND_PAIRS: [ColorSource, ColorSource | undefined][] = [];
  for (let i = 0; i < BRAND_SOURCES.length; i += 2) {
    BRAND_PAIRS.push([BRAND_SOURCES[i], BRAND_SOURCES[i + 1]]);
  }
  const STATUS_PAIRS: [ColorSource, ColorSource | undefined][] = [];
  for (let i = 0; i < STATUS_SOURCES.length; i += 2) {
    STATUS_PAIRS.push([STATUS_SOURCES[i], STATUS_SOURCES[i + 1]]);
  }

  function deriveDarkFromLight(lightVal: string, colorKey: string): string {
    const { l, c, h, valid } = parseOklch(lightVal);
    if (!valid) return lightVal;
    let darkL: number, darkC: number;
    if (colorKey === 'base') {
      darkL = Math.max(0.16, Math.min(1.18 - l, 0.24));
      darkC = c * 0.5;
    } else {
      darkL = Math.max(0.65, Math.min(0.95 - l * 0.5, 0.88));
      darkC = c * 0.9;
    }
    return stringifyOklch(darkL, darkC, h);
  }

  // Endpoint colors for palette step computation — approximated from source tokens so we
  // can build concrete color-mix() expressions without relying on the themed probe.
  function getLightSurface(): string {
    return sourceValue(sourceByName("--sf-color-base-source-light"));
  }

  function getDarkSurface(): string {
    const darkSource = sourceByName("--sf-color-base-source-dark");
    const hasExplicitDark = darkSource && (overrides[darkSource.name] ?? sourceTokenMap[darkSource.name]?.value) !== undefined;
    if (hasExplicitDark) return sourceValue(darkSource);
    return deriveDarkFromLight(sourceValue(sourceByName("--sf-color-base-source-light")), "base");
  }

  function getLightText(): string {
    const n = sourceValue(sourceByName("--sf-color-neutral-source-light"));
    const { l, c, h, valid } = parseOklch(n);
    if (!valid) return "oklch(0.12 0.02 260)";
    return stringifyOklch(Math.max(0.05, Math.min(l - 0.38, 0.3)), c * 0.8, h);
  }

  function getDarkText(): string {
    const n = sourceValue(sourceByName("--sf-color-neutral-source-dark"));
    const { l, c, h, valid } = parseOklch(n);
    if (!valid) return "oklch(0.92 0.02 260)";
    return stringifyOklch(Math.min(1.0, Math.max(l + 0.22, 0.88)), c * 0.8, h);
  }

  // Preview one brand palette step with the framework's absolute-anchor model
  // (core/tokens.css): pull the source lightness a fixed fraction toward
  // --sf-palette-tint-l (tints) / --sf-palette-shade-l (shades), clamped with
  // max()/min() so it can't fold, with a chroma taper. Independent of
  // surface/text — the ramp no longer mixes toward them.
  function computePaletteSwatch(sourceColor: string, step: string): string {
    void previewVersion.value;
    if (step === "500") return resolveColor(sourceColor) || sourceColor;
    const def = RAMP_CURVE.find((s) => s.label === step);
    if (!def) return sourceColor;
    const isTint = def.step === "tint";
    const target = isTint
      ? getAnchor("--sf-palette-tint-l", 0.97)
      : getAnchor("--sf-palette-shade-l", 0.1);
    const clamp = isTint ? "max" : "min";
    const expr = `oklch(from ${sourceColor} ${clamp}(l, calc(l + (${target} - l) * ${def.frac})) calc(c * ${def.taper}) h)`;
    return resolveColor(expr) || expr;
  }

  // Base palette swatch — mirrors the framework's absolute ramp
  // oklch(from <source> <fixed-L> c h). Independent of surface/text, unlike
  // the brand-color mix curve, because base does not mix toward anything.
  function computeBasePaletteSwatch(sourceColor: string, step: string): string {
    void previewVersion.value;
    const L = BASE_RAMP[step];
    if (L === undefined) return sourceColor;
    const expr = `oklch(from ${sourceColor} ${L} c h)`;
    return resolveColor(expr) || expr;
  }

  // Route each color to the correct palette system: base uses the fixed-L ramp,
  // every other key uses the color-mix tint/shade curve toward surface/text.
  function paletteSwatch(colorKey: string, sourceColor: string, step: string, _surface: string, _text: string): string {
    return colorKey === "base"
      ? computeBasePaletteSwatch(sourceColor, step)
      : computePaletteSwatch(sourceColor, step);
  }

  function handleLightChange(light: ColorSource, dark: ColorSource | undefined, newVal: string) {
    onSet(light.name, newVal);
  }

  function toggleDarkMode(colorKey: string, dark: ColorSource | undefined, lightName: string) {
    const darkOverridden = !!(dark && (dark.name in overrides));
    const effectivelyAuto = autoDarkSet.has(colorKey) && !darkOverridden;
    if (effectivelyAuto) {
      // Switch to manual — populate dark with the derived value as a starting point
      const lightVal = sourceValue(ALL_SOURCES.find(s => s.name === lightName));
      if (dark) onSet(dark.name, deriveDarkFromLight(lightVal, colorKey));
      autoDarkSet = new Set([...autoDarkSet].filter(k => k !== colorKey));
    } else {
      // Switch to auto — remove dark override so the CSS formula handles it at runtime
      if (dark) onBulkChange({ [dark.name]: null });
      autoDarkSet = new Set([...autoDarkSet, colorKey]);
    }
  }

  // Live contrast summary — resolves real on-screen colors from the preview.
  const KEY_CONTRAST_PAIRS = [
    { label: "Body text on surface",  fg: "var(--sf-color-text)",    bg: "var(--sf-color-surface)" },
    { label: "White on primary",      fg: "#ffffff",                 bg: "var(--sf-color-primary)" },
    { label: "Primary on surface",    fg: "var(--sf-color-primary)", bg: "var(--sf-color-surface)" },
  ];

  function pairRatio(fg: string, bg: string): number | null {
    void previewVersion.value;
    const f = resolveRgb(fg);
    const b = resolveRgb(bg);
    if (!f || !b) return null;
    return getContrastRatio(getRelativeLuminance(...f), getRelativeLuminance(...b));
  }
</script>

{#snippet swatchTip(name: string)}
  <!-- Visible hover label — the native `title` attribute alone is slow to
       appear and easy to miss on these small swatches, so pair it with an
       instant floating label. -->
  <span
    aria-hidden="true"
    class="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-20 whitespace-nowrap rounded bg-slate-900 border border-white/10 px-1.5 py-0.5 text-[8px] font-mono text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
  >{name}</span>
{/snippet}

<div class="p-4 space-y-6">

  <!-- LIVE SEMANTIC PREVIEW -->
  <section class="space-y-2">
    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Semantic colors</div>
    <p class="text-[9px] text-slate-400 dark:text-slate-600 leading-relaxed">
      Live preview — every semantic role on its on-color text, shown in light and dark. Resolved from the canvas, updates as you edit.
    </p>
    <div class="space-y-2.5">
      {#each SEMANTIC_PREVIEW as grp (grp.heading)}
        <div class="space-y-1">
          <div class="text-[8px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">{grp.heading}</div>
          {#each ["light", "dark"] as side (side)}
            <div class="flex items-center gap-1">
              <span class="text-[7px] text-slate-400 dark:text-slate-600 w-2.5 shrink-0 text-right select-none uppercase">{side === "light" ? "L" : "D"}</span>
              <div class="grid grid-cols-5 gap-1 flex-1">
                {#each grp.items as it (it.name)}
                  {@const bg = paintTheme(`var(${it.name})`, side as "light" | "dark", "transparent")}
                  {@const fg = paintTheme(`var(${it.fg})`, side as "light" | "dark", "currentColor")}
                  <div
                    class="rounded-md border border-black/10 dark:border-white/10 px-1 py-1.5 flex flex-col items-center justify-center gap-0.5 min-h-[34px]"
                    style={`background:${bg}; color:${fg}`}
                    title={`${it.name} (${side}) — ${bg}`}
                  >
                    <span class="text-[11px] font-bold leading-none">Aa</span>
                    <span class="text-[7px] leading-none opacity-90">{it.label}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- BRAND SOURCES -->
  <section class="space-y-3">
    <button
      onclick={() => { showBrandSources = !showBrandSources; }}
      aria-expanded={showBrandSources}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Brand color sources</div>
      <span class="text-[10px] text-slate-500">{showBrandSources ? "▲" : "▼"}</span>
    </button>
    {#if showBrandSources}
    <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
      OKLCH source values — all 200+ derived color steps are computed automatically. Tints (50–400) mix toward Base
      (the "Surface" color) and shades (600–950) mix toward Text (driven by Neutral) — so editing Base or Neutral below
      will shift every family's tints/shades too. That's expected, not a bug.
    </p>
    <div class="space-y-3">
      {#each BRAND_PAIRS as [light, dark] (light.name)}
        {@const darkOverridden = !!(dark && (dark.name in overrides))}
        {@const isAutoMode = autoDarkSet.has(light.colorKey) && !darkOverridden}
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <div class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">{light.label}</div>
            {#if dark}
              <button
                onclick={() => toggleDarkMode(light.colorKey, dark, light.name)}
                class={`text-[8px] px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                  isAutoMode
                    ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                    : "border-black/10 dark:border-white/10 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >{isAutoMode ? "Auto dark" : "Manual dark"}</button>
            {/if}
          </div>
          <OklchColorDesk
            label={`${light.label} (light)`}
            tokenName={light.name}
            value={sourceValue(light)}
            overridden={light.name in overrides}
            onChange={(v) => handleLightChange(light, dark, v)}
            onReset={() => onReset(light.name)}
          />
          <!-- Palette swatch strips — light row then dark row, computed from concrete values -->
          {#if PALETTE_COLOR_KEYS.includes(light.colorKey)}
            {@const lightSrcVal = sourceValue(light)}
            {@const darkSrcVal = isAutoMode
              ? deriveDarkFromLight(lightSrcVal, light.colorKey)
              : (dark ? (sourceValue(dark)) : lightSrcVal)}
            {@const lSurface = getLightSurface()}
            {@const dSurface = getDarkSurface()}
            {@const lText = getLightText()}
            {@const dText = getDarkText()}
            <div class="mt-1 pl-1 space-y-px">
              <div class="flex items-center gap-1">
                <span class="text-[7px] text-slate-400 dark:text-slate-600 w-2.5 shrink-0 text-right select-none">L</span>
                <div class="flex gap-0.5">
                  {#each SWATCH_STEPS as step (step)}
                    {@const resolved = paletteSwatch(light.colorKey, lightSrcVal, step, lSurface, lText)}
                    <div
                      class="group relative w-5 h-3 rounded-t border-x border-t border-black/10 dark:border-white/10"
                      style:background={resolved}
                      title={`${light.colorKey}-${step} (light) — ${resolved}`}
                    >{@render swatchTip(`${light.colorKey}-${step}`)}</div>
                  {/each}
                </div>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-[7px] text-slate-400 dark:text-slate-600 w-2.5 shrink-0 text-right select-none">D</span>
                <div class="flex gap-0.5">
                  {#each SWATCH_STEPS as step (step)}
                    {@const resolved = paletteSwatch(light.colorKey, darkSrcVal, step, dSurface, dText)}
                    <div
                      class="group relative w-5 h-3 rounded-b border-x border-b border-black/10 dark:border-white/10"
                      style:background={resolved}
                      title={`${light.colorKey}-${step} (dark) — ${resolved}`}
                    >{@render swatchTip(`${light.colorKey}-${step}`)}</div>
                  {/each}
                </div>
              </div>
            </div>
            {#if light.colorKey === "base"}
              <p class="text-[8px] text-slate-400 dark:text-slate-600 leading-snug pl-1">
                Absolute lightness ramp — each step pins L and inherits chroma + hue from the source. Not the brand mix curve.
                Light and dark use the <em>same</em> L per step, so at the default near-zero chroma the two rows look almost
                identical — add chroma above to see them diverge by hue.
              </p>
            {/if}
          {/if}
          {#if dark && !isAutoMode}
            <OklchColorDesk
              label={`${dark.label} (dark mode)`}
              tokenName={dark.name}
              value={sourceValue(dark)}
              overridden={dark.name in overrides}
              onChange={(v) => onSet(dark.name, v)}
              onReset={() => onReset(dark.name)}
            />
          {:else if dark && isAutoMode}
            {@const derivedDark = deriveDarkFromLight(sourceValue(light), light.colorKey)}
            <div class="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-600 pl-1">
              <span
                class="w-3.5 h-3.5 rounded border border-black/10 dark:border-white/10 shrink-0"
                style:background={paint(derivedDark, derivedDark)}
                title={derivedDark}
              ></span>
              Dark: auto-derived ({derivedDark})
            </div>
          {/if}
        </div>
      {/each}
    </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- LUMLOCKER -->
  <section class="space-y-3">
    <button
      onclick={() => { showLumlocker = !showLumlocker; }}
      aria-expanded={showLumlocker}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">LumLocker</div>
      <span class="text-[10px] text-slate-500">{showLumlocker ? "▲" : "▼"}</span>
    </button>
    {#if showLumlocker}
      <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
        Pins brand colors (primary, secondary, tertiary, action) to a fixed OKLCH
        lightness — useful for always-stable sections. Enable on canvas to preview.
      </p>
      <SliderRow
        label="LumLocker lightness (L)" value={lumlockerL} min={0} max={1} step={0.01}
        help="--sf-lumlocker — fixed OKLCH L applied to lockable brand colors under [data-lumlocker]"
        overridden={"--sf-lumlocker" in overrides}
        onChange={(v) => onSet("--sf-lumlocker", String(v))}
        onReset={() => onReset("--sf-lumlocker")}
      />

      <!-- Before / after preview for every lockable color -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3 space-y-2">
        <div class="flex items-center text-[8px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-widest">
          <span class="w-16 shrink-0">Color</span>
          <span class="flex-1 text-center">Current</span>
          <span class="flex-1 text-center">Locked</span>
        </div>
        {#each LOCKABLE as lk (lk.key)}
          {#each ["light", "dark"] as side (side)}
            {@const cur = paintTheme(`var(--sf-color-${lk.key}-source-${side})`, side as "light" | "dark", "")}
            {@const locked = lockedColor(lk.key, side as "light" | "dark")}
            <div class="flex items-center gap-1">
              <span class="text-[9px] text-slate-500 w-16 shrink-0">{lk.label} <span class="text-slate-400 dark:text-slate-600">{side === "light" ? "L" : "D"}</span></span>
              <span class="flex-1 h-5 rounded border border-black/10 dark:border-white/10" style={`background:${cur || `var(--sf-color-${lk.key})`}`}></span>
              <span class="text-slate-400 dark:text-slate-600 text-[10px] px-1">→</span>
              <span class="flex-1 h-5 rounded border border-black/10 dark:border-white/10" style={`background:${paint(locked, locked)}`} title={locked}></span>
            </div>
          {/each}
        {/each}
      </div>

      <!-- Toggle the lock on the live canvas -->
      <button
        onclick={() => { lumlockerPreview.value = !lumlockerPreview.value; }}
        class={`w-full py-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
          lumlockerPreview.value
            ? "bg-indigo-600/25 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
            : "border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
        }`}
      >{lumlockerPreview.value ? "✓ LumLocker active on canvas — click to disable" : "Preview LumLocker on live canvas"}</button>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- STATUS SOURCES -->
  <section class="space-y-3">
    <button
      onclick={() => { showStatus = !showStatus; }}
      aria-expanded={showStatus}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status colors</div>
      <span class="text-[10px] text-slate-500">{showStatus ? "▲" : "▼"}</span>
    </button>
    {#if showStatus}
      <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
        Dark mode is auto-derived from each light source by default. Switch to
        Manual dark to set a bespoke dark value.
      </p>
      <div class="space-y-3">
        {#each STATUS_PAIRS as [light, dark] (light.name)}
          {@const darkOverridden = !!(dark && (dark.name in overrides))}
          {@const isAutoMode = autoDarkSet.has(light.colorKey) && !darkOverridden}
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <div class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">{light.label}</div>
              {#if dark}
                <button
                  onclick={() => toggleDarkMode(light.colorKey, dark, light.name)}
                  class={`text-[8px] px-1.5 py-0.5 rounded border transition-all cursor-pointer ${
                    isAutoMode
                      ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
                      : "border-black/10 dark:border-white/10 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >{isAutoMode ? "Auto dark" : "Manual dark"}</button>
              {/if}
            </div>
            <OklchColorDesk
              label={`${light.label} light`}
              tokenName={light.name}
              value={sourceValue(light)}
              overridden={light.name in overrides}
              onChange={(v) => onSet(light.name, v)}
              onReset={() => onReset(light.name)}
            />
            {#if dark && !isAutoMode}
              <OklchColorDesk
                label={`${dark.label} dark`}
                tokenName={dark.name}
                value={sourceValue(dark)}
                overridden={dark.name in overrides}
                onChange={(v) => onSet(dark.name, v)}
                onReset={() => onReset(dark.name)}
              />
            {:else if dark && isAutoMode}
              {@const derivedDark = deriveDarkFromLight(sourceValue(light), light.colorKey)}
              <div class="flex items-center gap-1.5 text-[9px] text-slate-400 dark:text-slate-600 pl-1">
                <span
                  class="w-3.5 h-3.5 rounded border border-black/10 dark:border-white/10 shrink-0"
                  style:background={paint(derivedDark, derivedDark)}
                  title={derivedDark}
                ></span>
                Dark: auto-derived ({derivedDark})
              </div>
            {/if}
            <!-- Real derived variants — status colors have no numeric 50-950
                 ramp like brand; these four are the only values that exist. -->
            <div class="mt-1 pl-1 space-y-px">
              <div class="flex items-center gap-1">
                <span class="w-2.5 shrink-0"></span>
                <div class="flex gap-0.5">
                  {#each STATUS_VARIANTS as v (v.label)}
                    <span class="w-9 text-center text-[6px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-wide">{v.label}</span>
                  {/each}
                </div>
              </div>
              {#each [["L", "light"], ["D", "dark"]] as [tag, side] (tag)}
                <div class="flex items-center gap-1">
                  <span class="text-[7px] text-slate-400 dark:text-slate-600 w-2.5 shrink-0 text-right select-none">{tag}</span>
                  <div class="flex gap-0.5">
                    {#each STATUS_VARIANTS as v (v.label)}
                      {@const resolved = paintTheme(v.expr(light.colorKey), side as "light" | "dark", "")}
                      <div
                        class="group relative w-9 h-4 rounded-sm border border-black/10 dark:border-white/10"
                        style:background={resolved}
                        title={`${light.colorKey}-${v.label.toLowerCase()} (${side}) — ${resolved}`}
                      >{@render swatchTip(`${light.colorKey}-${v.label.toLowerCase()}`)}</div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
            <p class="text-[8px] text-slate-400 dark:text-slate-600 leading-snug pl-1">
              Status colors don't ride the brand mix curve — only the resolved color plus subtle/muted alpha washes and
              a strong shade are derived. There's no -50…-950 ramp for success/warning/info/danger.
            </p>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- TEXT CONTRAST -->
  <section class="space-y-4">
    <button
      onclick={() => { showTextContrast = !showTextContrast; }}
      aria-expanded={showTextContrast}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Text contrast</div>
      <span class="text-[10px] text-slate-500">{showTextContrast ? "▲" : "▼"}</span>
    </button>
    {#if showTextContrast}
    <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
      Controls whether text on brand-coloured surfaces is light or dark.
    </p>
    {#each contrastKnobs as k (k.name)}
      <PowerKnobRow
        knob={k}
        {overrides}
        onChange={(name, val) => val === null ? onReset(name) : onSet(name, val)}
      />
    {/each}

    <!-- Live contrast summary (links to the full WCAG tool) -->
    <div class="rounded-lg bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8 p-2.5 space-y-2">
      {#each KEY_CONTRAST_PAIRS as pair (pair.label)}
        {@const ratio = pairRatio(pair.fg, pair.bg)}
        {#if ratio !== null}
          <div class="flex items-center gap-2">
            <span
              class="w-6 h-6 rounded border border-black/10 dark:border-white/10 shrink-0 flex items-center justify-center text-[10px] font-bold"
              style={`background:${paint(pair.bg, pair.bg)}; color:${paint(pair.fg, pair.fg)}`}
            >Aa</span>
            <span class="text-[9px] text-slate-500 flex-1 truncate">{pair.label}</span>
            <span class="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-200">{ratio.toFixed(2)}:1</span>
            <span class={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ratio >= 4.5 ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"}`}>
              {ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA-L" : "✗"}
            </span>
          </div>
        {/if}
      {/each}
      {#if onSelectDomain}
        <button
          onclick={() => onSelectDomain?.("wcag")}
          class="w-full mt-1 py-1.5 rounded-lg bg-indigo-600/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold cursor-pointer hover:bg-indigo-600/25 transition-all"
        >Open contrast tool →</button>
      {/if}
    </div>

    <!-- Focus ring width — logically belongs with contrast/accessibility -->
    {#each focusKnobs as k (k.name)}
      <PowerKnobRow
        knob={k}
        {overrides}
        onChange={(name, val) => val === null ? onReset(name) : onSet(name, val)}
      />
    {/each}
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- SHADE CURVE -->
  <section class="space-y-4">
    <button
      onclick={() => { showShadeCurve = !showShadeCurve; }}
      aria-expanded={showShadeCurve}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Palette ramp</div>
      <span class="text-[10px] text-slate-500">{showShadeCurve ? "▲" : "▼"}</span>
    </button>
    {#if showShadeCurve}
    {@const _curvePrimLightSrc = overrides["--sf-color-primary-source-light"] ?? BRAND_SOURCES.find(s => s.name === "--sf-color-primary-source-light")?.default ?? "oklch(0.47 0.27 264)"}
    {@const _curvePrimDarkOv = overrides["--sf-color-primary-source-dark"]}
    {@const _curvePrimDarkSrc = _curvePrimDarkOv ?? (!autoDarkSet.has("primary") || _curvePrimDarkOv
      ? (BRAND_SOURCES.find(s => s.name === "--sf-color-primary-source-dark")?.default ?? deriveDarkFromLight(_curvePrimLightSrc, "primary"))
      : deriveDarkFromLight(_curvePrimLightSrc, "primary"))}
    {@const _curvePrimSrc = curvePreviewSide === "light" ? _curvePrimLightSrc : _curvePrimDarkSrc}
    <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
      Set how light the lightest step and how dark the darkest step reach; every
      step in between is derived automatically and stays light→dark for any
      colour. Step 500 is always the source colour.
    </p>

    <div class="grid grid-cols-3 gap-1.5">
      {#each CURVE_PRESETS as p (p.label)}
        <button
          onclick={() => onBulkChange(p.patch as Record<string, string | null>)}
          class={`flex flex-col items-center gap-0.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
            activeCurvePreset?.label === p.label
              ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
              : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <span class="text-[11px] font-bold">{p.label}</span>
          <span class="text-[9px] text-slate-500 text-center">{p.desc}</span>
        </button>
      {/each}
    </div>

    <!-- Lightness anchors -->
    <div>
      <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-2">Ramp anchors — absolute OKLCH lightness</div>
      <div class="space-y-2">
        {#each ANCHOR_KNOBS as k (k.name)}
          <SliderRow
            label={k.label}
            value={getAnchor(k.name, k.default)}
            min={0} max={1} step={0.01} unit=""
            overridden={k.name in overrides}
            onChange={(v) => onSet(k.name, `${v}`)}
            onReset={() => onReset(k.name)}
          />
        {/each}
      </div>
    </div>

    <!-- Curve preview = live palette. Each step shows the real resolved swatch
         AND the mix amount as a height bar, so the curve doubles as a palette. -->
    <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[9px] text-slate-400 dark:text-slate-600">Palette &amp; curve preview</span>
        <div class="flex bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 rounded p-0.5 gap-0.5">
          {#each ["light", "dark"] as side (side)}
            <button
              onclick={() => { curvePreviewSide = side as "light" | "dark"; }}
              class={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-all ${
                curvePreviewSide === side ? "bg-black/12 dark:bg-white/12 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >{side === "light" ? "Light" : "Dark"}</button>
          {/each}
        </div>
      </div>
      <div class="flex items-end gap-0.5 h-20">
        {#each SWATCH_STEPS as step (step)}
          {@const swatch = computePaletteSwatch(_curvePrimSrc, step)}
          <div class="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
            <div
              class="group relative w-full h-full rounded-sm border-x border-t border-black/10 dark:border-white/10"
              style={`background:${swatch}`}
              title={`primary-${step} (${curvePreviewSide})`}
            >{@render swatchTip(`primary-${step}`)}</div>
            <span class="text-[7px] font-mono text-slate-400 dark:text-slate-600">{step}</span>
          </div>
        {/each}
      </div>
      <p class="text-[8px] text-slate-400 dark:text-slate-600 mt-2">Live primary palette, 50 → 950 — always monotonic light→dark</p>
    </div>

    <!-- Mini palettes: all brand colors × all steps, reactive to light/dark toggle -->
    <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3 space-y-2">
      <div class="flex items-center justify-between mb-1">
        <span class="text-[9px] text-slate-400 dark:text-slate-600">Mini palettes — all brand colors</span>
        <div class="flex bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 rounded p-0.5 gap-0.5">
          {#each ["light", "dark"] as side (side)}
            <button
              onclick={() => { curvePreviewSide = side as "light" | "dark"; }}
              class={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-all ${
                curvePreviewSide === side ? "bg-black/12 dark:bg-white/12 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >{side === "light" ? "Light" : "Dark"}</button>
          {/each}
        </div>
      </div>
      {#each BRAND_COLOR_KEYS as colorKey (colorKey)}
        {@const miniLSrc = overrides[`--sf-color-${colorKey}-source-light`] ?? BRAND_SOURCES.find(s => s.name === `--sf-color-${colorKey}-source-light`)?.default ?? "oklch(0.5 0.15 264)"}
        {@const miniDOvKey = `--sf-color-${colorKey}-source-dark`}
        {@const miniDSrc = overrides[miniDOvKey] ?? (autoDarkSet.has(colorKey) && !overrides[miniDOvKey]
          ? deriveDarkFromLight(miniLSrc, colorKey)
          : (BRAND_SOURCES.find(s => s.name === miniDOvKey)?.default ?? deriveDarkFromLight(miniLSrc, colorKey)))}
        {@const miniSrc = curvePreviewSide === "light" ? miniLSrc : miniDSrc}
        <div class="flex items-center gap-1.5">
          <span class="text-[7px] font-mono text-slate-400 dark:text-slate-600 w-12 shrink-0 truncate">{colorKey}</span>
          <div class="flex gap-0.5 flex-1">
            {#each SWATCH_STEPS as step (step)}
              {@const swatch = computePaletteSwatch(miniSrc, step)}
              <div
                class="group relative flex-1 h-4 rounded-sm border border-black/10 dark:border-white/10"
                style={`background:${swatch}`}
                title={`${colorKey}-${step} (${curvePreviewSide})`}
              >{@render swatchTip(`${colorKey}-${step}`)}</div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- GRADIENTS -->
  <section class="space-y-3">
    <button
      onclick={() => { showGradients = !showGradients; }}
      aria-expanded={showGradients}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gradients</div>
      <span class="text-[10px] text-slate-500">{showGradients ? "▲" : "▼"}</span>
    </button>
    {#if showGradients}
      <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
        Auto-derived from your brand colors. Use the angle/direction and stop
        controls, or edit the raw value for full control.
      </p>
      {#each ["brand", "fade"] as grp (grp)}
        <div class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest pt-1">{grp === "brand" ? "Brand & surface" : "Edge fades"}</div>
        <div class="space-y-2">
          {#each GRADIENT_TOKENS.filter((g) => g.group === grp) as g (g.name)}
            {@const expr = `var(${g.name})`}
            {@const e = gradEdit(g)}
            <div class="rounded-lg border border-black/8 dark:border-white/8 bg-black/3 dark:bg-white/3 overflow-hidden">
              <div class="h-9 w-full" style={`background:${paintBg(expr, expr)}`}></div>
              <div class="px-2 py-1.5 space-y-1.5">
                <div class="flex items-center gap-2">
                  <span class="text-[10px] font-semibold text-slate-700 dark:text-slate-300 flex-1">{g.label}</span>
                  {#if g.name in overrides}
                    <button onclick={() => { delete gradientEdits[g.name]; onReset(g.name); }} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
                  {/if}
                </div>

                <!-- Structured controls -->
                {#if g.kind === "dir" && g.group !== "fade"}
                  <div class="flex items-center gap-1">
                    <span class="text-[8px] text-slate-500 w-10 shrink-0">Dir</span>
                    {#each ["top", "right", "bottom", "left"] as d (d)}
                      <button
                        onclick={() => setGradientPart(g, "dir", d)}
                        class={`flex-1 py-0.5 rounded text-[9px] border transition-all cursor-pointer capitalize ${
                          e.dir === d ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200" : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >{d}</button>
                    {/each}
                  </div>
                {:else if g.kind !== "dir"}
                  <div class="flex items-center gap-2">
                    <span class="text-[8px] text-slate-500 w-10 shrink-0">Angle</span>
                    <input
                      type="range" min="0" max="360" step="1" value={e.angle}
                      oninput={(ev) => setGradientPart(g, "angle", parseInt((ev.target as HTMLInputElement).value))}
                      class="flex-1 accent-indigo-500"
                    />
                    <span class="text-[9px] font-mono text-slate-600 dark:text-slate-400 w-9 text-right shrink-0">{e.angle}°</span>
                  </div>
                {/if}

                <div class="flex items-center gap-1">
                  <span class="text-[8px] text-slate-500 w-10 shrink-0">Stops</span>
                  <input
                    type="text" value={e.stop1}
                    onchange={(ev) => setGradientPart(g, "stop1", (ev.target as HTMLInputElement).value.trim())}
                    class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-0.5 text-[8px] font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text" value={e.stop2}
                    onchange={(ev) => setGradientPart(g, "stop2", (ev.target as HTMLInputElement).value.trim())}
                    class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-0.5 text-[8px] font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <!-- Default formula reference -->
                <div class="text-[8px] font-mono text-slate-400 dark:text-slate-600 leading-snug break-all">
                  <span class="text-slate-500">default:</span> {g.formula}
                </div>

                <!-- Raw escape hatch -->
                <input
                  type="text"
                  value={overrides[g.name] ?? ""}
                  placeholder="raw override (auto-derived if blank)"
                  onchange={(ev) => {
                    const v = (ev.target as HTMLInputElement).value.trim();
                    delete gradientEdits[g.name];
                    v ? onSet(g.name, v) : onReset(g.name);
                  }}
                  class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-0.5 text-[9px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          {/each}
        </div>
      {/each}
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- COLOR SCHEME -->
  <section class="space-y-3">
    <button
      onclick={() => { showColorScheme = !showColorScheme; }}
      aria-expanded={showColorScheme}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Color scheme</div>
      <span class="text-[10px] text-slate-500">{showColorScheme ? "▲" : "▼"}</span>
    </button>
    {#if showColorScheme}
      <p class="text-[9px] text-slate-400 dark:text-slate-600 leading-relaxed">
        --sf-color-scheme — sets the CSS <span class="font-mono text-slate-600 dark:text-slate-400">color-scheme</span> property on the root, controlling browser UI (scrollbars, inputs) and default background.
      </p>
      <div class="flex gap-1">
        {#each [["light dark", "light dark (default)"], ["light", "Light only"], ["dark", "Dark only"]] as [val, label] (val)}
          {@const current = overrides["--sf-color-scheme"] ?? "light dark"}
          <button
            onclick={() => val === "light dark" ? onReset("--sf-color-scheme") : onSet("--sf-color-scheme", val)}
            class={`flex-1 py-1.5 rounded-lg text-[10px] border transition-all cursor-pointer ${
              current === val
                ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >{label}</button>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- SEMANTIC OVERRIDES -->
  <section class="space-y-3">
    <button
      onclick={() => { showSemanticOverrides = !showSemanticOverrides; }}
      aria-expanded={showSemanticOverrides}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Semantic overrides</div>
      <span class="text-[10px] text-slate-500">{showSemanticOverrides ? "▲" : "▼"}</span>
    </button>
    {#if showSemanticOverrides}
      <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
        Direct color overrides for tokens the framework auto-derives. Use for edge cases.
      </p>
      <div class="space-y-2">
        {#each SEMANTIC_OVERRIDES as s (s.name)}
          {@const resolved = paint(`var(${s.name})`, "")}
          <div>
            <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1">{s.label}</div>
            <ColorInput
              token={s.name}
              value={overrides[s.name] ?? ""}
              placeholder={resolved ? `auto-derived · ${resolved}` : "auto-derived"}
              isOverridden={s.name in overrides}
              onSet={(v) => onSet(s.name, v)}
              onReset={() => onReset(s.name)}
            />
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="rounded-lg bg-black/3 dark:bg-white/3 border border-black/6 dark:border-white/6 p-3">
    <p class="text-[10px] text-slate-500 leading-relaxed">
      <span class="text-slate-600 dark:text-slate-400 font-semibold">All tokens tab</span> — override individual color steps (50–950), semantic aliases, or surface tokens directly.
    </p>
  </div>
</div>
