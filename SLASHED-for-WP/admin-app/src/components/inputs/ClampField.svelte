<script lang="ts">
  /**
   * ClampField — a single, visually-connected min⇄max control for fluid
   * `clamp()` tokens (used by both the typography and spacing scale
   * generators). Min and max share one track with two thumbs and a highlighted
   * band, a live clamp readout, an optional min→max preview, and optional
   * modular-scale ratio preset chips folded into the same card.
   */
  import { themeState } from '../../lib/theme.svelte';

  type RatioPreset = { label: string; value: number };

  // <option> only reliably accepts a background via inline style (no dark:
  // variant support), so it's derived from the chrome theme directly.
  let optionBg = $derived(themeState.value === 'dark' ? '#16161e' : '#ffffff');

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
    // Optional ratio block — independent mobile (ratioMin) / desktop (ratioMax)
    // modular-scale ratios. Each breakpoint gets its own preset selector and an
    // always-visible custom number input.
    ratioPresets,
    ratioMin,
    ratioMax,
    ratioMin_bound = 1.05,
    ratioMax_bound = 1.8,
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
    ratioMin?: number;
    ratioMax?: number;
    ratioMin_bound?: number;
    ratioMax_bound?: number;
    onRatioMinChange?: (v: number) => void;
    onRatioMaxChange?: (v: number) => void;
    previewKind?: "none" | "type" | "space";
  } = $props();

  function clamp(v: number) {
    return Math.min(max, Math.max(min, v));
  }
  let minPct = $derived(((minValue - min) / (max - min)) * 100);
  let maxPct = $derived(((maxValue - min) / (max - min)) * 100);

  function clampRatio(v: number) {
    return Math.min(ratioMax_bound, Math.max(ratioMin_bound, v));
  }
  // Which preset (if any) each breakpoint currently matches, computed per side
  // so mobile and desktop highlight independently.
  let activeRatioMin = $derived(
    ratioPresets?.find((p) => ratioMin !== undefined && Math.abs(p.value - ratioMin) < 0.0015)?.value
  );
  let activeRatioMax = $derived(
    ratioPresets?.find((p) => ratioMax !== undefined && Math.abs(p.value - ratioMax) < 0.0015)?.value
  );
</script>

<div class={`rounded-xl border p-3 ${overridden ? "bg-indigo-500/8 border-indigo-500/25" : "bg-black/4 dark:bg-white/4 border-black/8 dark:border-white/8"}`}>
  <div class="flex items-center justify-between mb-2">
    <span class="text-[10px] font-bold text-slate-700 dark:text-slate-300">{title}</span>
    <span class="text-[9px] font-mono text-slate-500">
      clamp(<span class="text-indigo-700 dark:text-indigo-300">{minValue}{unit}</span> … <span class="text-indigo-700 dark:text-indigo-300">{maxValue}{unit}</span>)
    </span>
  </div>

  <!-- Connected dual-thumb track -->
  <div class="clampTrack relative h-5 flex items-center mb-2">
    <div class="absolute inset-x-0 h-1 bg-black/8 dark:bg-white/8 rounded-full"></div>
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
        class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded text-[11px] font-mono text-slate-800 dark:text-slate-200 text-right px-1.5 py-0.5 focus:outline-none focus:border-indigo-500" />
    </label>
    <label class="flex items-center gap-1.5">
      <span class="text-[9px] text-slate-500 shrink-0">{maxLabel}</span>
      <input type="number" {min} {max} {step} value={maxValue}
        onchange={(e) => onMaxChange(clamp(parseFloat((e.target as HTMLInputElement).value) || max))}
        class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded text-[11px] font-mono text-slate-800 dark:text-slate-200 text-right px-1.5 py-0.5 focus:outline-none focus:border-indigo-500" />
    </label>
  </div>

  <!-- Min → Max preview -->
  {#if previewKind === "type"}
    <div class="flex items-baseline justify-between gap-3 mt-2 px-1 overflow-hidden">
      <span class="text-slate-500 leading-none truncate" style={`font-size:${Math.min(minValue, 2)}rem`}>Aa<span class="text-[8px] font-mono align-middle ml-1">{minLabel.toLowerCase()}</span></span>
      <span class="text-slate-900/80 dark:text-white/80 leading-none truncate" style={`font-size:${Math.min(maxValue, 2.6)}rem`}>Aa<span class="text-[8px] font-mono align-middle ml-1">{maxLabel.toLowerCase()}</span></span>
    </div>
  {:else if previewKind === "space"}
    <div class="flex items-center gap-2 mt-2 px-1">
      <div class="h-2 bg-indigo-500/40 rounded shrink-0" style={`width:${Math.min(minValue * 28, 120)}px`}></div>
      <span class="text-[8px] font-mono text-slate-400 dark:text-slate-600">min</span>
      <div class="h-2 bg-indigo-500/70 rounded shrink-0" style={`width:${Math.min(maxValue * 28, 200)}px`}></div>
      <span class="text-[8px] font-mono text-slate-400 dark:text-slate-600">max</span>
    </div>
  {/if}

  <!-- Modular-scale ratio (optional) — independent mobile & desktop ratios.
       Each breakpoint has its own preset dropdown plus an always-visible custom
       number input, so a preset can be picked and then fine-tuned per side. -->
  {#if ratioPresets}
    <div class="mt-3 pt-3 border-t border-black/6 dark:border-white/6">
      <div class="text-[9px] font-semibold text-slate-500 mb-2">Modular scale ratio</div>
      <div class="space-y-2">
        {#each [
          { side: minLabel, value: ratioMin, active: activeRatioMin, onChange: onRatioMinChange },
          { side: maxLabel, value: ratioMax, active: activeRatioMax, onChange: onRatioMaxChange },
        ] as row (row.side)}
          <div class="flex items-center gap-2">
            <span class="text-[9px] text-slate-500 w-14 shrink-0">{row.side}</span>
            <select
              aria-label={`${row.side} modular scale ratio preset`}
              value={row.active !== undefined ? String(row.active) : ""}
              onchange={(e) => {
                const v = parseFloat((e.target as HTMLSelectElement).value);
                if (Number.isFinite(v)) row.onChange?.(clampRatio(v));
              }}
              class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded text-[10px] text-slate-800 dark:text-slate-200 px-1.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {#if row.active === undefined}
                <option value="" style={`background:${optionBg};`}>Custom</option>
              {/if}
              {#each ratioPresets as p (p.value)}
                <option value={String(p.value)} style={`background:${optionBg};`}>{p.label}</option>
              {/each}
            </select>
            <input
              aria-label={`${row.side} modular scale custom ratio`}
              type="number" min={ratioMin_bound} max={ratioMax_bound} step={0.001} value={row.value}
              onchange={(e) => { const n = parseFloat((e.target as HTMLInputElement).value); if (Number.isFinite(n)) row.onChange?.(clampRatio(n)); }}
              class="w-16 shrink-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded text-[11px] font-mono text-slate-800 dark:text-slate-200 text-right px-1.5 py-0.5 focus:outline-none focus:border-indigo-500"
            />
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if overridden && onReset}
    <div class="flex justify-end mt-2">
      <button onclick={onReset} class="text-[9px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer">reset</button>
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
