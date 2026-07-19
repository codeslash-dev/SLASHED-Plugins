<script lang="ts">
  import SliderRow from '../inputs/SliderRow.svelte';
  import ColorInput from '../inputs/ColorInput.svelte';
  import AspectRatioInput from '../inputs/AspectRatioInput.svelte';
  import RawTokenRow from '../inputs/RawTokenRow.svelte';
  import Section from '../inputs/Section.svelte';
  import { SPACE_SCALE, RADIUS_SCALE } from '../../lib/variableScales';

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

  // Enumerable presets for the .sf-surface-bg named-background macro. The first
  // value in each list is the token default, so clicking it resets the override.
  const SURFACE_BG_SIZE = ["cover", "contain", "auto", "100% 100%"];
  const SURFACE_BG_POSITION = ["center", "top", "bottom", "left", "right", "top left"];
  const SURFACE_BG_REPEAT = ["no-repeat", "repeat", "repeat-x", "repeat-y", "space", "round"];
  const SURFACE_BG_ATTACHMENT = ["scroll", "fixed", "local"];

  // Free-form surface-bg tokens (color/image/overlay/animation) — plain text
  // inputs, since their values are arbitrary CSS (urls, gradients, keyframes).
  const SURFACE_BG_TEXT = [
    { label: "Color",     token: "--sf-surface-bg-color",     placeholder: "transparent" },
    { label: "Image",     token: "--sf-surface-bg-image",     placeholder: 'url("/hero.avif")' },
    { label: "Overlay",   token: "--sf-surface-bg-overlay",   placeholder: "var(--sf-scrim-gradient)" },
    { label: "Animation", token: "--sf-surface-bg-animation", placeholder: "sf-pan 40s linear infinite" },
  ];

  // Enumerable surface-bg tokens rendered as preset button grids.
  const SURFACE_BG_ENUM = [
    { label: "Size",       token: "--sf-surface-bg-size",       opts: SURFACE_BG_SIZE },
    { label: "Position",   token: "--sf-surface-bg-position",   opts: SURFACE_BG_POSITION },
    { label: "Repeat",     token: "--sf-surface-bg-repeat",     opts: SURFACE_BG_REPEAT },
    { label: "Attachment", token: "--sf-surface-bg-attachment", opts: SURFACE_BG_ATTACHMENT },
  ];

  // Prose spacing knobs. Defaults reference space tokens — the numbers below are
  // the approximate resolved rem values, used only as the slider's idle position.
  const PROSE_SPACE = [
    { label: "Heading gap",       token: "--sf-prose-heading-gap",       def: 0.75, max: 3, raw: "var(--sf-space-s)" },
    { label: "List gap",          token: "--sf-prose-list-gap",          def: 0.5,  max: 2, raw: "var(--sf-space-xs)" },
    { label: "Block margin",      token: "--sf-prose-block-margin",      def: 1,    max: 4, raw: "var(--sf-space-m)" },
    { label: "Media margin",      token: "--sf-prose-media-margin",      def: 1,    max: 4, raw: "var(--sf-space-m)" },
    { label: "Figure margin",     token: "--sf-prose-figure-margin",     def: 1.5,  max: 4, raw: "var(--sf-space-l)" },
    { label: "Blockquote padding",token: "--sf-prose-blockquote-padding",def: 1,    max: 3, raw: "var(--sf-space-m)" },
    { label: "HR margin",         token: "--sf-prose-hr-margin",         def: 1.5,  max: 4, raw: "var(--sf-space-l)" },
  ];

  let showFlow = $state(false);
  let showLineClamp = $state(false);
  let showAspect = $state(false);
  let showScrollShadow = $state(false);
  let showScrim = $state(false);
  let showProse = $state(false);
  let showContentIntrinsic = $state(false);
  let showSurfaceBg = $state(false);

  let lineClamp   = $derived(num("--sf-line-clamp", 3));
  let flowSpace   = $derived(num("--sf-flow-space", 0.5, "rem"));
  let scrollSize  = $derived(num("--sf-scroll-shadow-size", 2, "rem"));
  let aspectVal   = $derived(overrides["--sf-aspect"] ?? "16 / 9");
  let scrimColor  = $derived(overrides["--sf-scrim-color"] ?? "oklch(0 0 0 / 0.55)");
  let scrimDir    = $derived(overrides["--sf-scrim-direction"] ?? "to top");
  let mediaRadius = $derived(num("--sf-prose-media-radius", 6, "px"));

  // Live preview composition for .sf-surface-bg — mirrors the macro's layering
  // (overlay above image) so the swatch reflects what ships.
  let surfaceBgImage    = $derived(overrides["--sf-surface-bg-image"] ?? "none");
  let surfaceBgOverlay  = $derived(overrides["--sf-surface-bg-overlay"] ?? "none");
  let surfaceBgColor    = $derived(overrides["--sf-surface-bg-color"] ?? "transparent");
  let surfaceBgSize     = $derived(overrides["--sf-surface-bg-size"] ?? "cover");
  let surfaceBgPosition = $derived(overrides["--sf-surface-bg-position"] ?? "center");
  let surfaceBgRepeat     = $derived(overrides["--sf-surface-bg-repeat"] ?? "no-repeat");
  let surfaceBgAttachment = $derived(overrides["--sf-surface-bg-attachment"] ?? "scroll");
  let surfaceBgAnimation  = $derived(overrides["--sf-surface-bg-animation"] ?? "none");

  function proseVal(t: typeof PROSE_SPACE[0]): number {
    const raw = overrides[t.token];
    if (!raw) return t.def;
    const v = parseFloat(raw);
    return isNaN(v) ? t.def : v;
  }
</script>

<div class="p-4 space-y-6">

  <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
    Tokens for the framework's utility macros — <span class="font-mono text-slate-600 dark:text-slate-400">.sf-prose</span>,
    <span class="font-mono text-slate-600 dark:text-slate-400">.sf-flow</span>, <span class="font-mono text-slate-600 dark:text-slate-400">.sf-line-clamp</span>,
    <span class="font-mono text-slate-600 dark:text-slate-400">.sf-aspect</span>, <span class="font-mono text-slate-600 dark:text-slate-400">.sf-scroll-shadow</span>
    and <span class="font-mono text-slate-600 dark:text-slate-400">.sf-scrim</span>.
  </p>

  <!-- FLOW -->
  <Section title="Flow rhythm" bind:open={showFlow}>
      <SliderRow
        label="Flow space" value={flowSpace} min={0} max={4} step={0.0625} unit="rem"
        help="--sf-flow-space — vertical gap between adjacent children of .sf-flow"
        overridden={"--sf-flow-space" in overrides}
        onChange={(v) => onSet("--sf-flow-space", `${v}rem`)}
        onReset={() => onReset("--sf-flow-space")}
        rawDefault="var(--sf-content-gap)"
        variableOptions={SPACE_SCALE}
        currentRaw={overrides["--sf-flow-space"]}
        onRawSet={(v) => onSet("--sf-flow-space", v)}
      />
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3" style={`display:flex;flex-direction:column;gap:var(--sf-flow-space, 0.5rem)`}>
        {#each [0, 1, 2] as i (i)}
          <div class="h-2.5 rounded bg-indigo-500/40" style={`width:${90 - i * 12}%`}></div>
        {/each}
      </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- LINE CLAMP -->
  <Section title="Line clamp" bind:open={showLineClamp}>
      <SliderRow
        label="Default lines" value={lineClamp} min={1} max={8} step={1}
        help="--sf-line-clamp — default line count for .sf-line-clamp (override per element)"
        overridden={"--sf-line-clamp" in overrides}
        onChange={(v) => onSet("--sf-line-clamp", String(v))}
        onReset={() => onReset("--sf-line-clamp")}
      />
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3">
        <p
          class="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed"
          style={`display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:${lineClamp};overflow:hidden`}
        >
          SLASHED is a token-first CSS framework. This sample paragraph repeats so you
          can see exactly how many lines survive the clamp before the ellipsis kicks in.
          Drag the slider above and watch the visible line count change in real time.
          Extra filler text keeps the block taller than the clamp at every setting.
        </p>
      </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- ASPECT -->
  <Section title="Aspect ratio" bind:open={showAspect}>
      <p class="text-[9px] text-slate-400 dark:text-slate-600">--sf-aspect — default ratio for .sf-aspect / .sf-frame</p>
      <AspectRatioInput
        token="--sf-aspect" value={aspectVal} defaultValue="16 / 9"
        presets={ASPECT_PRESETS} columns={3} showPreview
        {onSet} {onReset}
      />
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- SCROLL SHADOW -->
  <Section title="Scroll shadow" bind:open={showScrollShadow}>
      <SliderRow
        label="Fade size" value={scrollSize} min={0} max={6} step={0.25} unit="rem"
        help="--sf-scroll-shadow-size — size of the edge fade mask on .sf-scroll-shadow / .sf-overflow-fade"
        overridden={"--sf-scroll-shadow-size" in overrides}
        onChange={(v) => onSet("--sf-scroll-shadow-size", `${v}rem`)}
        onReset={() => onReset("--sf-scroll-shadow-size")}
      />
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3">
        <div
          class="h-8 rounded bg-indigo-500/40"
          style={`mask:linear-gradient(to right, transparent, #000 ${scrollSize}rem, #000 calc(100% - ${scrollSize}rem), transparent)`}
        ></div>
      </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- SCRIM -->
  <Section title="Scrim overlay" bind:open={showScrim}>
      <p class="text-[9px] text-slate-400 dark:text-slate-600">--sf-scrim-color / --sf-scrim-direction — darkening gradient for .sf-scrim</p>
      <div class="flex items-center gap-2">
        <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-20 shrink-0">Color</div>
        <div class="flex-1 min-w-0">
          <ColorInput
            token="--sf-scrim-color"
            value={overrides["--sf-scrim-color"] ?? ""}
            placeholder="oklch(0 0 0 / 0.55)"
            isOverridden={"--sf-scrim-color" in overrides}
            onSet={(v) => onSet("--sf-scrim-color", v)}
            onReset={() => onReset("--sf-scrim-color")}
          />
        </div>
      </div>
      <div>
        <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Direction</div>
        <div class="grid grid-cols-3 gap-1">
          {#each SCRIM_DIRECTIONS as d (d.value)}
            <button
              onclick={() => d.value === "to top" ? onReset("--sf-scrim-direction") : onSet("--sf-scrim-direction", d.value)}
              class={`py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                scrimDir === d.value
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                  : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >{d.label}</button>
          {/each}
        </div>
      </div>
      <div class="relative h-24 rounded-xl border border-black/8 dark:border-white/8 overflow-hidden flex items-end p-2"
        style="background:repeating-linear-gradient(45deg,#475569,#475569 8px,#334155 8px,#334155 16px)">
        <div class="absolute inset-0" style={`background:linear-gradient(var(--sf-scrim-direction, to top), var(--sf-scrim-color, oklch(0 0 0 / 0.55)), transparent)`}></div>
        <span class="relative text-[11px] font-bold text-white">Caption over scrim</span>
      </div>
      <RawTokenRow
        label="Text shadow"
        value={overrides["--sf-scrim-text-shadow"] ?? ""}
        placeholder="0 1px 3px oklch(0 0 0 / 0.6)"
        overridden={"--sf-scrim-text-shadow" in overrides}
        onSet={(v) => onSet("--sf-scrim-text-shadow", v)}
        onReset={() => onReset("--sf-scrim-text-shadow")}
      />
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- PROSE -->
  <Section title="Prose rhythm" bind:open={showProse}>
      <p class="text-[9px] text-slate-400 dark:text-slate-600">Spacing tokens for .sf-prose. Defaults track the space scale; sliders write rem overrides.</p>
      <div class="space-y-2">
        {#each PROSE_SPACE as t (t.token)}
          <SliderRow
            label={t.label} value={proseVal(t)} min={0} max={t.max} step={0.0625} unit="rem"
            help={t.token}
            overridden={t.token in overrides}
            onChange={(v) => onSet(t.token, `${v}rem`)}
            onReset={() => onReset(t.token)}
            rawDefault={t.raw}
            variableOptions={SPACE_SCALE}
            currentRaw={overrides[t.token]}
            onRawSet={(v) => onSet(t.token, v)}
          />
        {/each}
        <SliderRow
          label="Media radius" value={mediaRadius} min={0} max={32} step={1} unit="px"
          help="--sf-prose-media-radius — corner radius on prose images/video"
          overridden={"--sf-prose-media-radius" in overrides}
          onChange={(v) => onSet("--sf-prose-media-radius", `${v}px`)}
          onReset={() => onReset("--sf-prose-media-radius")}
          rawDefault="var(--sf-radius-m)"
          variableOptions={RADIUS_SCALE}
          currentRaw={overrides["--sf-prose-media-radius"]}
          onRawSet={(v) => onSet("--sf-prose-media-radius", v)}
        />
        <div class="flex items-center gap-2 pt-1">
          <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-20 shrink-0">Marker color</div>
          <div class="flex-1 min-w-0">
            <ColorInput
              token="--sf-prose-marker-color"
              value={overrides["--sf-prose-marker-color"] ?? ""}
              placeholder="var(--sf-color-primary)"
              isOverridden={"--sf-prose-marker-color" in overrides}
              onSet={(v) => onSet("--sf-prose-marker-color", v)}
              onReset={() => onReset("--sf-prose-marker-color")}
            />
          </div>
        </div>
      </div>
  </Section>

  <!-- CONTENT VISIBILITY -->
  <Section title="Content visibility" bind:open={showContentIntrinsic}>
      <p class="text-[9px] text-slate-400 dark:text-slate-600 leading-relaxed">
        --sf-content-intrinsic-size — placeholder size used with <span class="font-mono text-slate-600 dark:text-slate-400">content-visibility: auto</span> to improve scroll performance on tall pages.
      </p>
      <div class="flex items-center gap-2">
        <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-20 shrink-0">Intrinsic size</div>
        <input
          type="text"
          value={overrides["--sf-content-intrinsic-size"] ?? ""}
          placeholder="500px"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            v ? onSet("--sf-content-intrinsic-size", v) : onReset("--sf-content-intrinsic-size");
          }}
          class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-content-intrinsic-size" in overrides}
          <button onclick={() => onReset("--sf-content-intrinsic-size")} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- BACKGROUND SURFACE -->
  <Section title="Background surface" bind:open={showSurfaceBg}>
      <p class="text-[9px] text-slate-400 dark:text-slate-600 leading-relaxed">
        --sf-surface-bg-* — input set composed by the <span class="font-mono text-slate-600 dark:text-slate-400">.sf-surface-bg</span>
        macro into a single reusable background (color, image, overlay, sizing and animation).
      </p>

      {#each SURFACE_BG_TEXT as t (t.token)}
        <div class="flex items-center gap-2">
          <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-20 shrink-0">{t.label}</div>
          {#if t.token === "--sf-surface-bg-color"}
            <div class="flex-1 min-w-0">
              <ColorInput
                token={t.token}
                value={overrides[t.token] ?? ""}
                placeholder={t.placeholder}
                isOverridden={t.token in overrides}
                onSet={(v) => onSet(t.token, v)}
                onReset={() => onReset(t.token)}
              />
            </div>
          {:else}
            <div class="flex-1 min-w-0">
              <RawTokenRow
                value={overrides[t.token] ?? ""} placeholder={t.placeholder}
                overridden={t.token in overrides}
                onSet={(v) => onSet(t.token, v)}
                onReset={() => onReset(t.token)}
              />
            </div>
          {/if}
        </div>
      {/each}

      {#each SURFACE_BG_ENUM as g (g.token)}
        <div>
          <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">{g.label}</div>
          <div class="grid grid-cols-3 gap-1">
            {#each g.opts as opt (opt)}
              <button
                onclick={() => opt === g.opts[0] ? onReset(g.token) : onSet(g.token, opt)}
                class={`py-1 rounded-lg text-[10px] border transition-all cursor-pointer font-mono ${
                  (overrides[g.token] ?? g.opts[0]) === opt
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                    : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >{opt}</button>
            {/each}
          </div>
        </div>
      {/each}

      <div
        class="h-24 rounded-xl border border-black/8 dark:border-white/8 overflow-hidden flex items-end p-2"
        style={`background-color:var(--sf-surface-bg-color, transparent);background-image:var(--sf-surface-bg-overlay, none), var(--sf-surface-bg-image, none);background-size:var(--sf-surface-bg-size, cover);background-position:var(--sf-surface-bg-position, center);background-repeat:var(--sf-surface-bg-repeat, no-repeat);background-attachment:var(--sf-surface-bg-attachment, scroll);animation:var(--sf-surface-bg-animation, none)`}
      >
        <span class="text-[11px] font-bold text-white mix-blend-difference">.sf-surface-bg preview</span>
      </div>
  </Section>

  <div class="rounded-lg bg-black/3 dark:bg-white/3 border border-black/6 dark:border-white/6 p-3">
    <p class="text-[10px] text-slate-500 leading-relaxed">
      <span class="text-slate-600 dark:text-slate-400 font-semibold">All tokens tab</span> — edit every prose, scrim and surface token directly.
    </p>
  </div>
</div>
