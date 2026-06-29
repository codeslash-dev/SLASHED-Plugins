<script lang="ts">
  import type { SlashedToken } from '../../types';
  import { KNOBS_BY_DOMAIN } from '../../lib/powerKnobs';
  import PowerKnobRow from '../inputs/PowerKnobRow.svelte';
  import SliderRow from '../inputs/SliderRow.svelte';
  import ClampField from '../inputs/ClampField.svelte';

  let { overrides, onSet, onReset, onBulkChange }: {
    tokens: SlashedToken[];
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
    onBulkChange: (patch: Record<string, string | null>) => void;
  } = $props();

  const RATIO_PRESETS = [
    { label: "Minor Third — 1.200", value: 1.2 },
    { label: "Major Third — 1.250", value: 1.25 },
    { label: "Perfect Fourth — 1.333", value: 1.333 },
    { label: "Aug. Fourth — 1.414", value: 1.414 },
    { label: "Golden — 1.618", value: 1.618 },
  ];

  const DENSITY_PRESETS = [
    { label: "Compact",     desc: "Tight UI, data-heavy",    patch: { "--sf-space-scale": "0.75", "--sf-section-scale": "0.7", "--sf-space-base-min": "0.75", "--sf-space-base-max": "1.25" } },
    { label: "Comfortable", desc: "Balanced — default",      patch: { "--sf-space-scale": null as null, "--sf-section-scale": null as null, "--sf-space-base-min": null as null, "--sf-space-base-max": null as null } },
    { label: "Spacious",    desc: "Generous, editorial",     patch: { "--sf-space-scale": "1.3", "--sf-section-scale": "1.4", "--sf-space-base-min": "1.25", "--sf-space-base-max": "2.75" } },
  ];

  const SPACE_STEPS = ["2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"];

  const knobs = KNOBS_BY_DOMAIN["spacing"] ?? [];

  function num(name: string, fallback: number) {
    const v = parseFloat(overrides[name] ?? "");
    return isNaN(v) ? fallback : v;
  }

  let ratioMin   = $derived(num("--sf-space-ratio-min", 1.25));
  let ratioMax   = $derived(num("--sf-space-ratio-max", 1.333));
  let baseMin    = $derived(num("--sf-space-base-min", 1));
  let baseMax    = $derived(num("--sf-space-base-max", 2));
  let spaceScale = $derived(num("--sf-space-scale", 1));
  let gapVal     = $derived(num("--sf-gap", 1));
  let gutterVal  = $derived(num("--sf-gutter", 1.5));
  let contentGapVal = $derived(num("--sf-content-gap", 0.5));
  // Shared fluid viewport endpoints (rem, unitless). Min = mobile, max = desktop.
  let vwMin      = $derived(num("--sf-fluid-min-vw", 22.5));
  let vwMax      = $derived(num("--sf-fluid-max-vw", 90));

  let activeDensity = $derived(DENSITY_PRESETS.find((d) =>
    Object.entries(d.patch).every(([k, v]) =>
      v === null ? !(k in overrides) : overrides[k] === v
    )
  ));

  let showLayoutGap = $state(false);
  let showDensityPresets = $state(false);
  let showModularScale = $state(false);
  let showSpacePreview = $state(false);
</script>

<div class="p-4 space-y-6">

  <!-- GAP TOKENS — most used, at the top -->
  <section class="space-y-3">
    <button
      onclick={() => { showLayoutGap = !showLayoutGap; }}
      aria-expanded={showLayoutGap}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Layout gap</div>
      <span class="text-[10px] text-slate-500">{showLayoutGap ? "▲" : "▼"}</span>
    </button>
    {#if showLayoutGap}
      <p class="text-[10px] text-slate-600 leading-relaxed">
        The two most-referenced spacing tokens. Referenced by every layout primitive (cluster, grid, stack, bento…).
      </p>
      <SliderRow
        label="Gap" value={gapVal} min={0} max={4} step={0.0625} unit="rem"
        help="--sf-gap — spacing between layout items (cluster, grid, reel, stack, sidebar, bento)"
        overridden={"--sf-gap" in overrides}
        onChange={(v) => onSet("--sf-gap", `${v}rem`)}
        onReset={() => onReset("--sf-gap")}
        rawDefault="var(--sf-space-m)"
        currentRaw={overrides["--sf-gap"]}
        onRawSet={(v) => onSet("--sf-gap", v)}
      />
      <SliderRow
        label="Content gap" value={contentGapVal} min={0} max={2} step={0.0625} unit="rem"
        help="--sf-content-gap — tighter gap within components (defaults to space-s)"
        overridden={"--sf-content-gap" in overrides}
        onChange={(v) => onSet("--sf-content-gap", `${v}rem`)}
        onReset={() => onReset("--sf-content-gap")}
        rawDefault="var(--sf-space-s)"
        currentRaw={overrides["--sf-content-gap"]}
        onRawSet={(v) => onSet("--sf-content-gap", v)}
      />
      <SliderRow
        label="Gutter" value={gutterVal} min={0} max={6} step={0.0625} unit="rem"
        help="--sf-gutter — wide page/section side gutter (containers, .sf-section--guttered)"
        overridden={"--sf-gutter" in overrides}
        onChange={(v) => onSet("--sf-gutter", `${v}rem`)}
        onReset={() => onReset("--sf-gutter")}
        rawDefault="var(--sf-space-l)"
        currentRaw={overrides["--sf-gutter"]}
        onRawSet={(v) => onSet("--sf-gutter", v)}
      />
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- DENSITY PRESETS -->
  <section class="space-y-3">
    <button
      onclick={() => { showDensityPresets = !showDensityPresets; }}
      aria-expanded={showDensityPresets}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Density presets</div>
      <span class="text-[10px] text-slate-500">{showDensityPresets ? "▲" : "▼"}</span>
    </button>
    {#if showDensityPresets}
      <div class="grid grid-cols-3 gap-2">
        {#each DENSITY_PRESETS as d (d.label)}
          <button
            onclick={() => onBulkChange(d.patch as Record<string, string | null>)}
            class={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all cursor-pointer ${
              activeDensity?.label === d.label
                ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            <span class="text-[11px] font-bold">{d.label}</span>
            <span class="text-[9px] text-slate-500 text-center">{d.desc}</span>
          </button>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- FLUID SCALE -->
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
        Utopia-style fluid scale — viewport width, base unit and ratio per endpoint.
        The viewport range is shared with the type scale.
      </p>

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
        title="Base unit &amp; ratio"
        minValue={baseMin} maxValue={baseMax}
        min={0.5} max={4} step={0.05} unit="rem"
        minLabel="Mobile" maxLabel="Desktop"
        previewKind="space"
        overridden={"--sf-space-base-min" in overrides || "--sf-space-base-max" in overrides}
        onReset={() => { onReset("--sf-space-base-min"); onReset("--sf-space-base-max"); }}
        onMinChange={(v) => onSet("--sf-space-base-min", String(v))}
        onMaxChange={(v) => onSet("--sf-space-base-max", String(v))}
        ratioPresets={RATIO_PRESETS}
        ratioMin={ratioMin} ratioMax={ratioMax}
        ratioMin_bound={1.1} ratioMax_bound={1.8}
        onRatioMinChange={(v) => onSet("--sf-space-ratio-min", String(v))}
        onRatioMaxChange={(v) => onSet("--sf-space-ratio-max", String(v))}
      />

      <div class="space-y-4">
        {#each knobs as k (k.name)}
          <PowerKnobRow
            knob={k}
            {overrides}
            onChange={(name, val) => val === null ? onReset(name) : onSet(name, val)}
          />
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- SCALE PREVIEW -->
  <section>
    <button
      onclick={() => { showSpacePreview = !showSpacePreview; }}
      aria-expanded={showSpacePreview}
      class="w-full flex items-center justify-between cursor-pointer mb-2"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Space scale preview</div>
      <span class="text-[10px] text-slate-500">{showSpacePreview ? "▲" : "▼"}</span>
    </button>
    {#if showSpacePreview}
      <div class="bg-white/4 rounded-xl border border-white/8 p-3 space-y-2">
        {#each SPACE_STEPS as step, i (step)}
          {@const midBase = (baseMin + baseMax) / 2}
          {@const ratio = (ratioMin + ratioMax) / 2}
          {@const offset = i - 4}
          {@const rawRem = offset >= 0 ? midBase * Math.pow(ratio, offset) : midBase / Math.pow(ratio, -offset)}
          {@const scaled = rawRem * spaceScale}
          {@const barWidth = Math.min(scaled * 28, 240)}
          <div class="flex items-center gap-2">
            <span class="text-[9px] font-mono text-slate-600 w-6 text-right shrink-0">{step}</span>
            <div class="bg-indigo-500/50 rounded shrink-0 h-3" style={`width: ${barWidth}px; min-width: 3px`}></div>
            <span class="text-[9px] font-mono text-slate-500 shrink-0">{scaled.toFixed(2)}rem</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>
