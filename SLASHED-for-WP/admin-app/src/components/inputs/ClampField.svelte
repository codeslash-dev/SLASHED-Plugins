<script lang="ts">
  /**
   * ClampField — a single, visually-connected min⇄max control for fluid
   * `clamp()` tokens (used by both the typography and spacing scale
   * generators). Min and max share one track with two thumbs and a highlighted
   * band, a live clamp readout, an optional min→max preview, and optional
   * modular-scale ratio preset chips folded into the same card.
   */
  type RatioPreset = { label: string; value: number };

  let {
    title,
    minValue,
    maxValue,
    min,
    max,
    step,
    unit = "rem",
    minLabel = "Min",
    maxLabel = "Max",
    onMinChange,
    onMaxChange,
    overridden = false,
    onReset,
    // Optional ratio block
    ratioPresets,
    activeRatioValue,
    ratioMin,
    ratioMax,
    ratioMin_bound = 1.05,
    ratioMax_bound = 1.8,
    onRatioPreset,
    onRatioMinChange,
    onRatioMaxChange,
    // Optional preview renderer (e.g. type sample / spacing block)
    previewKind = "none",
  }: {
    title: string;
    minValue: number;
    maxValue: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    minLabel?: string;
    maxLabel?: string;
    onMinChange: (v: number) => void;
    onMaxChange: (v: number) => void;
    overridden?: boolean;
    onReset?: () => void;
    ratioPresets?: RatioPreset[];
    activeRatioValue?: number | undefined;
    ratioMin?: number;
    ratioMax?: number;
    ratioMin_bound?: number;
    ratioMax_bound?: number;
    onRatioPreset?: (v: number) => void;
    onRatioMinChange?: (v: number) => void;
    onRatioMaxChange?: (v: number) => void;
    previewKind?: "none" | "type" | "space";
  } = $props();

  function clamp(v: number) {
    return Math.min(max, Math.max(min, v));
  }
  let minPct = $derived(((minValue - min) / (max - min)) * 100);
  let maxPct = $derived(((maxValue - min) / (max - min)) * 100);
  let customRatioOpen = $derived(!!ratioPresets && activeRatioValue === undefined);
</script>

<div class={`rounded-xl border p-3 ${overridden ? "bg-indigo-500/8 border-indigo-500/25" : "bg-white/4 border-white/8"}`}>
  <div class="flex items-center justify-between mb-2">
    <span class="text-[10px] font-bold text-slate-300">{title}</span>
    <span class="text-[9px] font-mono text-slate-500">
      clamp(<span class="text-indigo-300">{minValue}{unit}</span> … <span class="text-indigo-300">{maxValue}{unit}</span>)
    </span>
  </div>

  <!-- Connected dual-thumb track -->
  <div class="clampTrack relative h-5 flex items-center mb-2">
    <div class="absolute inset-x-0 h-1 bg-white/8 rounded-full"></div>
    <div
      class="absolute h-1 bg-indigo-500 rounded-full"
      style={`left:${Math.min(minPct, maxPct)}%; right:${100 - Math.max(minPct, maxPct)}%`}
    ></div>
    <input
      type="range" {min} {max} {step} value={minValue}
      oninput={(e) => onMinChange(Math.min(clamp(parseFloat((e.target as HTMLInputElement).value)), maxValue))}
      class="clampRange absolute inset-0 w-full" aria-label={`${title} min`}
    />
    <input
      type="range" {min} {max} {step} value={maxValue}
      oninput={(e) => onMaxChange(Math.max(clamp(parseFloat((e.target as HTMLInputElement).value)), minValue))}
      class="clampRange absolute inset-0 w-full" aria-label={`${title} max`}
    />
    <div class="absolute w-3 h-3 bg-white rounded-full shadow-md border border-indigo-400/40 pointer-events-none" style={`left: calc(${minPct}% - 6px)`}></div>
    <div class="absolute w-3 h-3 bg-white rounded-full shadow-md border border-indigo-400/40 pointer-events-none" style={`left: calc(${maxPct}% - 6px)`}></div>
  </div>

  <!-- Min / Max numeric pair -->
  <div class="grid grid-cols-2 gap-2">
    <label class="flex items-center gap-1.5">
      <span class="text-[9px] text-slate-500 shrink-0">{minLabel}</span>
      <input type="number" {min} {max} {step} value={minValue}
        onchange={(e) => onMinChange(clamp(parseFloat((e.target as HTMLInputElement).value) || min))}
        class="w-full bg-white/5 border border-white/10 rounded text-[11px] font-mono text-slate-200 text-right px-1.5 py-0.5 focus:outline-none focus:border-indigo-500" />
    </label>
    <label class="flex items-center gap-1.5">
      <span class="text-[9px] text-slate-500 shrink-0">{maxLabel}</span>
      <input type="number" {min} {max} {step} value={maxValue}
        onchange={(e) => onMaxChange(clamp(parseFloat((e.target as HTMLInputElement).value) || max))}
        class="w-full bg-white/5 border border-white/10 rounded text-[11px] font-mono text-slate-200 text-right px-1.5 py-0.5 focus:outline-none focus:border-indigo-500" />
    </label>
  </div>

  <!-- Min → Max preview -->
  {#if previewKind === "type"}
    <div class="flex items-baseline justify-between gap-3 mt-2 px-1 overflow-hidden">
      <span class="text-slate-500 leading-none truncate" style={`font-size:${Math.min(minValue, 2)}rem`}>Aa<span class="text-[8px] font-mono align-middle ml-1">{minLabel.toLowerCase()}</span></span>
      <span class="text-white/80 leading-none truncate" style={`font-size:${Math.min(maxValue, 2.6)}rem`}>Aa<span class="text-[8px] font-mono align-middle ml-1">{maxLabel.toLowerCase()}</span></span>
    </div>
  {:else if previewKind === "space"}
    <div class="flex items-center gap-2 mt-2 px-1">
      <div class="h-2 bg-indigo-500/40 rounded shrink-0" style={`width:${Math.min(minValue * 28, 120)}px`}></div>
      <span class="text-[8px] font-mono text-slate-600">min</span>
      <div class="h-2 bg-indigo-500/70 rounded shrink-0" style={`width:${Math.min(maxValue * 28, 200)}px`}></div>
      <span class="text-[8px] font-mono text-slate-600">max</span>
    </div>
  {/if}

  <!-- Ratio presets (optional) -->
  {#if ratioPresets}
    <div class="mt-3 pt-3 border-t border-white/6">
      <div class="text-[9px] font-semibold text-slate-500 mb-1.5">Modular scale ratio</div>
      <div class="grid grid-cols-2 gap-1">
        {#each ratioPresets as p (p.value)}
          <button
            onclick={() => onRatioPreset?.(p.value)}
            class={`px-2 py-1 rounded-md text-[10px] border transition-all cursor-pointer text-left ${
              activeRatioValue === p.value
                ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >{p.label}</button>
        {/each}
      </div>
      {#if customRatioOpen}
        <div class="grid grid-cols-2 gap-2 mt-2 pl-2 border-l border-amber-500/25">
          <label class="flex items-center gap-1.5">
            <span class="text-[9px] text-slate-500 shrink-0">{minLabel.toLowerCase()}</span>
            <input type="number" min={ratioMin_bound} max={ratioMax_bound} step={0.001} value={ratioMin}
              onchange={(e) => { const n = parseFloat((e.target as HTMLInputElement).value); if (Number.isFinite(n)) onRatioMinChange?.(Math.min(ratioMax_bound, Math.max(ratioMin_bound, n))); }}
              class="w-full bg-white/5 border border-white/10 rounded text-[11px] font-mono text-slate-200 text-right px-1.5 py-0.5 focus:outline-none focus:border-indigo-500" />
          </label>
          <label class="flex items-center gap-1.5">
            <span class="text-[9px] text-slate-500 shrink-0">{maxLabel.toLowerCase()}</span>
            <input type="number" min={ratioMin_bound} max={ratioMax_bound} step={0.001} value={ratioMax}
              onchange={(e) => { const n = parseFloat((e.target as HTMLInputElement).value); if (Number.isFinite(n)) onRatioMaxChange?.(Math.min(ratioMax_bound, Math.max(ratioMin_bound, n))); }}
              class="w-full bg-white/5 border border-white/10 rounded text-[11px] font-mono text-slate-200 text-right px-1.5 py-0.5 focus:outline-none focus:border-indigo-500" />
          </label>
        </div>
      {/if}
    </div>
  {/if}

  {#if overridden && onReset}
    <div class="flex justify-end mt-2">
      <button onclick={onReset} class="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer">reset</button>
    </div>
  {/if}
</div>

<style>
  /* Two overlaid range inputs share one track: the element ignores pointer
     events, but each thumb stays grabbable so both min and max are draggable. */
  .clampRange {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
    pointer-events: none;
    margin: 0;
  }
  .clampRange::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 9999px;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
  }
  .clampRange::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border: 0;
    border-radius: 9999px;
    background: transparent;
    cursor: pointer;
    pointer-events: auto;
  }
  .clampRange::-moz-range-track {
    background: transparent;
  }
</style>
