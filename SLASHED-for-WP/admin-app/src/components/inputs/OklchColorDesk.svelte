<script lang="ts">
  import RangeWithNumber from './RangeWithNumber.svelte';

  let { label, tokenName, value, overridden, onChange, onReset }: {
    label: string;
    tokenName: string;
    value: string;
    overridden: boolean;
    onChange: (value: string) => void;
    onReset: () => void;
  } = $props();

  function parseOklch(raw: string): { l: number; c: number; h: number } | null {
    const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/.exec(raw);
    if (!m) return null;
    return { l: parseFloat(m[1]), c: parseFloat(m[2]), h: parseFloat(m[3]) };
  }

  function oklchToCSS(l: number, c: number, h: number) {
    return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`;
  }

  function oklchToRgbApprox(l: number, c: number, h: number): string {
    const hRad = (h * Math.PI) / 180;
    const a = c * Math.cos(hRad);
    const b = c * Math.sin(hRad);
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
    const ll = l_ * l_ * l_;
    const mm = m_ * m_ * m_;
    const ss = s_ * s_ * s_;
    let r = 4.0767416621 * ll - 3.3077115913 * mm + 0.2309699292 * ss;
    let g = -1.2684380046 * ll + 2.6097574011 * mm - 0.3413193965 * ss;
    let bv = -0.0041960863 * ll - 0.7034186147 * mm + 1.7076147010 * ss;
    const toGamma = (x: number) =>
      x <= 0 ? 0 : x >= 1 ? 255 : Math.round(Math.pow(x, 1 / 2.2) * 255);
    return `rgb(${toGamma(r)},${toGamma(g)},${toGamma(bv)})`;
  }

  let parsed = $derived(parseOklch(value) ?? { l: 0.6, c: 0.15, h: 264 });
  let expanded = $state(false);
  let localRaw = $state("");

  let swatchColor = $derived(oklchToRgbApprox(parsed.l, parsed.c, parsed.h));
  let shortName = $derived(tokenName.replace("--sf-", ""));

  function update(l: number, c: number, h: number) {
    onChange(oklchToCSS(l, c, h));
  }
</script>

<div class={`rounded-xl border transition-all ${overridden ? "bg-indigo-500/8 border-indigo-500/20" : "bg-white/4 border-white/8 hover:border-white/12"}`}>
  <button
    onclick={() => { expanded = !expanded; }}
    class="w-full flex items-center gap-3 px-3 py-2.5 cursor-pointer"
  >
    <div
      class="w-8 h-8 rounded-lg border border-white/10 shrink-0 shadow-lg"
      style:background={swatchColor}
    ></div>
    <div class="flex-1 text-left min-w-0">
      <div class="text-[11px] font-semibold text-slate-200">{label}</div>
      <div class="text-[9px] font-mono text-slate-500">{shortName}</div>
      <div class="text-[9px] font-mono text-slate-600">{value}</div>
    </div>
    {#if overridden}
      <div class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
    {/if}
    <div class={`text-slate-500 text-[10px] transition-transform ${expanded ? "rotate-180" : ""}`}>▾</div>
  </button>

  {#if expanded}
    <div class="px-3 pb-3 border-t border-white/6 pt-3 space-y-3">
      <!-- L slider -->
      <div>
        <div class="flex justify-between mb-1">
          <span class="text-[10px] font-bold text-slate-400">Lightness (L)</span>
          <span class="text-[10px] font-mono text-slate-400">{parsed.l.toFixed(3)}</span>
        </div>
        <div
          class="h-4 rounded-full mb-1"
          style={`background: linear-gradient(to right, oklch(0 ${parsed.c.toFixed(3)} ${parsed.h.toFixed(1)}), oklch(1 ${parsed.c.toFixed(3)} ${parsed.h.toFixed(1)}))`}
        ></div>
        <RangeWithNumber
          value={parsed.l}
          min={0}
          max={1}
          step={0.005}
          onChange={(v) => update(v, parsed.c, parsed.h)}
        />
      </div>

      <!-- C slider -->
      <div>
        <div class="flex justify-between mb-1">
          <span class="text-[10px] font-bold text-slate-400">Chroma (C)</span>
          <span class="text-[10px] font-mono text-slate-400">{parsed.c.toFixed(3)}</span>
        </div>
        <RangeWithNumber
          value={parsed.c}
          min={0}
          max={0.4}
          step={0.005}
          onChange={(v) => update(parsed.l, v, parsed.h)}
        />
      </div>

      <!-- H slider -->
      <div>
        <div class="flex justify-between mb-1">
          <span class="text-[10px] font-bold text-slate-400">Hue (H)</span>
          <span class="text-[10px] font-mono text-slate-400">{parsed.h.toFixed(1)}°</span>
        </div>
        <div
          class="h-4 rounded-full mb-1"
          style={`background: linear-gradient(to right, oklch(${parsed.l.toFixed(3)} ${parsed.c.toFixed(3)} 0), oklch(${parsed.l.toFixed(3)} ${parsed.c.toFixed(3)} 60), oklch(${parsed.l.toFixed(3)} ${parsed.c.toFixed(3)} 120), oklch(${parsed.l.toFixed(3)} ${parsed.c.toFixed(3)} 180), oklch(${parsed.l.toFixed(3)} ${parsed.c.toFixed(3)} 240), oklch(${parsed.l.toFixed(3)} ${parsed.c.toFixed(3)} 300), oklch(${parsed.l.toFixed(3)} ${parsed.c.toFixed(3)} 360))`}
        ></div>
        <RangeWithNumber
          value={parsed.h}
          min={0}
          max={360}
          step={1}
          unit="°"
          onChange={(v) => update(parsed.l, parsed.c, v)}
        />
      </div>

      <!-- Raw value -->
      <div>
        <div class="text-[10px] font-bold text-slate-500 mb-1">Raw value</div>
        <div class="flex gap-2">
          <input
            type="text"
            value={localRaw || value}
            oninput={(e) => { localRaw = (e.target as HTMLInputElement).value; }}
            onblur={() => {
              if (localRaw.trim()) {
                onChange(localRaw.trim());
                localRaw = "";
              }
            }}
            onkeydown={(e) => {
              if (e.key === "Enter") {
                if (localRaw.trim()) {
                  onChange(localRaw.trim());
                  localRaw = "";
                }
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
            class="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            placeholder="oklch(0.6 0.15 264)"
          />
          {#if overridden}
            <button
              onclick={onReset}
              class="px-2 py-1 rounded-lg text-[10px] text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors cursor-pointer"
            >
              Reset
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
