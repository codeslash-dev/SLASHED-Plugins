<script lang="ts">
  import type { SlashedToken } from '../../types';
  import { KNOBS_BY_DOMAIN } from '../../lib/powerKnobs';
  import PowerKnobRow from '../inputs/PowerKnobRow.svelte';
  import SliderRow from '../inputs/SliderRow.svelte';
  import RangeWithNumber from '../inputs/RangeWithNumber.svelte';
  import ClampField from '../inputs/ClampField.svelte';

  let { overrides, onSet, onReset, onBulkChange }: {
    tokens: SlashedToken[];
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

  // Curated Google Fonts for the dropdown loader.
  const GOOGLE_FONTS = [
    "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins",
    "Source Sans 3", "Raleway", "Nunito", "Work Sans", "Manrope", "DM Sans",
    "Outfit", "Plus Jakarta Sans", "Geist", "Space Grotesk", "Figtree",
    "Merriweather", "Playfair Display", "Lora", "Source Serif 4", "Roboto Slab",
    "IBM Plex Sans", "IBM Plex Mono", "JetBrains Mono", "Fira Code", "Space Mono",
  ];

  const WRAP_OPTIONS = [
    { label: "balance", value: "balance" },
    { label: "pretty",  value: "pretty" },
    { label: "normal",  value: "normal" },
  ];

  const WEIGHT_OPTIONS = ["300","400","500","600","700","800"];
  const WEIGHT_DEFAULTS: Record<string, string> = {
    "--sf-font-weight-body": "400",
    "--sf-font-weight-heading": "600",
    "--sf-font-weight-display": "700",
    "--sf-font-weight-interactive": "600",
  };

  const TEXT_STEPS = [
    { label: "2xs", factor: 0.64 },
    { label: "xs",  factor: 0.75 },
    { label: "s",   factor: 0.875 },
    { label: "m",   factor: 1 },
    { label: "l",   factor: 1.125 },
    { label: "xl",  factor: 1.25 },
    { label: "2xl", factor: 1.5 },
    { label: "3xl", factor: 1.875 },
    { label: "4xl", factor: 2.25 },
  ];

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

  // ---- Per-type (body + h1–h6) editor data ------------------------------
  // Size options map to the modular scale steps + display sizes (the framework
  // defaults reference these var()s, so editing stays semantic).
  const SIZE_OPTIONS = [
    { label: "2xs", value: "var(--sf-text-2xs)", approx: 0.64 },
    { label: "xs",  value: "var(--sf-text-xs)",  approx: 0.75 },
    { label: "s",   value: "var(--sf-text-s)",   approx: 0.875 },
    { label: "m",   value: "var(--sf-text-m)",   approx: 1 },
    { label: "l",   value: "var(--sf-text-l)",   approx: 1.125 },
    { label: "xl",  value: "var(--sf-text-xl)",  approx: 1.25 },
    { label: "2xl", value: "var(--sf-text-2xl)", approx: 1.5 },
    { label: "3xl", value: "var(--sf-text-3xl)", approx: 1.875 },
    { label: "4xl", value: "var(--sf-text-4xl)", approx: 2.25 },
    { label: "display-s", value: "var(--sf-text-display-s)", approx: 2.6 },
    { label: "display-m", value: "var(--sf-text-display-m)", approx: 3.2 },
    { label: "display-l", value: "var(--sf-text-display-l)", approx: 3.8 },
  ];
  const LEADING_OPTIONS = LEADING_TOKENS.map((t) => ({ label: t.label, value: `var(${t.token})`, num: t.default }));
  const TRACKING_OPTIONS = TRACKING_TOKENS.map((t) => ({ label: t.label, value: `var(${t.token})`, em: t.default }));

  // level → { tokens + framework defaults }
  const TYPE_LEVELS = [
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
  ] as const;

  let activeLevelId = $state<string>("h1");
  let activeLevel = $derived(TYPE_LEVELS.find((l) => l.id === activeLevelId)!);

  const knobs = KNOBS_BY_DOMAIN["typography"] ?? [];

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
  let textScale = $derived(num("--sf-text-scale", 1));
  // Shared fluid viewport endpoints (rem, unitless). Min = mobile, max = desktop.
  let vwMin     = $derived(num("--sf-fluid-min-vw", 22.5));
  let vwMax     = $derived(num("--sf-fluid-max-vw", 90));

  let showFontFamilies  = $state(false);
  let showPerType       = $state(false);
  let showBodyText      = $state(false);
  let showDisplayType   = $state(false);
  let showModularScale  = $state(false);
  let showScalePreview  = $state(false);
  let showAdvancedType  = $state(false);
  let showLineLengths   = $state(false);
  let showFontWeights   = $state(false);

  let currentBodyFont    = $derived(overrides["--sf-font-body"] ?? "");
  let currentHeadingFont = $derived(overrides["--sf-font-heading"] ?? "");
  let currentMonoFont    = $derived(overrides["--sf-font-mono"] ?? "ui-monospace, monospace");

  let googleFontChoice = $state("");
  let customFontTarget = $state<"body" | "heading">("body");

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
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@300;400;500;600;700&display=swap`;
      document.head.appendChild(link);
    }
  }

  function applyCustomFont(fontName: string, target: "body" | "heading") {
    if (!fontName.trim()) return;
    injectGoogleFont(fontName);
    const token = target === "body" ? "--sf-font-body" : "--sf-font-heading";
    onSet(token, `'${fontName}', sans-serif`);
  }

  // Per-type helpers
  function levelVal(token: string | null, dflt: string): string {
    if (!token) return dflt;
    return overrides[token] ?? dflt;
  }
  function setLevel(token: string | null, value: string, dflt: string) {
    if (!token) return;
    if (value === dflt) onReset(token); else onSet(token, value);
  }
  // Approximate sample size (rem) for the active level's current size.
  let sampleSize = $derived.by(() => {
    const v = levelVal(activeLevel.size, activeLevel.dSize);
    const opt = SIZE_OPTIONS.find((o) => o.value === v);
    const mid = (baseMin + baseMax) / 2;
    return Math.min((opt?.approx ?? 1) * mid * textScale, 2.4);
  });
  let sampleWeight = $derived.by(() => {
    const v = levelVal(activeLevel.wt, activeLevel.dWt);
    const n = parseInt(v);
    return isNaN(n) ? 600 : n;
  });
  let sampleTracking = $derived.by(() => {
    if (!activeLevel.ls) return 0;
    const v = levelVal(activeLevel.ls, activeLevel.dLs);
    const opt = TRACKING_OPTIONS.find((o) => o.value === v);
    if (opt) return opt.em;
    const parsed = parseFloat(v.replace("em", ""));
    return isNaN(parsed) ? 0 : parsed;
  });
  let sampleLeading = $derived.by(() => {
    const v = levelVal(activeLevel.lh, activeLevel.dLh);
    const opt = LEADING_OPTIONS.find((o) => o.value === v);
    if (opt) return opt.num;
    const parsed = parseFloat(v);
    return isNaN(parsed) ? 1.3 : parsed;
  });
</script>

<div class="p-4 space-y-6">

  <!-- FONT FAMILIES (compact dropdowns) -->
  <section class="space-y-3">
    <button
      onclick={() => { showFontFamilies = !showFontFamilies; }}
      aria-expanded={showFontFamilies}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Font families</div>
      <span class="text-[10px] text-slate-500">{showFontFamilies ? "▲" : "▼"}</span>
    </button>
    {#if showFontFamilies}
    {#each [
      { label: "Body", token: "--sf-font-body", current: currentBodyFont, opts: BODY_STACKS },
      { label: "Heading", token: "--sf-font-heading", current: currentHeadingFont, opts: HEADING_STACKS },
      { label: "Mono", token: "--sf-font-mono", current: currentMonoFont, opts: MONO_STACKS },
    ] as f (f.token)}
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-400 w-14 shrink-0">{f.label}</span>
        <select
          value={f.current}
          onchange={(e) => {
            const v = (e.target as HTMLSelectElement).value;
            v ? onSet(f.token, v) : onReset(f.token);
          }}
          class="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          style={`font-family: ${f.current || "inherit"}`}
        >
          {#each f.opts as o (o.label)}
            <option value={o.value} style="font-family:inherit;background:#16161e;">{o.label}</option>
          {/each}
          {#if f.current && !f.opts.some((o) => o.value === f.current)}
            <option value={f.current} style="background:#16161e;">Custom: {f.current.split(",")[0].replace(/['"]/g, "")}</option>
          {/if}
        </select>
        {#if f.token in overrides}
          <button onclick={() => onReset(f.token)} class="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
    {/each}

    <!-- Google font loader (dropdown + custom) -->
    <div class="rounded-xl bg-white/4 border border-white/8 p-3 space-y-2">
      <div class="text-[10px] font-semibold text-slate-400">Google Font</div>
      <div class="flex gap-2">
        <select
          value={googleFontChoice}
          onchange={(e) => { googleFontChoice = (e.target as HTMLSelectElement).value; }}
          class="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="" style="background:#16161e;">Pick a font…</option>
          {#each GOOGLE_FONTS as g (g)}
            <option value={g} style="background:#16161e;">{g}</option>
          {/each}
        </select>
        <div class="flex gap-1 shrink-0">
          <button
            onclick={() => { customFontTarget = "body"; }}
            class={`px-2 rounded text-[10px] border transition-all cursor-pointer ${customFontTarget === "body" ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200" : "border-white/8 text-slate-400"}`}
          >Body</button>
          <button
            onclick={() => { customFontTarget = "heading"; }}
            class={`px-2 rounded text-[10px] border transition-all cursor-pointer ${customFontTarget === "heading" ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200" : "border-white/8 text-slate-400"}`}
          >Heading</button>
        </div>
      </div>
      <input
        type="text"
        placeholder="…or type any Google font name"
        oninput={(e) => { googleFontChoice = (e.target as HTMLInputElement).value; }}
        value={googleFontChoice}
        class="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
      />
      <button
        onclick={() => applyCustomFont(googleFontChoice, customFontTarget)}
        class="w-full py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold cursor-pointer hover:bg-indigo-600/30 transition-all"
      >
        Load &amp; apply to {customFontTarget}
      </button>
    </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- PER-TYPE (body + h1–h6) -->
  <section class="space-y-3">
    <button
      onclick={() => { showPerType = !showPerType; }}
      aria-expanded={showPerType}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Per-type styles</div>
      <span class="text-[10px] text-slate-500">{showPerType ? "▲" : "▼"}</span>
    </button>
    {#if showPerType}

    <!-- Level selector -->
    <div class="flex bg-white/5 border border-white/8 rounded-lg p-0.5 gap-0.5">
      {#each TYPE_LEVELS as lvl (lvl.id)}
        {@const isOv = (lvl.size in overrides) || (lvl.lh in overrides) || (lvl.wt in overrides) || (!!lvl.ls && lvl.ls in overrides)}
        <button
          onclick={() => { activeLevelId = lvl.id; }}
          class={`relative flex-1 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
            activeLevelId === lvl.id ? "bg-white/12 text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          {lvl.label}
          {#if isOv}<span class="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-indigo-400"></span>{/if}
        </button>
      {/each}
    </div>

    <!-- Live sample -->
    <div class="bg-white/4 rounded-xl border border-white/8 px-3 py-3 overflow-hidden">
      <div
        class="text-white/85 truncate"
        style={`font-size:${sampleSize}rem; font-weight:${sampleWeight}; letter-spacing:${sampleTracking}em; line-height:${sampleLeading}; font-family:${activeLevel.id === "body" ? (currentBodyFont || "inherit") : (currentHeadingFont || currentBodyFont || "inherit")}`}
      >The quick brown fox
      </div>
    </div>

    <!-- Size -->
    <div class="flex items-center gap-2">
      <span class="text-[10px] font-semibold text-slate-400 w-16 shrink-0">Size</span>
      <select
        value={levelVal(activeLevel.size, activeLevel.dSize)}
        onchange={(e) => setLevel(activeLevel.size, (e.target as HTMLSelectElement).value, activeLevel.dSize)}
        class="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
      >
        {#each SIZE_OPTIONS as o (o.value)}
          <option value={o.value} style="background:#16161e;">{o.label}</option>
        {/each}
        {#if !SIZE_OPTIONS.some((o) => o.value === levelVal(activeLevel.size, activeLevel.dSize))}
          <option value={levelVal(activeLevel.size, activeLevel.dSize)} style="background:#16161e;">custom</option>
        {/if}
      </select>
    </div>

    <!-- Line height -->
    <div class="flex items-center gap-2">
      <span class="text-[10px] font-semibold text-slate-400 w-16 shrink-0">Line height</span>
      <select
        value={levelVal(activeLevel.lh, activeLevel.dLh)}
        onchange={(e) => setLevel(activeLevel.lh, (e.target as HTMLSelectElement).value, activeLevel.dLh)}
        class="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
      >
        {#each LEADING_OPTIONS as o (o.value)}
          <option value={o.value} style="background:#16161e;">{o.label} · {o.num}</option>
        {/each}
        {#if !LEADING_OPTIONS.some((o) => o.value === levelVal(activeLevel.lh, activeLevel.dLh))}
          <option value={levelVal(activeLevel.lh, activeLevel.dLh)} style="background:#16161e;">custom</option>
        {/if}
      </select>
    </div>

    <!-- Weight -->
    <div>
      <span class="text-[10px] font-semibold text-slate-400">Weight</span>
      <div class="flex gap-1 mt-1">
        {#each WEIGHT_OPTIONS as w (w)}
          {@const cur = levelVal(activeLevel.wt, activeLevel.dWt)}
          <button
            onclick={() => setLevel(activeLevel.wt, w, activeLevel.dWt)}
            style={`font-weight:${parseInt(w)}`}
            class={`flex-1 py-1.5 rounded-lg text-[10px] border transition-all cursor-pointer font-mono ${
              cur === w ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200" : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >{w}</button>
        {/each}
      </div>
    </div>

    <!-- Letter spacing (headings only) -->
    {#if activeLevel.ls}
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-400 w-16 shrink-0">Tracking</span>
        <select
          value={levelVal(activeLevel.ls, activeLevel.dLs)}
          onchange={(e) => setLevel(activeLevel.ls, (e.target as HTMLSelectElement).value, activeLevel.dLs)}
          class="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          {#each TRACKING_OPTIONS as o (o.value)}
            <option value={o.value} style="background:#16161e;">{o.label}</option>
          {/each}
          {#if !TRACKING_OPTIONS.some((o) => o.value === levelVal(activeLevel.ls, activeLevel.dLs))}
            <option value={levelVal(activeLevel.ls, activeLevel.dLs)} style="background:#16161e;">custom</option>
          {/if}
        </select>
      </div>
    {/if}

    <!-- Max width (heading levels only) -->
    {#if activeLevel.id !== "body"}
      {@const maxWidthToken = `--sf-${activeLevel.id}-max-width`}
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-400 w-16 shrink-0">Max width</span>
        <input
          type="text"
          value={overrides[maxWidthToken] ?? ""}
          placeholder="none"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            v ? onSet(maxWidthToken, v) : onReset(maxWidthToken);
          }}
          class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if maxWidthToken in overrides}
          <button onclick={() => onReset(maxWidthToken)} class="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
    {/if}

    <div class="flex justify-end">
      {#if (activeLevel.size in overrides) || (activeLevel.lh in overrides) || (activeLevel.wt in overrides) || (!!activeLevel.ls && activeLevel.ls in overrides)}
        <button
          onclick={() => {
            const patch: Record<string, null> = { [activeLevel.size]: null, [activeLevel.lh]: null, [activeLevel.wt]: null };
            if (activeLevel.ls) patch[activeLevel.ls] = null;
            onBulkChange(patch);
          }}
          class="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer"
        >reset {activeLevel.label}</button>
      {/if}
    </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- BODY TEXT -->
  <section class="space-y-4">
    <button
      onclick={() => { showBodyText = !showBodyText; }}
      aria-expanded={showBodyText}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Body text</div>
      <span class="text-[10px] text-slate-500">{showBodyText ? "▲" : "▼"}</span>
    </button>
    {#if showBodyText}

    <!-- Font weights -->
    {#each [
      { label: "Body strong", tokenName: "--sf-font-weight-strong" },
      { label: "Interactive", tokenName: "--sf-font-weight-interactive" },
    ] as row (row.tokenName)}
      {@const defaultVal = WEIGHT_DEFAULTS[row.tokenName] ?? "600"}
      {@const current = overrides[row.tokenName] ?? defaultVal}
      {@const isOverridden = row.tokenName in overrides}
      <div class="group">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-semibold text-slate-200">{row.label} weight</span>
          {#if isOverridden}
            <button onclick={() => onReset(row.tokenName)} class="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-colors">reset</button>
          {/if}
        </div>
        <div class="flex gap-1">
          {#each WEIGHT_OPTIONS as w (w)}
            <button
              onclick={() => w === defaultVal && !isOverridden ? undefined : (w === defaultVal ? onReset(row.tokenName) : onSet(row.tokenName, w))}
              style={`font-weight: ${parseInt(w)}`}
              class={`flex-1 py-1.5 rounded-lg text-[10px] border transition-all cursor-pointer font-mono ${
                current === w
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                  : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >{w}</button>
          {/each}
        </div>
      </div>
    {/each}

    <!-- Em style toggle -->
    <div>
      <div class="text-[10px] font-semibold text-slate-400 mb-2">Emphasis style</div>
      <div class="flex gap-1">
        {#each [["Italic", "italic"], ["Normal", "normal"]] as [label, val] (val)}
          {@const current = overrides["--sf-body-em-style"] ?? "italic"}
          <button
            onclick={() => val === "italic" ? onReset("--sf-body-em-style") : onSet("--sf-body-em-style", val)}
            class={`flex-1 py-2 rounded-lg text-[10px] border transition-all cursor-pointer ${
              current === val
                ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
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
        <div class="text-[10px] font-semibold text-slate-400 mb-1.5">{row.label}</div>
        <div class="flex gap-1">
          {#each WRAP_OPTIONS as o (o.value)}
            <button
              onclick={() => o.value === row.defaultVal && !(row.token in overrides) ? undefined : (o.value === row.defaultVal ? onReset(row.token) : onSet(row.token, o.value))}
              class={`flex-1 px-2 py-1.5 rounded-lg text-[10px] border transition-all cursor-pointer ${
                current === o.value
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                  : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >{o.label}</button>
          {/each}
        </div>
      </div>
    {/each}

    <!-- Link external marker -->
    <div class="flex items-center gap-2">
      <span class="text-[10px] font-semibold text-slate-400 w-24 shrink-0">External marker</span>
      <input
        type="text"
        value={overrides["--sf-link-external-marker"] ?? ""}
        placeholder={'" ↗"'}
        oninput={(e) => {
          const v = (e.target as HTMLInputElement).value;
          v ? onSet("--sf-link-external-marker", v) : onReset("--sf-link-external-marker");
        }}
        class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
      />
      {#if "--sf-link-external-marker" in overrides}
        <button onclick={() => onReset("--sf-link-external-marker")} class="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
      {/if}
    </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- FONT WEIGHT SCALE -->
  <section class="space-y-3">
    <button
      onclick={() => { showFontWeights = !showFontWeights; }}
      aria-expanded={showFontWeights}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Font weight scale</div>
      <span class="text-[10px] text-slate-500">{showFontWeights ? "▲" : "▼"}</span>
    </button>
    {#if showFontWeights}
      <p class="text-[9px] text-slate-600 leading-relaxed">Named weight tokens. Override if your font uses non-standard axis values.</p>
      {#each [
        { label: "Light",    token: "--sf-font-weight-light",    def: 300 },
        { label: "Normal",   token: "--sf-font-weight-normal",   def: 400 },
        { label: "Medium",   token: "--sf-font-weight-medium",   def: 500 },
        { label: "Semibold", token: "--sf-font-weight-semibold", def: 600 },
        { label: "Bold",     token: "--sf-font-weight-bold",     def: 700 },
      ] as row (row.token)}
        <div class="group">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-semibold text-slate-200">{row.label}</span>
            {#if row.token in overrides}
              <button onclick={() => onReset(row.token)} class="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer opacity-0 group-hover:opacity-100">reset</button>
            {/if}
          </div>
          <div class="flex gap-1">
            {#each WEIGHT_OPTIONS as w (w)}
              {@const cur = overrides[row.token] ?? String(row.def)}
              <button
                onclick={() => w === String(row.def) && !(row.token in overrides) ? undefined : (w === String(row.def) ? onReset(row.token) : onSet(row.token, w))}
                style={`font-weight:${parseInt(w)}`}
                class={`flex-1 py-1.5 rounded-lg text-[10px] border transition-all cursor-pointer font-mono ${
                  cur === w
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                    : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >{w}</button>
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- DISPLAY TYPE -->
  <section class="space-y-4">
    <button
      onclick={() => { showDisplayType = !showDisplayType; }}
      aria-expanded={showDisplayType}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Display type</div>
      <span class="text-[10px] text-slate-500">{showDisplayType ? "▲" : "▼"}</span>
    </button>
    {#if showDisplayType}

    <ClampField
      title="Display base size"
      minValue={dispMin} maxValue={dispMax}
      min={1.5} max={6} step={0.05} unit="rem"
      previewKind="type"
      overridden={"--sf-text-display-base-min" in overrides || "--sf-text-display-base-max" in overrides}
      onReset={() => { onReset("--sf-text-display-base-min"); onReset("--sf-text-display-base-max"); }}
      onMinChange={(v) => onSet("--sf-text-display-base-min", String(v))}
      onMaxChange={(v) => onSet("--sf-text-display-base-max", String(v))}
    />

    <!-- Display line heights -->
    <div class="grid grid-cols-2 gap-3">
      {#each [
        { label: "Display L line-height", token: "--sf-display-l-line-height", def: 1 },
        { label: "Display M line-height", token: "--sf-display-m-line-height", def: 1.05 },
      ] as row (row.token)}
        <div>
          <div class="text-[9px] text-slate-600 mb-1">{row.label}</div>
          <SliderRow
            label="" value={num(row.token, row.def)} min={0.8} max={1.5} step={0.025}
            overridden={row.token in overrides}
            onChange={(v) => onSet(row.token, String(v))}
            onReset={() => onReset(row.token)}
          />
        </div>
      {/each}
    </div>

    <!-- Display weight -->
    {#each [
      { label: "Display",  tokenName: "--sf-font-weight-display" },
      { label: "Heading",  tokenName: "--sf-font-weight-heading" },
    ] as row (row.tokenName)}
      {@const defaultVal = WEIGHT_DEFAULTS[row.tokenName] ?? "700"}
      {@const current = overrides[row.tokenName] ?? defaultVal}
      {@const isOverridden = row.tokenName in overrides}
      <div class="group">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-semibold text-slate-200">{row.label} weight</span>
          {#if isOverridden}
            <button onclick={() => onReset(row.tokenName)} class="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-colors">reset</button>
          {/if}
        </div>
        <div class="flex gap-1">
          {#each WEIGHT_OPTIONS as w (w)}
            <button
              onclick={() => w === defaultVal && !isOverridden ? undefined : (w === defaultVal ? onReset(row.tokenName) : onSet(row.tokenName, w))}
              style={`font-weight: ${parseInt(w)}`}
              class={`flex-1 py-1.5 rounded-lg text-[10px] border transition-all cursor-pointer font-mono ${
                current === w
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                  : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >{w}</button>
          {/each}
        </div>
      </div>
    {/each}
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- FINE-TUNE (type ramp clamp + rhythm + tracking) -->
  <section class="space-y-4">
    <button
      onclick={() => { showModularScale = !showModularScale; }}
      aria-expanded={showModularScale}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modular scale (Mobile → Desktop)</div>
      <span class="text-[10px] text-slate-500">{showModularScale ? "▲" : "▼"}</span>
    </button>
    {#if showModularScale}
    <p class="text-[10px] text-slate-600 leading-relaxed">
      Utopia-style fluid scale. Each endpoint has three values — viewport width,
      base size, and modular ratio. Sizes interpolate fluidly between mobile and desktop.
    </p>

    <!-- Viewport endpoints (shared by the type + space scales) -->
    <ClampField
      title="Viewport range"
      minValue={vwMin} maxValue={vwMax}
      min={15} max={120} step={0.5} unit="rem"
      minLabel="Mobile" maxLabel="Desktop"
      overridden={"--sf-fluid-min-vw" in overrides || "--sf-fluid-max-vw" in overrides}
      onReset={() => { onReset("--sf-fluid-min-vw"); onReset("--sf-fluid-max-vw"); }}
      onMinChange={(v) => onSet("--sf-fluid-min-vw", String(v))}
      onMaxChange={(v) => onSet("--sf-fluid-max-vw", String(v))}
    />

    <ClampField
      title="Base size &amp; ratio"
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

    <!-- Power knobs -->
    <div class="space-y-4">
      {#each knobs as k (k.name)}
        <PowerKnobRow
          knob={k}
          {overrides}
          onChange={(name, val) => val === null ? onReset(name) : onSet(name, val)}
        />
      {/each}
    </div>

    <!-- Line height scale -->
    <div>
      <div class="text-[10px] font-semibold text-slate-400 mb-2">Line height scale</div>
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
      help="How aggressively large display sizes shrink their line-height."
      overridden={"--sf-leading-taper" in overrides}
      onChange={(v) => onSet("--sf-leading-taper", String(v))}
      onReset={() => onReset("--sf-leading-taper")}
    />

    <!-- Letter-spacing scale -->
    <div>
      <div class="text-[10px] font-semibold text-slate-400 mb-2">Letter-spacing scale</div>
      <p class="text-[9px] text-slate-600 mb-2">
        Overriding these propagates to heading sizes that reference them.
      </p>
      <div class="space-y-2">
        {#each TRACKING_TOKENS as t (t.token)}
          <div class="group">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[10px] font-semibold text-slate-200">{t.label}</span>
              {#if t.token in overrides}
                <button onclick={() => onReset(t.token)} class="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer opacity-0 group-hover:opacity-100">reset</button>
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
    </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- SCALE PREVIEW -->
  <section>
    <button
      onclick={() => { showScalePreview = !showScalePreview; }}
      aria-expanded={showScalePreview}
      class="w-full flex items-center justify-between cursor-pointer mb-3"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scale preview</div>
      <span class="text-[10px] text-slate-500">{showScalePreview ? "▲" : "▼"}</span>
    </button>
    {#if showScalePreview}
    <div class="bg-white/4 rounded-xl border border-white/8 p-3 space-y-1 overflow-hidden">
      {#each [...TEXT_STEPS].reverse() as { label, factor } (label)}
        {@const midBase = (baseMin + baseMax) / 2}
        {@const size = midBase * factor * textScale}
        <div class="flex items-baseline gap-2">
          <span class="text-[9px] font-mono text-slate-600 w-6 shrink-0 text-right">{label}</span>
          <span
            class="text-white/80 font-medium leading-none truncate"
            style={`font-size: ${Math.min(size, 2.5)}rem; font-family: ${currentBodyFont || "inherit"}`}
          >
            Aa
          </span>
          <span class="text-[9px] font-mono text-slate-600 ml-auto shrink-0">{size.toFixed(2)}rem</span>
        </div>
      {/each}
    </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- LINE LENGTHS -->
  <section class="space-y-3">
    <button
      onclick={() => { showLineLengths = !showLineLengths; }}
      aria-expanded={showLineLengths}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Line lengths (max-width)</div>
      <span class="text-[10px] text-slate-500">{showLineLengths ? "▲" : "▼"}</span>
    </button>
    {#if showLineLengths}
      <p class="text-[9px] text-slate-600 leading-relaxed">
        Per-text-size max-width caps on <span class="font-mono text-slate-400">.sf-text-*</span> elements. Set to <span class="font-mono text-slate-400">none</span> to remove the constraint; use <span class="font-mono text-slate-400">ch</span> units for character-based measures.
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
            <span class="text-[9px] font-mono text-slate-400 w-6 shrink-0">{row.label}</span>
            <input
              type="text"
              value={overrides[row.token] ?? ""}
              placeholder={row.def}
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                v ? onSet(row.token, v) : onReset(row.token);
              }}
              class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
            {#if row.token in overrides}
              <button onclick={() => onReset(row.token)} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- ADVANCED TYPOGRAPHY -->
  <section class="space-y-3">
    <button
      onclick={() => { showAdvancedType = !showAdvancedType; }}
      aria-expanded={showAdvancedType}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Advanced typography</div>
      <span class="text-[10px] text-slate-500">{showAdvancedType ? "▲" : "▼"}</span>
    </button>
    {#if showAdvancedType}
      <p class="text-[9px] text-slate-600 leading-relaxed">Advanced OpenType and variable-font axes. Leave as <span class="font-mono text-slate-400">normal</span> unless your font supports these features.</p>

      <!-- font-numeric -->
      <div>
        <div class="text-[10px] font-semibold text-slate-400 mb-1.5">Numeric figures</div>
        <div class="flex gap-1">
          {#each [["tabular-nums", "tabular-nums (default)"], ["proportional-nums", "proportional-nums"], ["normal", "normal"]] as [val, label] (val)}
            {@const cur = overrides["--sf-font-numeric"] ?? "tabular-nums"}
            <button
              onclick={() => val === "tabular-nums" ? onReset("--sf-font-numeric") : onSet("--sf-font-numeric", val)}
              class={`flex-1 py-1.5 rounded-lg text-[9px] border transition-all cursor-pointer ${
                cur === val
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                  : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >{label}</button>
          {/each}
        </div>
      </div>

      <!-- optical-sizing -->
      <div>
        <div class="text-[10px] font-semibold text-slate-400 mb-1.5">Optical sizing</div>
        <div class="flex gap-1">
          {#each [["auto", "auto (default)"], ["none", "none"]] as [val, label] (val)}
            {@const cur = overrides["--sf-optical-sizing"] ?? "auto"}
            <button
              onclick={() => val === "auto" ? onReset("--sf-optical-sizing") : onSet("--sf-optical-sizing", val)}
              class={`flex-1 py-2 rounded-lg text-[10px] border transition-all cursor-pointer ${
                cur === val
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                  : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >{label}</button>
          {/each}
        </div>
      </div>

      <!-- font-features -->
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-400 w-24 shrink-0">Font features</span>
        <input
          type="text"
          value={overrides["--sf-font-features"] ?? ""}
          placeholder="normal"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            v ? onSet("--sf-font-features", v) : onReset("--sf-font-features");
          }}
          class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-font-features" in overrides}
          <button onclick={() => onReset("--sf-font-features")} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>

      <!-- font-variation -->
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-400 w-24 shrink-0">Variation</span>
        <input
          type="text"
          value={overrides["--sf-font-variation"] ?? ""}
          placeholder="normal"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            v ? onSet("--sf-font-variation", v) : onReset("--sf-font-variation");
          }}
          class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-font-variation" in overrides}
          <button onclick={() => onReset("--sf-font-variation")} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
    {/if}
  </section>
</div>
