<script lang="ts">
  import SliderRow from '../inputs/SliderRow.svelte';
  import RangeWithNumber from '../inputs/RangeWithNumber.svelte';
  import ClampField from '../inputs/ClampField.svelte';
  import Section from '../inputs/Section.svelte';
  import TypeSpecimenRow from '../inputs/TypeSpecimenRow.svelte';
  import { themeState } from '../../lib/theme.svelte';
  import GOOGLE_FONTS_ALL from '../../data/google-fonts.generated.json';

  // <option> only reliably accepts a background via inline style (no dark:
  // variant support), so it's derived from the chrome theme directly.
  let optionBg = $derived(themeState.value === 'dark' ? '#16161e' : '#ffffff');

  let { overrides, onSet, onReset, onBulkChange }: {
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
    onBulkChange: (patch: Record<string, string | null>) => void;
  } = $props();

  const RATIO_PRESETS = [
    { label: "Minor Second — 1.067", value: 1.067 },
    { label: "Major Second — 1.125", value: 1.125 },
    { label: "Minor Third — 1.200", value: 1.2 },
    { label: "Major Third — 1.250", value: 1.25 },
    { label: "Perfect Fourth — 1.333", value: 1.333 },
    { label: "Aug. Fourth — 1.414", value: 1.414 },
    { label: "Golden — 1.618", value: 1.618 },
  ];

  const BODY_STACKS = [
    { label: "System sans-serif", value: "" },
    { label: "Geometric (Avenir, Montserrat…)", value: "var(--sf-font-geometric)" },
    { label: "Humanist (Seravek, Gill Sans…)", value: "var(--sf-font-humanist)" },
    { label: "Slab serif (Rockwell, Roboto Slab…)", value: "var(--sf-font-slab)" },
    { label: "Inter", value: "Inter, system-ui, sans-serif" },
    { label: "Georgia (serif)", value: "Georgia, 'Times New Roman', serif" },
    { label: "Merriweather (serif)", value: "'Merriweather', Georgia, serif" },
    { label: "JetBrains Mono", value: "'JetBrains Mono', 'Fira Code', monospace" },
  ];

  const HEADING_STACKS = [
    { label: "Same as body", value: "" },
    { label: "Geometric (Avenir, Montserrat…)", value: "var(--sf-font-geometric)" },
    { label: "Humanist (Seravek, Gill Sans…)", value: "var(--sf-font-humanist)" },
    { label: "Slab serif (Rockwell, Roboto Slab…)", value: "var(--sf-font-slab)" },
    { label: "Inter", value: "Inter, system-ui, sans-serif" },
    { label: "Georgia (serif)", value: "Georgia, 'Times New Roman', serif" },
    { label: "Impact / condensed", value: "Impact, 'Arial Narrow', sans-serif" },
  ];

  const MONO_STACKS = [
    { label: "System mono", value: "ui-monospace, monospace" },
    { label: "JetBrains Mono", value: "'JetBrains Mono', 'Fira Code', monospace" },
    { label: "Source Code Pro", value: "'Source Code Pro', 'Courier New', monospace" },
  ];

  // Full Google Fonts catalogue (family + category), generated from
  // fonts.google.com/metadata/fonts and sorted by popularity — powers the
  // autocomplete datalist below. Any of the ~1900 families can be loaded.
  type GoogleFont = { f: string; c: string };
  const GOOGLE_FONTS: GoogleFont[] = GOOGLE_FONTS_ALL as GoogleFont[];

  const WRAP_OPTIONS = [
    { label: "balance", value: "balance" },
    { label: "pretty",  value: "pretty" },
    { label: "normal",  value: "normal" },
  ];

  const WEIGHT_OPTIONS = ["100","200","300","400","500","600","700","800","900"];
  const WEIGHT_DEFAULTS: Record<string, string> = {
    "--sf-font-weight-body": "400",
    "--sf-font-weight-heading": "600",
    "--sf-font-weight-display": "700",
    "--sf-font-weight-interactive": "600",
  };

  const TEXT_STEPS = ["2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"];

  const TRACKING_TOKENS = [
    { label: "Tight",   token: "--sf-tracking-tight",   default: -0.025 },
    { label: "Normal",  token: "--sf-tracking-normal",  default: 0 },
    { label: "Wide",    token: "--sf-tracking-wide",    default: 0.025 },
    { label: "Wider",   token: "--sf-tracking-wider",   default: 0.05 },
    { label: "Widest",  token: "--sf-tracking-widest",  default: 0.1 },
  ];

  const LEADING_TOKENS = [
    { label: "Tight",   token: "--sf-leading-tight",   default: 1.1 },
    { label: "Snug",    token: "--sf-leading-snug",    default: 1.3 },
    { label: "Normal",  token: "--sf-leading-normal",  default: 1.5 },
    { label: "Relaxed", token: "--sf-leading-relaxed", default: 1.625 },
  ];

  const DISPLAY_LEADING = [
    { label: "Display S", token: "--sf-display-s-line-height", def: 1.1 },
    { label: "Display M", token: "--sf-display-m-line-height", def: 1.05 },
    { label: "Display L", token: "--sf-display-l-line-height", def: 1 },
  ];

  // ---- Per-element (body + h1–h6) editor data ---------------------------
  // Size options map to the modular scale steps + display sizes (the framework
  // defaults reference these var()s, so editing stays semantic).
  const SIZE_OPTIONS = [
    { label: "2xs", value: "var(--sf-text-2xs)" },
    { label: "xs",  value: "var(--sf-text-xs)" },
    { label: "s",   value: "var(--sf-text-s)" },
    { label: "m",   value: "var(--sf-text-m)" },
    { label: "l",   value: "var(--sf-text-l)" },
    { label: "xl",  value: "var(--sf-text-xl)" },
    { label: "2xl", value: "var(--sf-text-2xl)" },
    { label: "3xl", value: "var(--sf-text-3xl)" },
    { label: "4xl", value: "var(--sf-text-4xl)" },
    { label: "display-s", value: "var(--sf-text-display-s)" },
    { label: "display-m", value: "var(--sf-text-display-m)" },
    { label: "display-l", value: "var(--sf-text-display-l)" },
  ];
  const LEADING_OPTIONS = LEADING_TOKENS.map((t) => ({ label: t.label, value: `var(${t.token})`, num: t.default }));
  const TRACKING_OPTIONS = TRACKING_TOKENS.map((t) => ({ label: t.label, value: `var(${t.token})`, em: t.default }));

  // level → { tokens + framework defaults }
  type TypeLevel = {
    id: string; label: string; size: string; lh: string; wt: string; ls: string | null;
    dSize: string; dLh: string; dWt: string; dLs: string;
  };
  const TYPE_LEVELS: TypeLevel[] = [
    { id: "body", label: "Body", size: "--sf-body-font-size", lh: "--sf-body-line-height", wt: "--sf-body-font-weight", ls: null,
      dSize: "var(--sf-text-m)", dLh: "var(--sf-leading-normal)", dWt: "400", dLs: "" },
    { id: "h1", label: "H1", size: "--sf-h1-size", lh: "--sf-h1-line-height", wt: "--sf-h1-font-weight", ls: "--sf-h1-letter-spacing",
      dSize: "var(--sf-text-4xl)", dLh: "var(--sf-leading-tight)", dWt: "600", dLs: "var(--sf-tracking-tight)" },
    { id: "h2", label: "H2", size: "--sf-h2-size", lh: "--sf-h2-line-height", wt: "--sf-h2-font-weight", ls: "--sf-h2-letter-spacing",
      dSize: "var(--sf-text-3xl)", dLh: "var(--sf-leading-tight)", dWt: "600", dLs: "var(--sf-tracking-tight)" },
    { id: "h3", label: "H3", size: "--sf-h3-size", lh: "--sf-h3-line-height", wt: "--sf-h3-font-weight", ls: "--sf-h3-letter-spacing",
      dSize: "var(--sf-text-2xl)", dLh: "var(--sf-leading-snug)", dWt: "600", dLs: "var(--sf-tracking-normal)" },
    { id: "h4", label: "H4", size: "--sf-h4-size", lh: "--sf-h4-line-height", wt: "--sf-h4-font-weight", ls: "--sf-h4-letter-spacing",
      dSize: "var(--sf-text-xl)", dLh: "var(--sf-leading-snug)", dWt: "600", dLs: "var(--sf-tracking-normal)" },
    { id: "h5", label: "H5", size: "--sf-h5-size", lh: "--sf-h5-line-height", wt: "--sf-h5-font-weight", ls: "--sf-h5-letter-spacing",
      dSize: "var(--sf-text-l)", dLh: "var(--sf-leading-normal)", dWt: "600", dLs: "var(--sf-tracking-normal)" },
    { id: "h6", label: "H6", size: "--sf-h6-size", lh: "--sf-h6-line-height", wt: "--sf-h6-font-weight", ls: "--sf-h6-letter-spacing",
      dSize: "var(--sf-text-m)", dLh: "var(--sf-leading-normal)", dWt: "600", dLs: "var(--sf-tracking-wide)" },
  ];

  let activeLevelId = $state<string>("h1");
  let activeLevel = $derived(TYPE_LEVELS.find((l) => l.id === activeLevelId)!);
  let activeMw = $derived(levelMaxWidthToken(activeLevelId));

  function num(name: string, fallback: number) {
    const v = parseFloat(overrides[name] ?? "");
    return isNaN(v) ? fallback : v;
  }

  let ratioMin  = $derived(num("--sf-text-ratio-min", 1.25));
  let ratioMax  = $derived(num("--sf-text-ratio-max", 1.333));
  let baseMin   = $derived(num("--sf-text-base-min", 1));
  let baseMax   = $derived(num("--sf-text-base-max", 1.25));
  let dispMin   = $derived(num("--sf-text-display-base-min", 2.4));
  let dispMax   = $derived(num("--sf-text-display-base-max", 3));
  let taper     = $derived(num("--sf-leading-taper", 0));
  let textScale    = $derived(num("--sf-text-scale", 1));
  let displayScale = $derived(num("--sf-text-display-scale", 1));
  // Shared fluid viewport endpoints (rem, unitless). Min = mobile, max = desktop.
  let vwMin     = $derived(num("--sf-fluid-min-vw", 22.5));
  let vwMax     = $derived(num("--sf-fluid-max-vw", 90));

  // Sorted section toggles — fonts → scale → rhythm → tracking → weights →
  // elements → measures. Every control lives in exactly one of these.
  let showFonts       = $state(false);
  let showScale       = $state(false);
  let showLineHeights = $state(false);
  let showTracking    = $state(false);
  let showWeights     = $state(false);
  let showElements    = $state(false);
  let showLineLengths = $state(false);

  let currentBodyFont    = $derived(overrides["--sf-font-body"] ?? "");
  let currentHeadingFont = $derived(overrides["--sf-font-heading"] ?? "");
  let currentMonoFont    = $derived(overrides["--sf-font-mono"] ?? "ui-monospace, monospace");

  let googleFontChoice = $state("");
  let customFontTarget = $state<"body" | "heading" | "mono">("body");

  function getTrackingVal(t: typeof TRACKING_TOKENS[0]): number {
    const raw = overrides[t.token];
    if (!raw) return t.default;
    return parseFloat(raw.replace("em",""));
  }

  function getLeadingVal(t: typeof LEADING_TOKENS[0]): number {
    return num(t.token, t.default);
  }

  function injectGoogleFont(fontName: string) {
    if (!fontName.trim()) return;
    const id = `gf-${fontName.replace(/\s+/g, "-")}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
      document.head.appendChild(link);
    }
  }

  const FONT_TARGETS = [
    { id: "body",    label: "Body",    token: "--sf-font-body",    fallback: "sans-serif" },
    { id: "heading", label: "Heading", token: "--sf-font-heading", fallback: "sans-serif" },
    { id: "mono",    label: "Mono",    token: "--sf-font-mono",    fallback: "monospace" },
  ] as const;

  function applyCustomFont(fontName: string, target: "body" | "heading" | "mono") {
    if (!fontName.trim()) return;
    injectGoogleFont(fontName);
    const t = FONT_TARGETS.find((x) => x.id === target)!;
    onSet(t.token, `'${fontName}', ${t.fallback}`);
  }

  // Per-element helpers
  function levelVal(token: string | null, dflt: string): string {
    if (!token) return dflt;
    return overrides[token] ?? dflt;
  }
  function setLevel(token: string | null, value: string, dflt: string) {
    if (!token) return;
    if (value === dflt) onReset(token); else onSet(token, value);
  }
  // Heading levels also own a --sf-h{n}-max-width token; the tab dot and the
  // bulk reset must track it alongside size/lh/weight/tracking.
  function levelMaxWidthToken(id: string): string | null {
    return id.startsWith("h") ? `--sf-${id}-max-width` : null;
  }
</script>

<!-- Shared weight button-grid — one markup for every weight token (base scale
     steps and role weights alike). Clicking the default resets. -->
{#snippet weightGrid(label: string, tokenName: string, defaultVal: string)}
  {@const current = overrides[tokenName] ?? defaultVal}
  {@const isOverridden = tokenName in overrides}
  <div class="group">
    <div class="flex items-center justify-between mb-1.5">
      <span class="text-[11px] font-semibold text-slate-800 dark:text-slate-200">{label}</span>
      {#if isOverridden}
        <button onclick={() => onReset(tokenName)} class="text-[9px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer transition-colors">reset</button>
      {/if}
    </div>
    <div class="flex gap-1">
      {#each WEIGHT_OPTIONS as w (w)}
        <button
          onclick={() => w === defaultVal ? (tokenName in overrides ? onReset(tokenName) : undefined) : onSet(tokenName, w)}
          style={`font-weight: ${parseInt(w)}`}
          class={`flex-1 py-1.5 rounded-lg text-[10px] border transition-all cursor-pointer font-mono ${
            current === w
              ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
              : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >{w}</button>
      {/each}
    </div>
  </div>
{/snippet}

<div class="p-4 space-y-6">

  <!-- ═══ 1. FONTS — families, loader, OpenType ═══ -->
  <Section title="Fonts" spacing="space-y-4" bind:open={showFonts}>
    {#each [
      { label: "Body", token: "--sf-font-body", current: currentBodyFont, opts: BODY_STACKS },
      { label: "Heading", token: "--sf-font-heading", current: currentHeadingFont, opts: HEADING_STACKS },
      { label: "Mono", token: "--sf-font-mono", current: currentMonoFont, opts: MONO_STACKS },
    ] as f (f.token)}
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-14 shrink-0">{f.label}</span>
        <select
          value={f.current}
          onchange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            v ? onSet(f.token, v) : onReset(f.token);
          }}
          class="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          style={`font-family: ${f.current || "inherit"}`}
        >
          {#each f.opts as o (o.label)}
            <option value={o.value} style={`font-family:inherit;background:${optionBg};`}>{o.label}</option>
          {/each}
          {#if f.current && !f.opts.some((o) => o.value === f.current)}
            <option value={f.current} style={`background:${optionBg};`}>Custom: {f.current.split(",")[0].replace(/['"]/g, "")}</option>
          {/if}
        </select>
        {#if f.token in overrides}
          <button onclick={() => onReset(f.token)} class="text-[9px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
    {/each}

    <!-- Google font loader — one autocomplete over the full catalogue
         (~1900 families, native datalist filtering), applied to body,
         heading or mono. -->
    <div class="rounded-xl bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8 p-3 space-y-2">
      <div class="flex items-baseline justify-between">
        <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Google Font</div>
        <div class="text-[9px] text-slate-400 dark:text-slate-600">{GOOGLE_FONTS.length} fonts</div>
      </div>
      <input
        type="text"
        list="sf-google-fonts"
        aria-label="Google font name"
        placeholder="Type to search all Google Fonts…"
        oninput={(e) => { googleFontChoice = (e.target as HTMLInputElement).value; }}
        value={googleFontChoice}
        class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
      />
      <datalist id="sf-google-fonts">
        {#each GOOGLE_FONTS as g (g.f)}
          <option value={g.f}>{g.c}</option>
        {/each}
      </datalist>
      <div class="flex gap-1">
        {#each FONT_TARGETS as t (t.id)}
          <button
            onclick={() => { customFontTarget = t.id; }}
            class={`flex-1 py-1.5 rounded text-[10px] border transition-all cursor-pointer ${customFontTarget === t.id ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200" : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400"}`}
          >{t.label}</button>
        {/each}
      </div>
      <button
        onclick={() => applyCustomFont(googleFontChoice, customFontTarget)}
        class="w-full py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold cursor-pointer hover:bg-indigo-600/30 transition-all"
      >
        Load &amp; apply to {customFontTarget}
      </button>
    </div>

    <!-- OpenType / variable-font axes -->
    <div class="pt-1 space-y-3">
      <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400">OpenType</div>
      <div>
        <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Numeric figures</div>
        <div class="flex gap-1">
          {#each [["tabular-nums", "tabular-nums (default)"], ["proportional-nums", "proportional-nums"], ["normal", "normal"]] as [val, label] (val)}
            {@const cur = overrides["--sf-font-numeric"] ?? "tabular-nums"}
            <button
              onclick={() => val === "tabular-nums" ? onReset("--sf-font-numeric") : onSet("--sf-font-numeric", val)}
              class={`flex-1 py-1.5 rounded-lg text-[9px] border transition-all cursor-pointer ${
                cur === val
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                  : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >{label}</button>
          {/each}
        </div>
      </div>
      <div>
        <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Optical sizing</div>
        <div class="flex gap-1">
          {#each [["auto", "auto (default)"], ["none", "none"]] as [val, label] (val)}
            {@const cur = overrides["--sf-optical-sizing"] ?? "auto"}
            <button
              onclick={() => val === "auto" ? onReset("--sf-optical-sizing") : onSet("--sf-optical-sizing", val)}
              class={`flex-1 py-2 rounded-lg text-[10px] border transition-all cursor-pointer ${
                cur === val
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                  : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >{label}</button>
          {/each}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-24 shrink-0">Font features</span>
        <input
          type="text"
          value={overrides["--sf-font-features"] ?? ""}
          aria-label="Font features"
          placeholder="normal"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            v ? onSet("--sf-font-features", v) : onReset("--sf-font-features");
          }}
          class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-font-features" in overrides}
          <button onclick={() => onReset("--sf-font-features")} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-24 shrink-0">Variation</span>
        <input
          type="text"
          value={overrides["--sf-font-variation"] ?? ""}
          aria-label="Font variation settings"
          placeholder="normal"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            v ? onSet("--sf-font-variation", v) : onReset("--sf-font-variation");
          }}
          class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-font-variation" in overrides}
          <button onclick={() => onReset("--sf-font-variation")} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
    </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- ═══ 2. FLUID SCALE — text & display, identical generators ═══ -->
  <Section title="Fluid scale (Mobile → Desktop)" spacing="space-y-4" bind:open={showScale}>
    <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
      Utopia-style fluid scale. The viewport range and the modular ratio are shared;
      text and display each have their own base size and multiplier.
    </p>

    <!-- Shared viewport endpoints (also used by the space scale) -->
    <ClampField
      title="Viewport range (shared)"
      minValue={vwMin} maxValue={vwMax}
      min={15} max={120} step={0.5} unit="rem"
      minLabel="Mobile" maxLabel="Desktop"
      overridden={"--sf-fluid-min-vw" in overrides || "--sf-fluid-max-vw" in overrides}
      onReset={() => { onReset("--sf-fluid-min-vw"); onReset("--sf-fluid-max-vw"); }}
      onMinChange={(v) => onSet("--sf-fluid-min-vw", String(v))}
      onMaxChange={(v) => onSet("--sf-fluid-max-vw", String(v))}
    />

    <!-- TEXT generator -->
    <ClampField
      title="Text base size &amp; ratio"
      minValue={baseMin} maxValue={baseMax}
      min={0.7} max={2} step={0.01} unit="rem"
      minLabel="Mobile" maxLabel="Desktop"
      previewKind="type"
      overridden={"--sf-text-base-min" in overrides || "--sf-text-base-max" in overrides}
      onReset={() => { onReset("--sf-text-base-min"); onReset("--sf-text-base-max"); }}
      onMinChange={(v) => onSet("--sf-text-base-min", String(v))}
      onMaxChange={(v) => onSet("--sf-text-base-max", String(v))}
      ratioPresets={RATIO_PRESETS}
      ratioMin={ratioMin} ratioMax={ratioMax}
      ratioMin_bound={1.05} ratioMax_bound={1.8}
      onRatioMinChange={(v) => onSet("--sf-text-ratio-min", String(v))}
      onRatioMaxChange={(v) => onSet("--sf-text-ratio-max", String(v))}
    />
    <SliderRow
      label="Text scale multiplier" value={textScale} min={0.5} max={2} step={0.05}
      help="--sf-text-scale — multiplies every text size at once."
      overridden={"--sf-text-scale" in overrides}
      onChange={(v) => onSet("--sf-text-scale", String(v))}
      onReset={() => onReset("--sf-text-scale")}
    />

    <!-- DISPLAY generator — identical controls; the ratio block edits the SAME
         shared --sf-text-ratio-* tokens (the framework derives display sizes
         from the text ratio), so the two generators stay in lockstep. -->
    <ClampField
      title="Display base size &amp; ratio"
      minValue={dispMin} maxValue={dispMax}
      min={1.5} max={6} step={0.05} unit="rem"
      minLabel="Mobile" maxLabel="Desktop"
      previewKind="type"
      overridden={"--sf-text-display-base-min" in overrides || "--sf-text-display-base-max" in overrides}
      onReset={() => { onReset("--sf-text-display-base-min"); onReset("--sf-text-display-base-max"); }}
      onMinChange={(v) => onSet("--sf-text-display-base-min", String(v))}
      onMaxChange={(v) => onSet("--sf-text-display-base-max", String(v))}
      ratioPresets={RATIO_PRESETS}
      ratioMin={ratioMin} ratioMax={ratioMax}
      ratioMin_bound={1.05} ratioMax_bound={1.8}
      onRatioMinChange={(v) => onSet("--sf-text-ratio-min", String(v))}
      onRatioMaxChange={(v) => onSet("--sf-text-ratio-max", String(v))}
    />
    <SliderRow
      label="Display scale multiplier" value={displayScale} min={0.5} max={2} step={0.05}
      help="--sf-text-display-scale — multiplies every display size at once."
      overridden={"--sf-text-display-scale" in overrides}
      onChange={(v) => onSet("--sf-text-display-scale", String(v))}
      onReset={() => onReset("--sf-text-display-scale")}
    />

    <!-- Live ramp — every "Aa" renders at its token's real size (var() against
         the framework CSS + live overrides); labels are DOM-measured. -->
    <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3 space-y-1 max-h-96 overflow-y-auto">
      <div class="text-[9px] font-semibold text-slate-500 mb-1">Text</div>
      {#each [...TEXT_STEPS].reverse() as label (label)}
        <TypeSpecimenRow {label} varName={`--sf-text-${label}`} family="--sf-font-body" />
      {/each}
      <div class="text-[9px] font-semibold text-slate-500 mt-3 mb-1">Display</div>
      {#each ["l", "m", "s"] as label (label)}
        <TypeSpecimenRow {label} varName={`--sf-text-display-${label}`} family="--sf-font-heading" />
      {/each}
    </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- ═══ 3. LINE HEIGHTS — leading scale, taper, display leadings ═══ -->
  <Section title="Line heights" spacing="space-y-4" bind:open={showLineHeights}>
    <div>
      <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-2">Leading scale</div>
      <div class="space-y-2">
        {#each LEADING_TOKENS as t (t.token)}
          <SliderRow
            label={t.label} value={getLeadingVal(t)} min={1.0} max={2.2} step={0.05}
            help={`${t.token} — ${t.label.toLowerCase()} line height`}
            overridden={t.token in overrides}
            onChange={(v) => onSet(t.token, String(v))}
            onReset={() => onReset(t.token)}
          />
        {/each}
      </div>
    </div>

    <SliderRow
      label="Leading taper" value={taper} min={0} max={0.5} step={0.01}
      help="--sf-leading-taper — how aggressively large sizes shrink their line-height."
      overridden={"--sf-leading-taper" in overrides}
      onChange={(v) => onSet("--sf-leading-taper", String(v))}
      onReset={() => onReset("--sf-leading-taper")}
    />

    <div>
      <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-2">Display line heights</div>
      <div class="space-y-2">
        {#each DISPLAY_LEADING as row (row.token)}
          <SliderRow
            label={row.label} value={num(row.token, row.def)} min={0.8} max={1.5} step={0.025}
            help={`${row.token}`}
            overridden={row.token in overrides}
            onChange={(v) => onSet(row.token, String(v))}
            onReset={() => onReset(row.token)}
          />
        {/each}
      </div>
    </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- ═══ 4. LETTER SPACING — tracking scale ═══ -->
  <Section title="Letter spacing" bind:open={showTracking}>
      <p class="text-[9px] text-slate-400 dark:text-slate-600 mb-2">
        Overriding these propagates to heading sizes that reference them.
      </p>
      <div class="space-y-2">
        {#each TRACKING_TOKENS as t (t.token)}
          <div class="group">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] font-semibold text-slate-800 dark:text-slate-200">{t.label}</span>
              {#if t.token in overrides}
                <button onclick={() => onReset(t.token)} class="text-[9px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer ">reset</button>
              {/if}
            </div>
            <RangeWithNumber
              value={getTrackingVal(t)}
              min={-0.1} max={0.2} step={0.005} unit="em"
              onChange={(v) => onSet(t.token, `${v}em`)}
            />
          </div>
        {/each}
      </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- ═══ 5. FONT WEIGHTS — base scale + role weights ═══ -->
  <Section title="Font weights" spacing="space-y-4" bind:open={showWeights}>
      <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Weight scale</div>
      <p class="text-[9px] text-slate-400 dark:text-slate-600 leading-relaxed -mt-2">Named weight tokens. Override if your font uses non-standard axis values.</p>
      {@render weightGrid("Light", "--sf-font-weight-light", "300")}
      {@render weightGrid("Normal", "--sf-font-weight-normal", "400")}
      {@render weightGrid("Medium", "--sf-font-weight-medium", "500")}
      {@render weightGrid("Semibold", "--sf-font-weight-semibold", "600")}
      {@render weightGrid("Bold", "--sf-font-weight-bold", "700")}

      <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 pt-2">Role weights</div>
      <p class="text-[9px] text-slate-400 dark:text-slate-600 leading-relaxed -mt-2">Semantic defaults the elements build on — reweight the whole site from here.</p>
      {@render weightGrid("Heading", "--sf-font-weight-heading", WEIGHT_DEFAULTS["--sf-font-weight-heading"] ?? "600")}
      {@render weightGrid("Display", "--sf-font-weight-display", WEIGHT_DEFAULTS["--sf-font-weight-display"] ?? "700")}
      {@render weightGrid("Body strong", "--sf-font-weight-strong", "700")}
      {@render weightGrid("Interactive", "--sf-font-weight-interactive", WEIGHT_DEFAULTS["--sf-font-weight-interactive"] ?? "600")}
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- ═══ 6. ELEMENTS — body + h1–h6 per-element styles & body details ═══ -->
  <Section title="Elements (body, h1–h6)" bind:open={showElements}>

    <!-- Level selector -->
    <div class="flex bg-black/5 dark:bg-white/5 border border-black/8 dark:border-white/8 rounded-lg p-0.5 gap-0.5">
      {#each TYPE_LEVELS as lvl (lvl.id)}
        {@const lvlMw = levelMaxWidthToken(lvl.id)}
        {@const isOv = (lvl.size in overrides) || (lvl.lh in overrides) || (lvl.wt in overrides) || (!!lvl.ls && lvl.ls in overrides) || (!!lvlMw && lvlMw in overrides)}
        <button
          onclick={() => { activeLevelId = lvl.id; }}
          class={`relative flex-1 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
            activeLevelId === lvl.id ? "bg-black/12 dark:bg-white/12 text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          {lvl.label}
          {#if isOv}<span class="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-indigo-400"></span>{/if}
        </button>
      {/each}
    </div>

    <!-- Live sample — renders with the level's real tokens (var() resolved
         against the framework CSS + live overrides loaded in this document),
         so it can never disagree with what actually ships. -->
    <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 px-3 py-3 overflow-hidden">
      <div
        class="text-slate-900/85 dark:text-white/85 truncate"
        style={`font-size:var(${activeLevel.size}, ${activeLevel.dSize}); font-weight:var(${activeLevel.wt}, ${activeLevel.dWt}); letter-spacing:${activeLevel.ls ? `var(${activeLevel.ls}, normal)` : "normal"}; line-height:var(${activeLevel.lh}, ${activeLevel.dLh}); font-family:var(${activeLevel.id === "body" ? "--sf-font-body" : "--sf-font-heading"})`}
      >The quick brown fox
      </div>
    </div>

    <!-- Size -->
    <div class="flex items-center gap-2">
      <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">Size</span>
      <select
        value={levelVal(activeLevel.size, activeLevel.dSize)}
        onchange={(e) => setLevel(activeLevel.size, (e.target as HTMLSelectElement).value, activeLevel.dSize)}
        class="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
      >
        {#each SIZE_OPTIONS as o (o.value)}
          <option value={o.value} style={`background:${optionBg};`}>{o.label}</option>
        {/each}
        {#if !SIZE_OPTIONS.some((o) => o.value === levelVal(activeLevel.size, activeLevel.dSize))}
          <option value={levelVal(activeLevel.size, activeLevel.dSize)} style={`background:${optionBg};`}>custom</option>
        {/if}
      </select>
    </div>

    <!-- Line height -->
    <div class="flex items-center gap-2">
      <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">Line height</span>
      <select
        value={levelVal(activeLevel.lh, activeLevel.dLh)}
        onchange={(e) => setLevel(activeLevel.lh, (e.target as HTMLSelectElement).value, activeLevel.dLh)}
        class="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
      >
        {#each LEADING_OPTIONS as o (o.value)}
          <option value={o.value} style={`background:${optionBg};`}>{o.label} · {o.num}</option>
        {/each}
        {#if !LEADING_OPTIONS.some((o) => o.value === levelVal(activeLevel.lh, activeLevel.dLh))}
          <option value={levelVal(activeLevel.lh, activeLevel.dLh)} style={`background:${optionBg};`}>custom</option>
        {/if}
      </select>
    </div>

    <!-- Weight -->
    <div>
      <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Weight</span>
      <div class="flex gap-1 mt-1">
        {#each WEIGHT_OPTIONS as w (w)}
          {@const cur = levelVal(activeLevel.wt, activeLevel.dWt)}
          <button
            onclick={() => setLevel(activeLevel.wt, w, activeLevel.dWt)}
            style={`font-weight:${parseInt(w)}`}
            class={`flex-1 py-1.5 rounded-lg text-[10px] border transition-all cursor-pointer font-mono ${
              cur === w ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200" : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >{w}</button>
        {/each}
      </div>
    </div>

    <!-- Letter spacing (headings only) -->
    {#if activeLevel.ls}
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">Tracking</span>
        <select
          value={levelVal(activeLevel.ls, activeLevel.dLs)}
          onchange={(e) => setLevel(activeLevel.ls, (e.target as HTMLSelectElement).value, activeLevel.dLs)}
          class="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          {#each TRACKING_OPTIONS as o (o.value)}
            <option value={o.value} style={`background:${optionBg};`}>{o.label}</option>
          {/each}
          {#if !TRACKING_OPTIONS.some((o) => o.value === levelVal(activeLevel.ls, activeLevel.dLs))}
            <option value={levelVal(activeLevel.ls, activeLevel.dLs)} style={`background:${optionBg};`}>custom</option>
          {/if}
        </select>
      </div>
    {/if}

    <!-- Max width (heading levels only) -->
    {#if activeLevel.id.startsWith("h")}
      {@const maxWidthToken = `--sf-${activeLevel.id}-max-width`}
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">Max width</span>
        <input
          type="text"
          value={overrides[maxWidthToken] ?? ""}
          aria-label={`${activeLevel.label} max width`}
          placeholder="none"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            v ? onSet(maxWidthToken, v) : onReset(maxWidthToken);
          }}
          class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if maxWidthToken in overrides}
          <button onclick={() => onReset(maxWidthToken)} class="text-[9px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
    {/if}

    <div class="flex justify-end">
      {#if (activeLevel.size in overrides) || (activeLevel.lh in overrides) || (activeLevel.wt in overrides) || (!!activeLevel.ls && activeLevel.ls in overrides) || (!!activeMw && activeMw in overrides)}
        <button
          onclick={() => {
            const patch: Record<string, null> = { [activeLevel.size]: null, [activeLevel.lh]: null, [activeLevel.wt]: null };
            if (activeLevel.ls) patch[activeLevel.ls] = null;
            if (activeMw) patch[activeMw] = null;
            onBulkChange(patch);
          }}
          class="text-[9px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
        >reset {activeLevel.label}</button>
      {/if}
    </div>

    <!-- Body & prose details -->
    <div class="pt-2 space-y-4 border-t border-black/6 dark:border-white/6">
      <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400">Body &amp; prose details</div>

      <!-- Em style toggle -->
      <div>
        <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-2">Emphasis style</div>
        <div class="flex gap-1">
          {#each [["Italic", "italic"], ["Normal", "normal"]] as [label, val] (val)}
            {@const current = overrides["--sf-body-em-style"] ?? "italic"}
            <button
              onclick={() => val === "italic" ? onReset("--sf-body-em-style") : onSet("--sf-body-em-style", val)}
              class={`flex-1 py-2 rounded-lg text-[10px] border transition-all cursor-pointer ${
                current === val
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                  : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            ><span style={`font-style: ${val}`}>{label}</span></button>
          {/each}
        </div>
      </div>

      <!-- Code font size -->
      <SliderRow
        label="Code font size" value={num("--sf-code-font-size", 0.875)} min={0.7} max={1.1} step={0.005} unit="em"
        help="--sf-code-font-size — size of inline code relative to surrounding text"
        overridden={"--sf-code-font-size" in overrides}
        onChange={(v) => onSet("--sf-code-font-size", `${v}em`)}
        onReset={() => onReset("--sf-code-font-size")}
      />

      <!-- Text wrap -->
      {#each [
        { label: "Heading wrap", token: "--sf-heading-text-wrap", defaultVal: "balance" },
        { label: "Body wrap",    token: "--sf-body-text-wrap",    defaultVal: "pretty" },
      ] as row (row.token)}
        {@const current = overrides[row.token] ?? row.defaultVal}
        <div>
          <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{row.label}</div>
          <div class="flex gap-1">
            {#each WRAP_OPTIONS as o (o.value)}
              <button
                onclick={() => o.value === row.defaultVal && !(row.token in overrides) ? undefined : (o.value === row.defaultVal ? onReset(row.token) : onSet(row.token, o.value))}
                class={`flex-1 px-2 py-1.5 rounded-lg text-[10px] border transition-all cursor-pointer ${
                  current === o.value
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                    : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >{o.label}</button>
            {/each}
          </div>
        </div>
      {/each}

      <!-- Link external marker -->
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-24 shrink-0">External marker</span>
        <input
          type="text"
          value={overrides["--sf-link-external-marker"] ?? ""}
          aria-label="External link marker"
          placeholder={'" ↗"'}
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value;
            v ? onSet("--sf-link-external-marker", v) : onReset("--sf-link-external-marker");
          }}
          class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-link-external-marker" in overrides}
          <button onclick={() => onReset("--sf-link-external-marker")} class="text-[9px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>

      <!-- Link external label (screen-reader text for the marker glyph) -->
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-24 shrink-0">External label</span>
        <input
          type="text"
          value={overrides["--sf-link-external-label"] ?? ""}
          aria-label="External link label"
          placeholder={'"opens in a new window or external site"'}
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value;
            v ? onSet("--sf-link-external-label", v) : onReset("--sf-link-external-label");
          }}
          class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-link-external-label" in overrides}
          <button onclick={() => onReset("--sf-link-external-label")} class="text-[9px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
    </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- ═══ 7. LINE LENGTHS — per-step max-widths ═══ -->
  <Section title="Line lengths (max-width)" bind:open={showLineLengths}>
      <p class="text-[9px] text-slate-400 dark:text-slate-600 leading-relaxed">
        Per-text-size max-width caps on <span class="font-mono text-slate-600 dark:text-slate-400">.sf-text-*</span> elements. Set to <span class="font-mono text-slate-600 dark:text-slate-400">none</span> to remove the constraint; use <span class="font-mono text-slate-600 dark:text-slate-400">ch</span> units for character-based measures.
      </p>
      <div class="space-y-1.5">
        {#each [
          { label: "2xs", token: "--sf-text-2xs-max-width", def: "55ch" },
          { label: "xs",  token: "--sf-text-xs-max-width",  def: "60ch" },
          { label: "s",   token: "--sf-text-s-max-width",   def: "65ch" },
          { label: "m",   token: "--sf-text-m-max-width",   def: "65ch" },
          { label: "l",   token: "--sf-text-l-max-width",   def: "none" },
          { label: "xl",  token: "--sf-text-xl-max-width",  def: "none" },
          { label: "2xl", token: "--sf-text-2xl-max-width", def: "none" },
          { label: "3xl", token: "--sf-text-3xl-max-width", def: "none" },
          { label: "4xl", token: "--sf-text-4xl-max-width", def: "none" },
        ] as row (row.token)}
          <div class="flex items-center gap-2">
            <span class="text-[9px] font-mono text-slate-600 dark:text-slate-400 w-6 shrink-0">{row.label}</span>
            <input
              type="text"
              value={overrides[row.token] ?? ""}
              aria-label={`${row.label} max width`}
              placeholder={row.def}
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                v ? onSet(row.token, v) : onReset(row.token);
              }}
              class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
            {#if row.token in overrides}
              <button onclick={() => onReset(row.token)} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
            {/if}
          </div>
        {/each}
      </div>
  </Section>
</div>
