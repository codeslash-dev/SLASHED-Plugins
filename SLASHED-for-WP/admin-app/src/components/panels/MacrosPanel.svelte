<script lang="ts">
  import SliderRow from '../inputs/SliderRow.svelte';

  let { overrides, onSet, onReset }: {
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
  } = $props();

  function num(name: string, fallback: number, strip?: string) {
    const raw = overrides[name];
    if (!raw) return fallback;
    const v = parseFloat(strip ? raw.replace(strip, "") : raw);
    return isNaN(v) ? fallback : v;
  }

  const ASPECT_PRESETS = [
    { label: "16 / 9", value: "16 / 9" },
    { label: "4 / 3",  value: "4 / 3" },
    { label: "3 / 2",  value: "3 / 2" },
    { label: "1 / 1",  value: "1 / 1" },
    { label: "21 / 9", value: "21 / 9" },
    { label: "9 / 16", value: "9 / 16" },
  ];

  const SCRIM_DIRECTIONS = [
    { label: "↑ top",        value: "to top" },
    { label: "↓ bottom",     value: "to bottom" },
    { label: "← left",       value: "to left" },
    { label: "→ right",      value: "to right" },
    { label: "↗ top-right",  value: "to top right" },
    { label: "↖ top-left",   value: "to top left" },
  ];

  // Prose spacing knobs. Defaults reference space tokens — the numbers below are
  // the approximate resolved rem values, used only as the slider's idle position.
  const PROSE_SPACE = [
    { label: "Heading gap",       token: "--sf-prose-heading-gap",       def: 0.75, max: 3 },
    { label: "List gap",          token: "--sf-prose-list-gap",          def: 0.5,  max: 2 },
    { label: "Block margin",      token: "--sf-prose-block-margin",      def: 1,    max: 4 },
    { label: "Media margin",      token: "--sf-prose-media-margin",      def: 1,    max: 4 },
    { label: "Figure margin",     token: "--sf-prose-figure-margin",     def: 1.5,  max: 4 },
    { label: "Blockquote padding",token: "--sf-prose-blockquote-padding",def: 1,    max: 3 },
    { label: "HR margin",         token: "--sf-prose-hr-margin",         def: 1.5,  max: 4 },
  ];

  let showFlow = $state(false);
  let showLineClamp = $state(false);
  let showAspect = $state(false);
  let showScrollShadow = $state(false);
  let showScrim = $state(false);
  let showProse = $state(false);
  let showContentIntrinsic = $state(false);

  let lineClamp   = $derived(num("--sf-line-clamp", 3));
  let flowSpace   = $derived(num("--sf-flow-space", 0.5, "rem"));
  let scrollSize  = $derived(num("--sf-scroll-shadow-size", 2, "rem"));
  let aspectVal   = $derived(overrides["--sf-aspect"] ?? "16 / 9");
  let scrimColor  = $derived(overrides["--sf-scrim-color"] ?? "oklch(0 0 0 / 0.55)");
  let scrimDir    = $derived(overrides["--sf-scrim-direction"] ?? "to top");
  let mediaRadius = $derived(num("--sf-prose-media-radius", 6, "px"));

  function proseVal(t: typeof PROSE_SPACE[0]): number {
    const raw = overrides[t.token];
    if (!raw) return t.def;
    const v = parseFloat(raw);
    return isNaN(v) ? t.def : v;
  }
</script>

<div class="p-4 space-y-6">

  <p class="text-[10px] text-slate-600 leading-relaxed">
    Tokens for the framework's utility macros — <span class="font-mono text-slate-400">.sf-prose</span>,
    <span class="font-mono text-slate-400">.sf-flow</span>, <span class="font-mono text-slate-400">.sf-line-clamp</span>,
    <span class="font-mono text-slate-400">.sf-aspect</span>, <span class="font-mono text-slate-400">.sf-scroll-shadow</span>
    and <span class="font-mono text-slate-400">.sf-scrim</span>.
  </p>

  <!-- FLOW -->
  <section class="space-y-3">
    <button
      onclick={() => { showFlow = !showFlow; }}
      aria-expanded={showFlow}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Flow rhythm</div>
      <span class="text-[10px] text-slate-500">{showFlow ? "▲" : "▼"}</span>
    </button>
    {#if showFlow}
      <SliderRow
        label="Flow space" value={flowSpace} min={0} max={4} step={0.0625} unit="rem"
        help="--sf-flow-space — vertical gap between adjacent children of .sf-flow"
        overridden={"--sf-flow-space" in overrides}
        onChange={(v) => onSet("--sf-flow-space", `${v}rem`)}
        onReset={() => onReset("--sf-flow-space")}
      />
      <div class="bg-white/4 rounded-xl border border-white/8 p-3" style={`display:flex;flex-direction:column;gap:${flowSpace}rem`}>
        {#each [0, 1, 2] as i (i)}
          <div class="h-2.5 rounded bg-indigo-500/40" style={`width:${90 - i * 12}%`}></div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- LINE CLAMP -->
  <section class="space-y-3">
    <button
      onclick={() => { showLineClamp = !showLineClamp; }}
      aria-expanded={showLineClamp}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Line clamp</div>
      <span class="text-[10px] text-slate-500">{showLineClamp ? "▲" : "▼"}</span>
    </button>
    {#if showLineClamp}
      <SliderRow
        label="Default lines" value={lineClamp} min={1} max={8} step={1}
        help="--sf-line-clamp — default line count for .sf-line-clamp (override per element)"
        overridden={"--sf-line-clamp" in overrides}
        onChange={(v) => onSet("--sf-line-clamp", String(v))}
        onReset={() => onReset("--sf-line-clamp")}
      />
      <div class="bg-white/4 rounded-xl border border-white/8 p-3">
        <p
          class="text-[11px] text-slate-300 leading-relaxed"
          style={`display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${lineClamp};overflow:hidden`}
        >
          SLASHED is a token-first CSS framework. This sample paragraph repeats so you
          can see exactly how many lines survive the clamp before the ellipsis kicks in.
          Drag the slider above and watch the visible line count change in real time.
          Extra filler text keeps the block taller than the clamp at every setting.
        </p>
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- ASPECT -->
  <section class="space-y-3">
    <button
      onclick={() => { showAspect = !showAspect; }}
      aria-expanded={showAspect}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aspect ratio</div>
      <span class="text-[10px] text-slate-500">{showAspect ? "▲" : "▼"}</span>
    </button>
    {#if showAspect}
      <p class="text-[9px] text-slate-600">--sf-aspect — default ratio for .sf-aspect / .sf-frame</p>
      <div class="grid grid-cols-3 gap-1.5">
        {#each ASPECT_PRESETS as p (p.value)}
          <button
            onclick={() => p.value === "16 / 9" ? onReset("--sf-aspect") : onSet("--sf-aspect", p.value)}
            class={`py-1.5 rounded-lg text-[10px] border transition-all cursor-pointer font-mono ${
              aspectVal.replace(/\s/g, "") === p.value.replace(/\s/g, "")
                ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >{p.label}</button>
        {/each}
      </div>
      <div class="bg-white/4 rounded-xl border border-white/8 p-3 flex justify-center">
        <div
          class="bg-indigo-500/30 border border-indigo-500/30 rounded-lg flex items-center justify-center text-[9px] font-mono text-indigo-200"
          style={`aspect-ratio:${aspectVal};max-height:120px;max-width:100%;width:auto;height:120px`}
        >{aspectVal}</div>
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

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
        label="Fade size" value={scrollSize} min={0} max={6} step={0.25} unit="rem"
        help="--sf-scroll-shadow-size — size of the edge fade mask on .sf-scroll-shadow / .sf-overflow-fade"
        overridden={"--sf-scroll-shadow-size" in overrides}
        onChange={(v) => onSet("--sf-scroll-shadow-size", `${v}rem`)}
        onReset={() => onReset("--sf-scroll-shadow-size")}
      />
      <div class="bg-white/4 rounded-xl border border-white/8 p-3">
        <div
          class="h-8 rounded bg-indigo-500/40"
          style={`mask:linear-gradient(to right, transparent, #000 ${scrollSize}rem, #000 calc(100% - ${scrollSize}rem), transparent)`}
        ></div>
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- SCRIM -->
  <section class="space-y-3">
    <button
      onclick={() => { showScrim = !showScrim; }}
      aria-expanded={showScrim}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scrim overlay</div>
      <span class="text-[10px] text-slate-500">{showScrim ? "▲" : "▼"}</span>
    </button>
    {#if showScrim}
      <p class="text-[9px] text-slate-600">--sf-scrim-color / --sf-scrim-direction — darkening gradient for .sf-scrim</p>
      <div class="flex items-center gap-2">
        <div class="text-[10px] font-semibold text-slate-400 w-20 shrink-0">Color</div>
        <input
          type="text"
          value={overrides["--sf-scrim-color"] ?? ""}
          placeholder="oklch(0 0 0 / 0.55)"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            v ? onSet("--sf-scrim-color", v) : onReset("--sf-scrim-color");
          }}
          class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-scrim-color" in overrides}
          <button onclick={() => onReset("--sf-scrim-color")} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
      <div>
        <div class="text-[10px] font-semibold text-slate-400 mb-1.5">Direction</div>
        <div class="grid grid-cols-3 gap-1">
          {#each SCRIM_DIRECTIONS as d (d.value)}
            <button
              onclick={() => d.value === "to top" ? onReset("--sf-scrim-direction") : onSet("--sf-scrim-direction", d.value)}
              class={`py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                scrimDir === d.value
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                  : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >{d.label}</button>
          {/each}
        </div>
      </div>
      <div class="relative h-24 rounded-xl border border-white/8 overflow-hidden flex items-end p-2"
        style="background:repeating-linear-gradient(45deg,#475569,#475569 8px,#334155 8px,#334155 16px)">
        <div class="absolute inset-0" style={`background:linear-gradient(${scrimDir}, ${scrimColor}, transparent)`}></div>
        <span class="relative text-[11px] font-bold text-white">Caption over scrim</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="text-[10px] font-semibold text-slate-400 w-20 shrink-0">Text shadow</div>
        <input
          type="text"
          value={overrides["--sf-scrim-text-shadow"] ?? ""}
          placeholder="0 1px 3px oklch(0 0 0 / 0.6)"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            v ? onSet("--sf-scrim-text-shadow", v) : onReset("--sf-scrim-text-shadow");
          }}
          class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-scrim-text-shadow" in overrides}
          <button onclick={() => onReset("--sf-scrim-text-shadow")} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- PROSE -->
  <section class="space-y-3">
    <button
      onclick={() => { showProse = !showProse; }}
      aria-expanded={showProse}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prose rhythm</div>
      <span class="text-[10px] text-slate-500">{showProse ? "▲" : "▼"}</span>
    </button>
    {#if showProse}
      <p class="text-[9px] text-slate-600">Spacing tokens for .sf-prose. Defaults track the space scale; sliders write rem overrides.</p>
      <div class="space-y-2">
        {#each PROSE_SPACE as t (t.token)}
          <SliderRow
            label={t.label} value={proseVal(t)} min={0} max={t.max} step={0.0625} unit="rem"
            help={t.token}
            overridden={t.token in overrides}
            onChange={(v) => onSet(t.token, `${v}rem`)}
            onReset={() => onReset(t.token)}
          />
        {/each}
        <SliderRow
          label="Media radius" value={mediaRadius} min={0} max={32} step={1} unit="px"
          help="--sf-prose-media-radius — corner radius on prose images/video"
          overridden={"--sf-prose-media-radius" in overrides}
          onChange={(v) => onSet("--sf-prose-media-radius", `${v}px`)}
          onReset={() => onReset("--sf-prose-media-radius")}
        />
        <div class="flex items-center gap-2 pt-1">
          <div class="text-[10px] font-semibold text-slate-400 w-20 shrink-0">Marker color</div>
          <input
            type="text"
            value={overrides["--sf-prose-marker-color"] ?? ""}
            placeholder="var(--sf-color-primary)"
            oninput={(e) => {
              const v = (e.target as HTMLInputElement).value.trim();
              v ? onSet("--sf-prose-marker-color", v) : onReset("--sf-prose-marker-color");
            }}
            class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
          {#if "--sf-prose-marker-color" in overrides}
            <button onclick={() => onReset("--sf-prose-marker-color")} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
          {/if}
        </div>
      </div>
    {/if}
  </section>

  <!-- CONTENT VISIBILITY -->
  <section class="space-y-3">
    <button
      onclick={() => { showContentIntrinsic = !showContentIntrinsic; }}
      aria-expanded={showContentIntrinsic}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Content visibility</div>
      <span class="text-[10px] text-slate-500">{showContentIntrinsic ? "▲" : "▼"}</span>
    </button>
    {#if showContentIntrinsic}
      <p class="text-[9px] text-slate-600 leading-relaxed">
        --sf-content-intrinsic-size — placeholder size used with <span class="font-mono text-slate-400">content-visibility: auto</span> to improve scroll performance on tall pages.
      </p>
      <div class="flex items-center gap-2">
        <div class="text-[10px] font-semibold text-slate-400 w-20 shrink-0">Intrinsic size</div>
        <input
          type="text"
          value={overrides["--sf-content-intrinsic-size"] ?? ""}
          placeholder="500px"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            v ? onSet("--sf-content-intrinsic-size", v) : onReset("--sf-content-intrinsic-size");
          }}
          class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-content-intrinsic-size" in overrides}
          <button onclick={() => onReset("--sf-content-intrinsic-size")} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
    {/if}
  </section>

  <div class="rounded-lg bg-white/3 border border-white/6 p-3">
    <p class="text-[10px] text-slate-500 leading-relaxed">
      <span class="text-slate-400 font-semibold">All tokens tab</span> — edit every prose, scrim and surface token directly.
    </p>
  </div>
</div>
