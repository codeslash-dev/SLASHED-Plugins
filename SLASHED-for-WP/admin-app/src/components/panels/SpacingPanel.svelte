<script lang="ts">
  import type { SlashedToken } from '../../types';
  import { KNOBS_BY_DOMAIN } from '../../lib/powerKnobs';
  import PowerKnobRow from '../inputs/PowerKnobRow.svelte';
  import SliderRow from '../inputs/SliderRow.svelte';
  import ClampField from '../inputs/ClampField.svelte';

  let { overrides, onSet, onReset }: {
    tokens: SlashedToken[];
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
  } = $props();

  const RATIO_PRESETS = [
    { label: "Minor Third — 1.200", value: 1.2 },
    { label: "Major Third — 1.250", value: 1.25 },
    { label: "Perfect Fourth — 1.333", value: 1.333 },
    { label: "Aug. Fourth — 1.414", value: 1.414 },
    { label: "Golden — 1.618", value: 1.618 },
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

  let showLayoutGap = $state(false);
  let showModularScale = $state(false);
  let showAdvanced = $state(false);
</script>

<div class="p-4 space-y-6">

  <!-- SPACE SCALE PREVIEW — category-wide, at the top -->
  <section>
    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Space scale preview</div>
    <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3 space-y-2">
      {#each SPACE_STEPS as step, i (step)}
        {@const midBase = (baseMin + baseMax) / 2}
        {@const ratio = (ratioMin + ratioMax) / 2}
        {@const offset = i - 3}
        {@const rawRem = offset >= 0 ? midBase * Math.pow(ratio, offset) : midBase / Math.pow(ratio, -offset)}
        {@const scaled = rawRem * spaceScale}
        {@const barWidth = Math.min(scaled * 28, 240)}
        <div class="flex items-center gap-2">
          <span class="text-[9px] font-mono text-slate-400 dark:text-slate-600 w-6 text-right shrink-0">{step}</span>
          <div class="bg-indigo-500/50 rounded shrink-0 h-3" style={`width: ${barWidth}px; min-width: 3px`}></div>
          <span class="text-[9px] font-mono text-slate-500 shrink-0">{scaled.toFixed(2)}rem</span>
        </div>
      {/each}
    </div>
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

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
      <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
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

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

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
      <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
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
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- ADVANCED (power knobs, de-emphasised, at end) -->
  <section class="space-y-3">
    <button
      onclick={() => { showAdvanced = !showAdvanced; }}
      aria-expanded={showAdvanced}
      class="w-full flex items-center justify-between text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors cursor-pointer"
    >
      <div class="text-[10px] font-semibold uppercase tracking-widest">Advanced</div>
      <span class="text-[10px]">{showAdvanced ? "▲" : "▼"}</span>
    </button>
    {#if showAdvanced}
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
</div>
