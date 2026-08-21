<script lang="ts">
  import SliderRow from '../inputs/SliderRow.svelte';
  import ColorInput from '../inputs/ColorInput.svelte';
  import Section from '../inputs/Section.svelte';

  let { overrides, onSet, onReset, onBulkChange }: {
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
    onBulkChange: (patch: Record<string, string | null>) => void;
  } = $props();

  const Z_INDEX_STEPS = [
    { label: "Below",     token: "--sf-z-below",     note: "Behind content (e.g. decorative BG)", def: -1 },
    { label: "Raised",    token: "--sf-z-raised",    note: "Slightly above flow",                 def: 1 },
    { label: "Sticky",    token: "--sf-z-sticky",    note: "Sticky headers, toolbars",            def: 1000 },
    { label: "Fixed",     token: "--sf-z-fixed",     note: "Fixed UI chrome",                     def: 1010 },
    { label: "Dropdown",  token: "--sf-z-dropdown",  note: "Dropdowns, popovers",                 def: 1020 },
    { label: "Overlay",   token: "--sf-z-overlay",   note: "Modals, drawers backdrop",            def: 1030 },
    { label: "Modal",     token: "--sf-z-modal",     note: "Modal dialogs",                       def: 1040 },
    { label: "Toast",     token: "--sf-z-toast",     note: "Notifications",                       def: 1050 },
    { label: "Tooltip",   token: "--sf-z-tooltip",   note: "Inline tooltips",                     def: 1060 },
  ];

  const SIZE_TOKENS = [
    { label: "XS", token: "--sf-size-xs", default: 1.5 },
    { label: "S",  token: "--sf-size-s",  default: 2   },
    { label: "M",  token: "--sf-size-m",  default: 2.5 },
    { label: "L",  token: "--sf-size-l",  default: 3   },
    { label: "XL", token: "--sf-size-xl", default: 3.5 },
  ];

  function parseNum(val: string | undefined, fallback: number, strip?: string): number {
    if (!val) return fallback;
    const v = parseFloat(strip ? val.replace(strip, "") : val);
    return isNaN(v) ? fallback : v;
  }

  let zBaseOffset = $derived(parseNum(overrides["--sf-z-base"], 0));
  let caretColor = $derived(overrides["--sf-color-caret"] ?? "");
  let underlineOffset = $derived(parseNum(overrides["--sf-link-underline-offset"]?.replace("em",""), 0.15));
  let underlineThickness = $derived(overrides["--sf-link-underline-thickness"] ?? "auto");

  let showZIndex = $state(false);
  let showTextSelection = $state(false);
  let showComponentSizes = $state(false);
  let showCaretLinks = $state(false);
  let showIconSizes = $state(false);
  let showObjectFit = $state(false);
  let showSafeArea = $state(false);
  let showFieldMarker = $state(false);

  function getSizeValue(t: typeof SIZE_TOKENS[0]): number {
    return parseNum(overrides[t.token]?.replace("rem",""), t.default);
  }

  const ICON_STEPS = ["xs", "s", "m", "l", "xl", "2xl"];

  // A deliberately landscape (2:1) sample with a centered ring and a full-bleed
  // border, so object-fit differences are unmistakable: cover crops the sides,
  // contain letterboxes, fill distorts the circle, none overflows at native px.
  const OBJECT_FIT_IMG = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='60'><rect width='120' height='60' fill='#6366f1'/><circle cx='60' cy='30' r='18' fill='none' stroke='#ffffff' stroke-width='4'/><rect x='3' y='3' width='114' height='54' fill='none' stroke='#ffffff' stroke-width='3'/></svg>`,
  )}`;

  // Layering ladder for the preview: ordered by each rung's *current* value
  // (override or default), highest first, so reordering the numbers reorders
  // the visual stack instead of showing a fixed hierarchy.
  let zLadder = $derived(
    Z_INDEX_STEPS
      .map((z) => ({ ...z, val: parseNum(overrides[z.token], z.def) }))
      .sort((a, b) => b.val - a.val),
  );
</script>

<div class="p-4 space-y-6">

  <!-- Touch target moved to the Accessibility panel; focus ring moved to
       Accessibility; both now classify there so badge/Reset match. -->

  <!-- Overview of the low-level system areas this panel groups. -->
  <div class="rounded-lg bg-black/3 dark:bg-white/3 border border-black/6 dark:border-white/6 p-3">
    <p class="text-[10px] text-slate-500 leading-relaxed">
      Low-level system tokens, grouped by area:
      <span class="font-semibold text-slate-600 dark:text-slate-400">Layering</span>,
      <span class="font-semibold text-slate-600 dark:text-slate-400">Text &amp; selection</span>,
      <span class="font-semibold text-slate-600 dark:text-slate-400">Sizing</span> &amp;
      <span class="font-semibold text-slate-600 dark:text-slate-400">Icons</span>,
      <span class="font-semibold text-slate-600 dark:text-slate-400">Media</span>, and
      <span class="font-semibold text-slate-600 dark:text-slate-400">device / forms</span>.
    </p>
  </div>

  <!-- LAYERING -->
  <div class="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Layering</div>

  <!-- Z-INDEX -->
  <Section title="Z-index layers" bind:open={showZIndex}>
      <SliderRow
        label="Base" value={zBaseOffset} min={0} max={1000} step={10}
        help="--sf-z-base — base local-stacking rung (default 0), consumed by the .sf-z-base utility. It is NOT added to the other rungs: every ladder step below is an independent literal."
        overridden={"--sf-z-base" in overrides}
        onChange={(v) => onSet("--sf-z-base", String(v))}
        onReset={() => onReset("--sf-z-base")}
      />
      <div class="space-y-2">
        {#each Z_INDEX_STEPS as z (z.token)}
          <SliderRow
            label={z.label} value={parseNum(overrides[z.token], z.def)} min={-1} max={1100} step={1}
            help={`${z.token} — ${z.note}`}
            overridden={z.token in overrides}
            onChange={(v) => onSet(z.token, String(v))}
            onReset={() => onReset(z.token)}
          />
        {/each}
      </div>

      <!-- Layering preview — a static stack showing the rung order (higher
           token = painted on top). The numbers set precedence; this shows what
           that precedence means. -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3">
        <div class="text-[9px] text-slate-400 dark:text-slate-600 mb-2 leading-snug">Higher rungs paint above lower ones.</div>
        <div class="relative h-32">
          {#each zLadder as z, i (z.token)}
            <div
              class="absolute flex items-center gap-2 px-2 py-1 rounded-md border border-indigo-500/30 bg-indigo-500/[0.12] shadow-sm"
              style={`top:${i * 11}px; left:${i * 9}px; right:0; z-index:${zLadder.length - i}`}
            >
              <span class="text-[9px] font-semibold text-slate-700 dark:text-slate-300">{z.label}</span>
              <span class="text-[8px] font-mono text-slate-400 dark:text-slate-600 ml-auto">{z.val}</span>
            </div>
          {/each}
        </div>
      </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <div class="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Text &amp; selection</div>

  <!-- SELECTION -->
  <Section title="Text selection" bind:open={showTextSelection}>
      <div class="space-y-2">
        <div>
          <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Selection background</div>
          <ColorInput
            token="--sf-color-selection-bg"
            value={overrides["--sf-color-selection-bg"] ?? ""}
            placeholder="default"
            isOverridden={"--sf-color-selection-bg" in overrides}
            onSet={(v) => onSet("--sf-color-selection-bg", v)}
            onReset={() => onReset("--sf-color-selection-bg")}
          />
        </div>
        <div>
          <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Selection text color</div>
          <ColorInput
            token="--sf-color-selection-text"
            value={overrides["--sf-color-selection-text"] ?? ""}
            placeholder="default"
            isOverridden={"--sf-color-selection-text" in overrides}
            onSet={(v) => onSet("--sf-color-selection-text", v)}
            onReset={() => onReset("--sf-color-selection-text")}
          />
        </div>
        <!-- Selection preview -->
        <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3">
          <p
            class="text-[11px] text-slate-800 dark:text-slate-200 select-all"
            style={`--sf-color-selection-bg: ${overrides["--sf-color-selection-bg"] ?? "#6366f1"}; --sf-color-selection-text: ${overrides["--sf-color-selection-text"] ?? "#ffffff"}`}
          >
            Select this text to preview the selection color.
          </p>
        </div>

        <div class="h-px bg-black/6 dark:bg-white/6 my-1"></div>

        <p class="text-[9px] text-slate-400 dark:text-slate-600">
          <span class="font-mono text-slate-600 dark:text-slate-400">.sf-selection--alt</span> — alternate
          treatment for surfaces that invert colors relative to the page (e.g. a dark card on a light page).
        </p>
        <div>
          <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Alt selection background</div>
          <ColorInput
            token="--sf-color-selection-bg--alt"
            value={overrides["--sf-color-selection-bg--alt"] ?? ""}
            placeholder="default"
            isOverridden={"--sf-color-selection-bg--alt" in overrides}
            onSet={(v) => onSet("--sf-color-selection-bg--alt", v)}
            onReset={() => onReset("--sf-color-selection-bg--alt")}
          />
        </div>
        <div>
          <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Alt selection text color</div>
          <ColorInput
            token="--sf-color-selection-text--alt"
            value={overrides["--sf-color-selection-text--alt"] ?? ""}
            placeholder="default"
            isOverridden={"--sf-color-selection-text--alt" in overrides}
            onSet={(v) => onSet("--sf-color-selection-text--alt", v)}
            onReset={() => onReset("--sf-color-selection-text--alt")}
          />
        </div>
        <!-- Alt selection preview -->
        <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3">
          <p
            class="text-[11px] text-slate-800 dark:text-slate-200 select-all"
            style={`--sf-color-selection-bg: ${overrides["--sf-color-selection-bg--alt"] ?? "#4338ca"}; --sf-color-selection-text: ${overrides["--sf-color-selection-text--alt"] ?? "#e0e7ff"}`}
          >
            Select this text to preview the alt selection color.
          </p>
        </div>
      </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <div class="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Sizing</div>

  <!-- COMPONENT SIZES -->
  <Section title="Component size scale" bind:open={showComponentSizes}>
      <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
        Controls the height / tap-target of all sized components (buttons, inputs, badges).
      </p>
      <div class="space-y-2">
        {#each SIZE_TOKENS as s (s.token)}
          {@const val = getSizeValue(s)}
          <SliderRow
            label={s.label} value={val} min={1} max={5} step={0.05} unit="rem"
            help={`${s.token} — component size step ${s.label}`}
            overridden={s.token in overrides}
            onChange={(v) => onSet(s.token, `${v}rem`)}
            onReset={() => onReset(s.token)}
          />
        {/each}
      </div>
      <!-- Visual preview -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3 flex items-end gap-2">
        {#each SIZE_TOKENS as s (s.token)}
          {@const val = getSizeValue(s)}
          {@const maxSize = Math.max(...SIZE_TOKENS.map((x) => getSizeValue(x)), 0.001)}
          <div class="flex flex-col items-center gap-1 flex-1">
            <div
              class="w-full bg-indigo-500/30 border border-indigo-500/30 rounded flex items-center justify-center"
              style={`height: ${(val / maxSize) * 72}px`}
            ></div>
            <span class="text-[8px] font-mono text-slate-400 dark:text-slate-600">{s.label}</span>
          </div>
        {/each}
      </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <div class="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Links &amp; caret</div>

  <!-- CARET & LINKS -->
  <Section title="Caret &amp; links" bind:open={showCaretLinks}>
      <div>
        <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Caret color</div>
        <ColorInput
          token="--sf-color-caret"
          value={caretColor}
          placeholder="default (action color)"
          isOverridden={"--sf-color-caret" in overrides}
          onSet={(v) => onSet("--sf-color-caret", v)}
          onReset={() => onReset("--sf-color-caret")}
        />
      </div>
      <SliderRow
        label="Underline offset" value={underlineOffset} min={0} max={0.5} step={0.01} unit="em"
        help="--sf-link-underline-offset — gap between text baseline and underline"
        overridden={"--sf-link-underline-offset" in overrides}
        onChange={(v) => onSet("--sf-link-underline-offset", `${v}em`)}
        onReset={() => onReset("--sf-link-underline-offset")}
      />
      <div class="group">
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Underline thickness</span>
          {#if "--sf-link-underline-thickness" in overrides}
            <button onclick={() => onReset("--sf-link-underline-thickness")} class="text-[9px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer ">reset</button>
          {/if}
        </div>
        <div class="flex gap-1">
          {#each [["auto", "auto"], ["1px", "1px"], ["2px", "2px"], ["3px", "3px"]] as [label, val] (val)}
            <button
              onclick={() => val === "auto" ? onReset("--sf-link-underline-thickness") : onSet("--sf-link-underline-thickness", val)}
              class={`flex-1 py-1.5 rounded-lg text-[10px] border transition-all cursor-pointer ${
                underlineThickness === val
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                  : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >{label}</button>
          {/each}
        </div>
      </div>
      <!-- Live sample: caret (type in the field) + underlined link -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3 space-y-2">
        <input
          type="text"
          placeholder="Click and type to see the caret…"
          style={`caret-color:${caretColor || "#6366f1"}`}
          class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-2 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <p class="text-[11px] text-slate-700 dark:text-slate-300">
          A <a
            href="#sample-link"
            onclick={(e) => e.preventDefault()}
            class="text-indigo-700 dark:text-indigo-300"
            style={`text-decoration:underline;text-underline-offset:${underlineOffset}em;text-decoration-thickness:${underlineThickness}`}
          >sample link</a> with the current underline settings.
        </p>
      </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <div class="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Icons</div>

  <!-- ICON SIZES -->
  <Section title="Icon sizes" bind:open={showIconSizes}>
      <p class="text-[10px] text-slate-400 dark:text-slate-600 leading-relaxed">
        Icon scale tokens used by <span class="font-mono text-slate-600 dark:text-slate-400">.sf-icon--*</span> utilities. Values are in <span class="font-mono text-slate-600 dark:text-slate-400">em</span> units relative to surrounding text.
      </p>
      <div class="space-y-1.5">
        {#each [
          { label: "xs",  token: "--sf-icon-xs",  def: 0.875 },
          { label: "s",   token: "--sf-icon-s",   def: 1     },
          { label: "m",   token: "--sf-icon-m",   def: 1.5   },
          { label: "l",   token: "--sf-icon-l",   def: 2     },
          { label: "xl",  token: "--sf-icon-xl",  def: 3     },
          { label: "2xl", token: "--sf-icon-2xl", def: 4     },
        ] as ic (ic.token)}
          <SliderRow
            label={ic.label} value={parseNum(overrides[ic.token]?.replace("em",""), ic.def)} min={0.5} max={6} step={0.125} unit="em"
            overridden={ic.token in overrides}
            onChange={(v) => onSet(ic.token, `${v}em`)}
            onReset={() => onReset(ic.token)}
          />
        {/each}
      </div>
      <SliderRow
        label="Box padding" value={parseNum(overrides["--sf-icon-box-pad"]?.replace("em",""), 0.5)} min={0} max={2} step={0.125} unit="em"
        help="--sf-icon-box-pad — padding around icon when using .sf-icon--boxed"
        overridden={"--sf-icon-box-pad" in overrides}
        onChange={(v) => onSet("--sf-icon-box-pad", `${v}em`)}
        onReset={() => onReset("--sf-icon-box-pad")}
      />

      <!-- Icon-size preview — the same glyph at every step (sized in em, so the
           box is pinned to 16px text to make the em scale concrete). -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-4 flex items-end justify-center gap-3 flex-wrap" style="font-size:16px">
        {#each ICON_STEPS as s (s)}
          <div class="flex flex-col items-center gap-1">
            <svg viewBox="0 0 24 24" aria-hidden="true" class="text-indigo-500" style={`width:var(--sf-icon-${s});height:var(--sf-icon-${s})`}>
              <path fill="currentColor" d="M12 2l2.9 6.3 6.9.6-5.2 4.5 1.6 6.7L12 17.3 5.8 20.6l1.6-6.7L2.2 8.9l6.9-.6z" />
            </svg>
            <span class="text-[8px] font-mono text-slate-400 dark:text-slate-600">{s}</span>
          </div>
        {/each}
      </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <div class="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Media</div>

  <!-- OBJECT FIT / POSITION -->
  <Section title="Object fit" bind:open={showObjectFit}>
      <p class="text-[9px] text-slate-400 dark:text-slate-600">Default values for <span class="font-mono text-slate-600 dark:text-slate-400">.sf-media</span> images and replaced elements.</p>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">Fit</span>
        <div class="flex gap-1 flex-1">
          {#each ["cover","contain","fill","none"] as v (v)}
            {@const cur = overrides["--sf-object-fit"] ?? "cover"}
            <button
              onclick={() => v === "cover" ? onReset("--sf-object-fit") : onSet("--sf-object-fit", v)}
              class={`flex-1 py-1.5 rounded-lg text-[9px] border transition-all cursor-pointer ${cur === v ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200" : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"}`}
            >{v}</button>
          {/each}
        </div>
        {#if "--sf-object-fit" in overrides}
          <button onclick={() => onReset("--sf-object-fit")} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer">reset</button>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">Position</span>
        <input
          type="text"
          value={overrides["--sf-object-position"] ?? ""}
          placeholder="50% 50%"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            v ? onSet("--sf-object-position", v) : onReset("--sf-object-position");
          }}
          class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-object-position" in overrides}
          <button onclick={() => onReset("--sf-object-position")} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>

      <!-- Object-fit preview — a landscape sample forced into a taller box, so
           the current fit visibly crops / letterboxes / stretches / overflows. -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3 flex flex-col items-center gap-1.5">
        <div class="w-24 h-20 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 bg-black/10 dark:bg-white/5">
          <img
            src={OBJECT_FIT_IMG}
            alt="Object-fit sample"
            class="w-full h-full block"
            style={`object-fit:var(--sf-object-fit, cover);object-position:var(--sf-object-position, 50% 50%)`}
          />
        </div>
        <div class="text-[8px] font-mono text-slate-400 dark:text-slate-600">
          object-fit: {overrides["--sf-object-fit"] ?? "cover"}
        </div>
      </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <div class="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Device &amp; forms</div>

  <!-- SAFE AREA INSETS -->
  <Section title="Safe area insets" bind:open={showSafeArea}>
      <p class="text-[9px] text-slate-400 dark:text-slate-600 leading-relaxed">
        Default to the device's <span class="font-mono text-slate-600 dark:text-slate-400">env(safe-area-inset-*)</span>. Override only if you need fixed padding regardless of notch/home-indicator.
      </p>
      <div class="space-y-1.5">
        {#each [
          { label: "Top",    token: "--sf-safe-top",    placeholder: "env(safe-area-inset-top, 0px)" },
          { label: "Right",  token: "--sf-safe-right",  placeholder: "env(safe-area-inset-right, 0px)" },
          { label: "Bottom", token: "--sf-safe-bottom", placeholder: "env(safe-area-inset-bottom, 0px)" },
          { label: "Left",   token: "--sf-safe-left",   placeholder: "env(safe-area-inset-left, 0px)" },
        ] as row (row.token)}
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-14 shrink-0">{row.label}</span>
            <input
              type="text"
              value={overrides[row.token] ?? ""}
              placeholder={row.placeholder}
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                v ? onSet(row.token, v) : onReset(row.token);
              }}
              class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
            {#if row.token in overrides}
              <button onclick={() => onReset(row.token)} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
            {/if}
          </div>
        {/each}
      </div>
      <p class="text-[9px] text-slate-400 dark:text-slate-600 italic leading-snug">
        No preview — safe-area insets resolve to the physical device (notch / home indicator) at runtime and are 0 on desktop.
      </p>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- FIELD MARKER -->
  <Section title="Field marker" bind:open={showFieldMarker}>
      <div class="flex items-center gap-2 pt-1">
        <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-24 shrink-0">Required marker</span>
        <input
          type="text"
          value={overrides["--sf-field-required-marker"] ?? ""}
          placeholder=" *"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value;
            v ? onSet("--sf-field-required-marker", v) : onReset("--sf-field-required-marker");
          }}
          class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-field-required-marker" in overrides}
          <button onclick={() => onReset("--sf-field-required-marker")} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>

      <!-- Field-marker preview — a required label with the marker appended, as
           .sf-field renders it after a required field's label. -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3">
        <label class="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
          Email address<span class="text-rose-500 dark:text-rose-400 whitespace-pre">{overrides["--sf-field-required-marker"] ?? " *"}</span>
          <input
            type="text"
            disabled
            placeholder="name@example.com"
            class="mt-1 w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-2 py-1 text-[10px] font-normal text-slate-500"
          />
        </label>
      </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- PREVIEW NOTE -->
  <div class="rounded-lg bg-black/3 dark:bg-white/3 border border-black/6 dark:border-white/6 p-3">
    <p class="text-[10px] text-slate-500 leading-relaxed">
      Selection colors, caret, links, borders and sizes all render in the
      live preview (try the <span class="text-slate-600 dark:text-slate-400 font-semibold">Components</span> template).
      <span class="text-slate-600 dark:text-slate-400 font-semibold">Scroll behavior</span> applies to the page
      itself and can't be shown in the static canvas.
    </p>
  </div>
</div>
