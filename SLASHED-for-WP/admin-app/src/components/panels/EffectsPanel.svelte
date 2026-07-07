<script lang="ts">
  import SliderRow from '../inputs/SliderRow.svelte';
  import ColorInput from '../inputs/ColorInput.svelte';

  let { overrides, onSet, onReset }: {
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
  } = $props();

  const SCRIM_DIRECTIONS = [
    { label: "To top",    value: "to top" },
    { label: "To bottom", value: "to bottom" },
    { label: "To left",   value: "to left" },
    { label: "To right",  value: "to right" },
  ];

  const TEXT_SHADOW_TOKENS = [
    { label: "Extra small", token: "--sf-text-shadow-xs", default: "0 0.5px 1px oklch(…)" },
    { label: "Small",       token: "--sf-text-shadow-s",  default: "0 1px 2px oklch(…)" },
    { label: "Medium",      token: "--sf-text-shadow-m",  default: "0 2px 4px oklch(…)" },
    { label: "Large",       token: "--sf-text-shadow-l",  default: "0 4px 8px oklch(…)" },
    { label: "Extra large", token: "--sf-text-shadow-xl", default: "0 8px 16px oklch(…)" },
  ];

  const DROP_SHADOW_STEPS = ["xs", "s", "m", "l", "xl"];

  function parseNum(val: string | undefined, fallback: number, strip?: string): number {
    if (!val) return fallback;
    const v = parseFloat(strip ? val.replace(strip, "") : val);
    return isNaN(v) ? fallback : v;
  }

  let blur            = $derived(parseNum(overrides["--sf-blur"], 12, "px"));
  let opacityMuted    = $derived(parseNum(overrides["--sf-opacity-muted"], 0.5));
  let opacityDisabled = $derived(parseNum(overrides["--sf-opacity-disabled"], 0.45));
  let scrimDir        = $derived(overrides["--sf-scrim-direction"] ?? "to top");
  let scrimColor      = $derived(overrides["--sf-scrim-color"] ?? "");
  let scrollShadowSize = $derived(parseNum(overrides["--sf-scroll-shadow-size"]?.replace("rem",""), 2));
  let pendingOpacity  = $derived(parseNum(overrides["--sf-state-pending-opacity"], 0.7));
  let scrollbarThumb  = $derived(overrides["--sf-scrollbar-thumb"] ?? "");
  let scrollbarTrack  = $derived(overrides["--sf-scrollbar-track"] ?? "");

  let showBlur = $state(false);
  let showOpacity = $state(false);
  let showScrim = $state(false);
  let showScrollbar = $state(false);
  let showScrollShadow = $state(false);
  let showTextShadow = $state(false);
  let showDropShadow = $state(false);
</script>

<div class="p-4 space-y-6">

  <!-- BLUR -->
  <section class="space-y-3">
    <button
      onclick={() => { showBlur = !showBlur; }}
      aria-expanded={showBlur}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Blur</div>
      <span class="text-[10px] text-slate-500">{showBlur ? "▲" : "▼"}</span>
    </button>
    {#if showBlur}
      <SliderRow
        label="Blur radius" value={blur} min={0} max={48} step={1} unit="px"
        help="--sf-blur — used for frosted glass, modals, tooltips"
        overridden={"--sf-blur" in overrides}
        onChange={(v) => onSet("--sf-blur", `${v}px`)}
        onReset={() => onReset("--sf-blur")}
      />
      <!-- Blur preview -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-4 flex gap-3 items-center justify-center overflow-hidden relative">
        <div class="absolute inset-0 grid grid-cols-4 grid-rows-3 gap-px opacity-30">
          {#each Array.from({ length: 12 }) as _, i (i)}
            <div class={i % 3 === 0 ? "bg-indigo-500/50" : i % 3 === 1 ? "bg-purple-500/40" : "bg-blue-500/30"}></div>
          {/each}
        </div>
        <div
          class="relative z-10 w-20 h-12 rounded-lg border border-black/20 dark:border-white/20 bg-black/10 dark:bg-white/10 flex items-center justify-center"
          style={`backdrop-filter: blur(${blur}px)`}
        >
          <span class="text-[9px] font-mono text-slate-900/70 dark:text-white/70">{blur}px</span>
        </div>
      </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- OPACITY -->
  <section class="space-y-4">
    <button
      onclick={() => { showOpacity = !showOpacity; }}
      aria-expanded={showOpacity}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Opacity</div>
      <span class="text-[10px] text-slate-500">{showOpacity ? "▲" : "▼"}</span>
    </button>
    {#if showOpacity}
      <SliderRow
        label="Muted opacity" value={opacityMuted} min={0} max={1} step={0.05}
        help="--sf-opacity-muted — secondary text, icons, and placeholder content"
        overridden={"--sf-opacity-muted" in overrides}
        onChange={(v) => onSet("--sf-opacity-muted", String(v))}
        onReset={() => onReset("--sf-opacity-muted")}
      />
      <SliderRow
        label="Disabled opacity" value={opacityDisabled} min={0} max={1} step={0.05}
        help="--sf-opacity-disabled — disabled form controls and interactive elements"
        overridden={"--sf-opacity-disabled" in overrides}
        onChange={(v) => onSet("--sf-opacity-disabled", String(v))}
        onReset={() => onReset("--sf-opacity-disabled")}
      />
      <SliderRow
        label="Pending opacity" value={pendingOpacity} min={0.1} max={1} step={0.05}
        help="--sf-state-pending-opacity — opacity of elements in loading/pending state"
        overridden={"--sf-state-pending-opacity" in overrides}
        onChange={(v) => onSet("--sf-state-pending-opacity", String(v))}
        onReset={() => onReset("--sf-state-pending-opacity")}
      />
      <!-- Opacity preview -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3 space-y-2">
        {#each [
          { label: "muted", val: opacityMuted },
          { label: "disabled", val: opacityDisabled },
          { label: "pending", val: pendingOpacity },
        ] as row (row.label)}
          <div class="flex items-center gap-3">
            <span class="text-[9px] text-slate-400 dark:text-slate-600 w-14">{row.label}</span>
            <div class="flex-1 h-4 bg-indigo-400 rounded" style={`opacity: ${row.val}`}></div>
            <span class="text-[9px] font-mono text-slate-500 w-8">{row.val}</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- SCRIM -->
  <section class="space-y-4">
    <button
      onclick={() => { showScrim = !showScrim; }}
      aria-expanded={showScrim}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scrim overlay</div>
      <span class="text-[10px] text-slate-500">{showScrim ? "▲" : "▼"}</span>
    </button>
    {#if showScrim}
      <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
        Gradient overlay for hero images and media content. Used by the <code class="text-slate-600 dark:text-slate-400">.sf-scrim</code> macro.
      </p>

      <!-- Scrim color -->
      <div class="flex items-center gap-2">
        <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">Color</div>
        <ColorInput
          token="--sf-scrim-color"
          value={scrimColor}
          placeholder="default (base color)"
          isOverridden={"--sf-scrim-color" in overrides}
          onSet={(v) => onSet("--sf-scrim-color", v)}
          onReset={() => onReset("--sf-scrim-color")}
        />
      </div>

      <div>
        <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-2">Direction</div>
        <div class="grid grid-cols-2 gap-1">
          {#each SCRIM_DIRECTIONS as d (d.value)}
            <button
              onclick={() => d.value === "to top" ? onReset("--sf-scrim-direction") : onSet("--sf-scrim-direction", d.value)}
              class={`py-2 px-3 rounded-lg text-[10px] border transition-all cursor-pointer text-left ${
                scrimDir === d.value
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                  : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              {d.label}
            </button>
          {/each}
        </div>
      </div>

      <!-- Scrim preview -->
      <div class="rounded-xl overflow-hidden border border-black/8 dark:border-white/8" style="height: 80px">
        <div
          class="w-full h-full relative"
          style="background: linear-gradient(135deg, oklch(0.3 0.15 264), oklch(0.25 0.1 300))"
        >
          <div
            class="absolute inset-0"
            style={`background: linear-gradient(${scrimDir}, ${scrimColor || "oklch(0 0 0 / 0.6)"}, transparent)`}
          ></div>
          <div class="absolute bottom-2 left-3 text-[10px] text-white/80 font-medium">Scrim preview</div>
        </div>
      </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- SCROLLBAR -->
  <section class="space-y-3">
    <button
      onclick={() => { showScrollbar = !showScrollbar; }}
      aria-expanded={showScrollbar}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scrollbar</div>
      <span class="text-[10px] text-slate-500">{showScrollbar ? "▲" : "▼"}</span>
    </button>
    {#if showScrollbar}
      {#each [
        { label: "Thumb color", token: "--sf-scrollbar-thumb", val: scrollbarThumb },
        { label: "Track color", token: "--sf-scrollbar-track", val: scrollbarTrack },
      ] as row (row.token)}
        <div class="flex items-center gap-2">
          <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-20 shrink-0">{row.label}</div>
          <ColorInput
            token={row.token}
            value={row.val}
            placeholder="default"
            isOverridden={row.token in overrides}
            onSet={(v) => onSet(row.token, v)}
            onReset={() => onReset(row.token)}
          />
        </div>
      {/each}
      <!-- Scrollbar strip preview -->
      <div class="flex items-center gap-2 p-2 rounded-lg bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8">
        <div class="w-16 h-3 rounded-full" style:background={scrollbarTrack || "rgba(255,255,255,0.08)"}>
          <div class="w-6 h-3 rounded-full" style:background={scrollbarThumb || "oklch(0.52 0.025 260)"}></div>
        </div>
        <span class="text-[9px] text-slate-400 dark:text-slate-600">Scrollbar preview</span>
      </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- SCROLL SHADOW -->
  <section class="space-y-3">
    <button
      onclick={() => { showScrollShadow = !showScrollShadow; }}
      aria-expanded={showScrollShadow}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scroll shadow</div>
      <span class="text-[10px] text-slate-500">{showScrollShadow ? "▲" : "▼"}</span>
    </button>
    {#if showScrollShadow}
      <SliderRow
        label="Shadow size" value={scrollShadowSize} min={0} max={6} step={0.25} unit="rem"
        help="--sf-scroll-shadow-size — gradient edge mask on .sf-scroll-shadow elements"
        overridden={"--sf-scroll-shadow-size" in overrides}
        onChange={(v) => onSet("--sf-scroll-shadow-size", `${v}rem`)}
        onReset={() => onReset("--sf-scroll-shadow-size")}
      />
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- TEXT SHADOW PRESETS -->
  <section class="space-y-3">
    <button
      onclick={() => { showTextShadow = !showTextShadow; }}
      aria-expanded={showTextShadow}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Text shadow</div>
      <span class="text-[10px] text-slate-500">{showTextShadow ? "▲" : "▼"}</span>
    </button>
    {#if showTextShadow}
      <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
        Controls text legibility over images. Applied via <code class="text-slate-600 dark:text-slate-400">text-shadow: var(--sf-text-shadow-m)</code>.
        Edit each token directly — use <code class="text-slate-600 dark:text-slate-400">none</code> to disable.
      </p>
      <div class="space-y-2">
        {#each TEXT_SHADOW_TOKENS as t (t.token)}
          <div class="flex items-center gap-2">
            <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">{t.label}</div>
            <input
              type="text"
              value={overrides[t.token] ?? ""}
              placeholder={t.default}
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                v.trim() ? onSet(t.token, v) : onReset(t.token);
              }}
              class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
            {#if t.token in overrides}
              <button onclick={() => onReset(t.token)} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- DROP SHADOW PRESETS -->
  <section class="space-y-3">
    <button
      onclick={() => { showDropShadow = !showDropShadow; }}
      aria-expanded={showDropShadow}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Drop shadow</div>
      <span class="text-[10px] text-slate-500">{showDropShadow ? "▲" : "▼"}</span>
    </button>
    {#if showDropShadow}
      <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
        <code class="text-slate-600 dark:text-slate-400">filter: drop-shadow(…)</code> — unlike box-shadow, follows the
        element's actual alpha shape (SVG icons, PNG cutouts, transparent logos). Edit each token directly —
        use <code class="text-slate-600 dark:text-slate-400">none</code> to disable.
      </p>
      <div class="space-y-2">
        {#each [
          { label: "Extra small", token: "--sf-drop-shadow-xs", default: "drop-shadow(0 0.5px 1px oklch(…))" },
          { label: "Small",       token: "--sf-drop-shadow-s",  default: "drop-shadow(0 1px 2px oklch(…))" },
          { label: "Medium",      token: "--sf-drop-shadow-m",  default: "drop-shadow(0 4px 6px oklch(…))" },
          { label: "Large",       token: "--sf-drop-shadow-l",  default: "drop-shadow(0 8px 16px oklch(…))" },
          { label: "Extra large", token: "--sf-drop-shadow-xl", default: "drop-shadow(0 16px 32px oklch(…))" },
        ] as t (t.token)}
          <div class="flex items-center gap-2">
            <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">{t.label}</div>
            <input
              type="text"
              value={overrides[t.token] ?? ""}
              placeholder={t.default}
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                v.trim() ? onSet(t.token, v) : onReset(t.token);
              }}
              class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
            {#if t.token in overrides}
              <button onclick={() => onReset(t.token)} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
            {/if}
          </div>
        {/each}
      </div>

      <!-- Drop-shadow preview — real .sf-drop-shadow-* utility classes -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-4 flex gap-4 items-end justify-center flex-wrap">
        {#each DROP_SHADOW_STEPS as step (step)}
          <div class="flex flex-col items-center gap-1.5">
            <svg width="40" height="40" viewBox="0 0 24 24" class={`sf-drop-shadow-${step}`} aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="3" fill="var(--sf-color-primary)" />
            </svg>
            <span class="text-[8px] font-mono text-slate-400 dark:text-slate-600">{step}</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>
