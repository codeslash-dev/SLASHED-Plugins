<script lang="ts">
  import { KNOBS_BY_DOMAIN } from '../../lib/powerKnobs';
  import PowerKnobRow from '../inputs/PowerKnobRow.svelte';
  import SliderRow from '../inputs/SliderRow.svelte';

  let { overrides, onSet, onReset, onBulkChange }: {
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
    onBulkChange: (patch: Record<string, string | null>) => void;
  } = $props();

  const DURATIONS = [
    { label: "Instant", token: "--sf-duration-instant", base: 100, max: 300  },
    { label: "Fast",    token: "--sf-duration-fast",    base: 150, max: 500  },
    { label: "Normal",  token: "--sf-duration-normal",  base: 250, max: 800  },
    { label: "Slow",    token: "--sf-duration-slow",    base: 400, max: 1200 },
    { label: "Slower",  token: "--sf-duration-slower",  base: 600, max: 2000 },
  ];

  const EASINGS = [
    { label: "Linear",     token: "--sf-ease-linear",    value: "linear",                                                      preview: "M0,40 L40,0" },
    { label: "Ease out",   token: "--sf-ease-out",       value: "cubic-bezier(0.25, 0, 0.15, 1)",                              preview: "M0,40 C8,40 28,0 40,0" },
    { label: "Ease in",    token: "--sf-ease-in",        value: "cubic-bezier(0.5, 0, 0.75, 0.25)",                            preview: "M0,40 C12,40 32,32 40,0" },
    { label: "Ease in-out",token: "--sf-ease-in-out",    value: "cubic-bezier(0.4, 0, 0.2, 1)",                                preview: "M0,40 C8,40 32,0 40,0" },
    { label: "Spring",     token: "--sf-ease-spring",    value: "linear(0, 0.5, 1.1, 0.95, 1.02, 1)",                          preview: "M0,40 C10,20 20,-4 28,-2 S38,2 40,0" },
    { label: "Bounce",     token: "--sf-ease-bounce",    value: "linear(0, 0.35 18%, 1 32%, 0.86 42%, 1.02 56%, 0.98 72%, 1)", preview: "M0,40 L12,16 L20,0 L26,6 L32,-1 L36,1 L40,0" },
    { label: "Elastic",    token: "--sf-ease-elastic",   value: "linear(0, 0.3, 1.2, 0.9, 1.05, 1)",                           preview: "M0,40 C8,40 16,-10 24,-2 S36,2 40,0" },
    { label: "Overshoot",  token: "--sf-ease-overshoot", value: "linear(0, 0.6 30%, 1.08 55%, 0.98 75%, 1)",                   preview: "M0,40 C8,40 20,-10 40,0" },
  ];

  const STAGGER_TOKENS = ["--sf-animation-delay-1","--sf-animation-delay-2","--sf-animation-delay-3","--sf-animation-delay-4","--sf-animation-delay-5"];

  const knobs = KNOBS_BY_DOMAIN["motion"] ?? [];

  let scale = $derived((() => { const v = parseFloat(overrides["--sf-motion-scale"] ?? "1"); return isFinite(v) ? v : 1; })());
  let motionDisabled = $derived(overrides["--sf-motion-scale"] === "0");
  let themeTransition = $derived((() => { const v = parseFloat(overrides["--sf-theme-transition-duration"]?.replace("ms","") ?? String(300 * scale)); return isFinite(v) ? v : Math.round(300 * scale); })());
  let staggerBase = $derived.by(() => {
    const raw = overrides[STAGGER_TOKENS[0]];
    if (raw) return parseFloat(raw.replace("ms",""));
    return 75 * scale;
  });

  // Animation demo — user picks which easing + duration to feel.
  let animating = $state(false);
  let animOffsetX = $state(0);
  let demoEase = $state("--sf-ease-out");
  let demoDuration = $state("--sf-duration-normal");

  let showDurations = $state(false);
  let showEasing = $state(false);
  let showStagger = $state(false);
  let showAdvanced = $state(false);

  function getDuration(token: string, base: number): number {
    const raw = overrides[token];
    if (raw) {
      const parsed = parseFloat(raw);
      if (isFinite(parsed)) return parsed;
    }
    return Math.round(base * scale);
  }

  function easeValue(token: string): string {
    return overrides[token] ?? EASINGS.find((e) => e.token === token)?.value ?? "ease";
  }

  function playDemo() {
    if (animating) return;
    const base = DURATIONS.find((d) => d.token === demoDuration)?.base ?? 250;
    const dur = getDuration(demoDuration, base);
    animating = true;
    animOffsetX = 180;
    setTimeout(() => {
      animOffsetX = 0;
      setTimeout(() => { animating = false; }, dur);
    }, dur);
  }

  function setStaggerBase(baseMs: number) {
    const patch: Record<string, string> = {};
    for (let i = 1; i <= 5; i++) patch[`--sf-animation-delay-${i}`] = `${Math.round(baseMs * i)}ms`;
    onBulkChange(patch);
  }

  function resetStagger() {
    const patch: Record<string, null> = {};
    for (let i = 1; i <= 5; i++) patch[`--sf-animation-delay-${i}`] = null;
    onBulkChange(patch);
  }
</script>

<div class="p-4 space-y-5">

  <!-- Quick toggle -->
  <div class="flex items-center justify-between p-3 rounded-xl bg-white/4 border border-white/8">
    <div>
      <div class="text-[11px] font-semibold text-slate-200">Disable motion</div>
      <div class="text-[9px] text-slate-500 mt-0.5">Respects prefers-reduced-motion</div>
    </div>
    <button
      title={motionDisabled ? "Enable motion" : "Disable motion"}
      onclick={() => {
        if (motionDisabled) onReset("--sf-motion-scale");
        else onSet("--sf-motion-scale", "0");
      }}
      class={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
        motionDisabled ? "bg-indigo-600" : "bg-white/10"
      }`}
    >
      <div class={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
        motionDisabled ? "translate-x-4" : "translate-x-0.5"
      }`}></div>
    </button>
  </div>

  {#if motionDisabled}
    <div class="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5">
      <p class="text-[10px] text-amber-300">Motion is disabled — duration & easing have no effect while scale is 0.</p>
    </div>
  {/if}

  <!-- LIVE DEMO — pick an easing + duration and feel it. Sits at the top so any
       easing/duration edit can be previewed immediately. -->
  <section class="space-y-3">
    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live preview</div>
    <div class="bg-white/4 rounded-xl border border-white/8 p-4 space-y-3">
      <div class="relative h-10 overflow-hidden rounded">
        <div
          class="absolute top-1 h-8 w-8 bg-indigo-500 rounded-lg"
          style={`transform: translateX(${animOffsetX}px); transition: transform ${getDuration(demoDuration, DURATIONS.find(d => d.token === demoDuration)?.base ?? 250)}ms ${easeValue(demoEase)}`}
        ></div>
      </div>
      <div class="flex items-center gap-2">
        <select
          value={demoEase}
          aria-label="Preview easing"
          onchange={(e) => { demoEase = (e.target as HTMLSelectElement).value; }}
          class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          {#each EASINGS as e (e.token)}
            <option value={e.token} style="background:#16161e;">{e.label}</option>
          {/each}
        </select>
        <select
          value={demoDuration}
          aria-label="Preview duration"
          onchange={(e) => { demoDuration = (e.target as HTMLSelectElement).value; }}
          class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          {#each DURATIONS as d (d.token)}
            <option value={d.token} style="background:#16161e;">{d.label}</option>
          {/each}
        </select>
        <button
          onclick={playDemo}
          disabled={animating}
          class="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-all cursor-pointer disabled:opacity-40 shrink-0"
        >{animating ? "…" : "▶ Play"}</button>
      </div>
    </div>
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- DURATIONS (with inline preview) -->
  <section class="space-y-3">
    <button
      onclick={() => { showDurations = !showDurations; }}
      aria-expanded={showDurations}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Durations</div>
      <span class="text-[10px] text-slate-500">{showDurations ? "▲" : "▼"}</span>
    </button>
    {#if showDurations}
      <p class="text-[10px] text-slate-600 leading-relaxed">
        Named duration tokens. Drag to set an absolute ms value, overriding the global scale.
        {#if motionDisabled}<span class="text-amber-400"> (No effect while motion is disabled.)</span>{/if}
      </p>
      {#each DURATIONS as d (d.token)}
        {@const computed = getDuration(d.token, d.base)}
        <SliderRow
          label={d.label}
          value={computed}
          min={0}
          max={d.max}
          step={10}
          unit="ms"
          overridden={d.token in overrides}
          onChange={(v) => onSet(d.token, `${v}ms`)}
          onReset={() => onReset(d.token)}
        />
      {/each}
      <!-- Duration preview, inside the group it refers to -->
      <div class="bg-white/4 rounded-xl border border-white/8 p-4 space-y-3">
        {#each DURATIONS as d (d.label)}
          {@const actual = getDuration(d.token, d.base)}
          <div class="flex items-center gap-3">
            <span class="text-[10px] text-slate-500 w-14 shrink-0">{d.label}</span>
            <div class="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
              <div class="h-full bg-indigo-500 rounded-full" style={`width: ${Math.min((actual / 1200) * 100, 100)}%`}></div>
            </div>
            <span class="text-[9px] font-mono text-slate-500 w-10 text-right">{actual}ms</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- EASING — editable -->
  <section class="space-y-3">
    <button
      onclick={() => { showEasing = !showEasing; }}
      aria-expanded={showEasing}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Easing curves</div>
      <span class="text-[10px] text-slate-500">{showEasing ? "▲" : "▼"}</span>
    </button>
    {#if showEasing}
      <p class="text-[10px] text-slate-600 leading-relaxed">
        Edit the named easing tokens. Accepts any CSS timing function —
        <span class="font-mono text-slate-400">cubic-bezier(…)</span> or
        <span class="font-mono text-slate-400">linear(…)</span>. Use “Live preview” above to feel a curve.
      </p>
      <div class="space-y-2">
        {#each EASINGS as e (e.token)}
          {@const isOverridden = e.token in overrides}
          <div class={`p-2.5 rounded-xl border transition-all ${
            isOverridden ? "bg-indigo-500/10 border-indigo-500/30" : "border-white/8 bg-white/3"
          }`}>
            <div class="flex items-center gap-2.5">
              <svg width="40" height="28" viewBox="0 0 40 28" class="overflow-visible shrink-0">
                <path d={e.preview} stroke="rgb(99 102 241 / 0.6)" stroke-width="1.5" fill="none" stroke-linecap="round" />
              </svg>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-[10px] font-semibold text-slate-300">{e.label}</span>
                  <div class="flex items-center gap-1.5">
                    <button
                      onclick={() => { demoEase = e.token; playDemo(); }}
                      class="text-[8px] text-slate-500 hover:text-indigo-400 cursor-pointer"
                    >preview</button>
                    {#if isOverridden}
                      <button onclick={() => onReset(e.token)} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer">reset</button>
                    {/if}
                  </div>
                </div>
                <input
                  type="text"
                  value={overrides[e.token] ?? ""}
                  placeholder={e.value}
                  oninput={(ev) => {
                    const v = (ev.target as HTMLInputElement).value.trim();
                    v ? onSet(e.token, v) : onReset(e.token);
                  }}
                  class="w-full bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- STAGGER -->
  <section class="space-y-3">
    <button
      onclick={() => { showStagger = !showStagger; }}
      aria-expanded={showStagger}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stagger</div>
      <span class="text-[10px] text-slate-500">{showStagger ? "▲" : "▼"}</span>
    </button>
    {#if showStagger}
      <p class="text-[10px] text-slate-600 leading-relaxed">
        One slider sets all five stagger delays (delay-1 through delay-5 are multiples of this base).
      </p>
      <div class="group">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-semibold text-slate-200">Stagger base</span>
          {#if STAGGER_TOKENS.some(t => t in overrides)}
            <button onclick={resetStagger} class="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer opacity-0 group-hover:opacity-100">reset</button>
          {/if}
        </div>
        <SliderRow
          label="" value={Math.round(staggerBase)} min={0} max={200} step={5} unit="ms"
          help="Base unit for --sf-animation-delay-1 through -5"
          overridden={STAGGER_TOKENS.some(t => t in overrides)}
          onChange={(v) => setStaggerBase(v)}
          onReset={resetStagger}
        />
      </div>
      <div class="bg-white/4 rounded-xl border border-white/8 p-3 space-y-1">
        {#each [1,2,3,4,5] as n (n)}
          {@const delayMs = Math.round(staggerBase * n)}
          <div class="flex items-center gap-2">
            <span class="text-[9px] font-mono text-slate-600 w-6">–{n}</span>
            <div class="flex-1 h-1.5 bg-white/8 rounded-full">
              <div class="h-full bg-indigo-500 rounded-full" style={`width: ${Math.min((delayMs / 600) * 100, 100)}%`}></div>
            </div>
            <span class="text-[9px] font-mono text-slate-500 w-10 text-right">{delayMs}ms</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- ADVANCED — global scale power knob, theme transition, scroll timeline -->
  <section class="space-y-4">
    <button
      onclick={() => { showAdvanced = !showAdvanced; }}
      aria-expanded={showAdvanced}
      class="w-full flex items-center justify-between text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
    >
      <div class="text-[10px] font-semibold uppercase tracking-widest">Advanced</div>
      <span class="text-[10px]">{showAdvanced ? "▲" : "▼"}</span>
    </button>
    {#if showAdvanced}
      <!-- Global motion scale (power knob) -->
      <div class="space-y-4">
        {#each knobs as k (k.name)}
          <PowerKnobRow
            knob={k}
            {overrides}
            onChange={(name, val) => val === null ? onReset(name) : onSet(name, val)}
          />
        {/each}
      </div>

      <!-- Theme transition -->
      <SliderRow
        label="Theme switch speed" value={themeTransition} min={0} max={600} step={10} unit="ms"
        help="--sf-theme-transition-duration — dark/light color-scheme switch animation speed"
        overridden={"--sf-theme-transition-duration" in overrides}
        onChange={(v) => onSet("--sf-theme-transition-duration", `${v}ms`)}
        onReset={() => onReset("--sf-theme-transition-duration")}
      />

      <!-- Scroll timeline range -->
      <div class="space-y-2">
        <p class="text-[10px] text-slate-600 leading-relaxed">
          Default animation-range for scroll-driven animations using the
          <span class="font-mono text-slate-400">.sf-scroll-timeline</span> utility.
        </p>
        {#each [
          { label: "Range start", token: "--sf-scroll-timeline-range-start", placeholder: "entry 0%" },
          { label: "Range end",   token: "--sf-scroll-timeline-range-end",   placeholder: "cover 30%" },
        ] as r (r.token)}
          <div class="flex items-center gap-2">
            <div class="text-[10px] font-semibold text-slate-400 w-24 shrink-0">{r.label}</div>
            <input
              type="text"
              value={overrides[r.token] ?? ""}
              placeholder={r.placeholder}
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                v ? onSet(r.token, v) : onReset(r.token);
              }}
              class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
            {#if r.token in overrides}
              <button onclick={() => onReset(r.token)} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>
</div>
