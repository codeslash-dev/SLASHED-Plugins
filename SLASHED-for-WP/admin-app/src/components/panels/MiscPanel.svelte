<script lang="ts">
  import SliderRow from '../inputs/SliderRow.svelte';
  import ColorInput from '../inputs/ColorInput.svelte';

  let { overrides, onSet, onReset, onBulkChange }: {
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
    onBulkChange: (patch: Record<string, string | null>) => void;
  } = $props();

  const Z_INDEX_STEPS = [
    { label: "Below",     token: "--sf-z-below",     note: "Behind content (e.g. decorative BG)" },
    { label: "Raised",    token: "--sf-z-raised",    note: "Slightly above flow" },
    { label: "Dropdown",  token: "--sf-z-dropdown",  note: "Dropdowns, popovers" },
    { label: "Sticky",    token: "--sf-z-sticky",    note: "Sticky headers, toolbars" },
    { label: "Fixed",     token: "--sf-z-fixed",     note: "Fixed UI chrome" },
    { label: "Overlay",   token: "--sf-z-overlay",   note: "Modals, drawers backdrop" },
    { label: "Modal",     token: "--sf-z-modal",     note: "Modal dialogs" },
    { label: "Popover",   token: "--sf-z-popover",   note: "Tooltips, menus" },
    { label: "Tooltip",   token: "--sf-z-tooltip",   note: "Inline tooltips" },
    { label: "Toast",     token: "--sf-z-toast",     note: "Notifications" },
  ];

  const SCROLL_BEHAVIORS = [
    { label: "Smooth", value: "smooth" },
    { label: "Auto",   value: "auto"   },
  ];

  const SIZE_TOKENS = [
    { label: "XS", token: "--sf-size-xs", default: 1.5 },
    { label: "S",  token: "--sf-size-s",  default: 2   },
    { label: "M",  token: "--sf-size-m",  default: 2.5 },
    { label: "L",  token: "--sf-size-l",  default: 2.75 },
    { label: "XL", token: "--sf-size-xl", default: 3.5 },
  ];

  function parseNum(val: string | undefined, fallback: number, strip?: string): number {
    if (!val) return fallback;
    const v = parseFloat(strip ? val.replace(strip, "") : val);
    return isNaN(v) ? fallback : v;
  }

  let touchTarget = $derived(parseNum(overrides["--sf-touch-target"], 44, "px"));
  let scrollBehavior = $derived(overrides["--sf-scroll-behavior"] ?? "smooth");
  let zBaseOffset = $derived(parseNum(overrides["--sf-z-base"], 0));
  let caretColor = $derived(overrides["--sf-caret-color"] ?? "");
  let underlineOffset = $derived(parseNum(overrides["--sf-link-underline-offset"]?.replace("em",""), 0.15));
  let underlineThickness = $derived(overrides["--sf-link-underline-thickness"] ?? "auto");
  let focusRingStyle = $derived(overrides["--sf-focus-ring-style"] ?? "solid");

  let showTouchTarget = $state(false);
  let showScrollBehavior = $state(false);
  let showZIndex = $state(false);
  let showTextSelection = $state(false);
  let showFocusRingStyle = $state(false);
  let showComponentSizes = $state(false);
  let showCaretLinks = $state(false);
  let showIconSizes = $state(false);
  let showObjectFit = $state(false);
  let showPrint = $state(false);
  let showSafeArea = $state(false);
  let showStateFlags = $state(false);

  function getSizeValue(t: typeof SIZE_TOKENS[0]): number {
    return parseNum(overrides[t.token]?.replace("rem",""), t.default);
  }
</script>

<div class="p-4 space-y-6">

  <!-- TOUCH TARGET -->
  <section class="space-y-3">
    <button
      onclick={() => { showTouchTarget = !showTouchTarget; }}
      aria-expanded={showTouchTarget}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Touch target</div>
      <span class="text-[10px] text-slate-500">{showTouchTarget ? "▲" : "▼"}</span>
    </button>
    {#if showTouchTarget}
      <SliderRow
        label="Min touch size" value={touchTarget} min={32} max={64} step={1} unit="px"
        help="--sf-touch-target — minimum tappable area for interactive elements (WCAG 2.5.5)"
        overridden={"--sf-touch-target" in overrides}
        onChange={(v) => onSet("--sf-touch-target", `${v}px`)}
        onReset={() => onReset("--sf-touch-target")}
      />
      <!-- Preview -->
      <div class="bg-white/4 rounded-xl border border-white/8 p-3 flex items-center gap-3">
        <div
          class="bg-indigo-500/30 border border-indigo-500/30 rounded flex items-center justify-center text-[9px] font-mono text-indigo-400/70 shrink-0"
          style={`width: ${touchTarget}px; height: ${touchTarget}px`}
        >
          {touchTarget}px
        </div>
        <p class="text-[9px] text-slate-600">Minimum interactive area — ensures accessibility on touch devices.</p>
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- SCROLL BEHAVIOR -->
  <section class="space-y-3">
    <button
      onclick={() => { showScrollBehavior = !showScrollBehavior; }}
      aria-expanded={showScrollBehavior}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Scroll behavior</div>
      <span class="text-[10px] text-slate-500">{showScrollBehavior ? "▲" : "▼"}</span>
    </button>
    {#if showScrollBehavior}
      <div class="flex gap-2">
        {#each SCROLL_BEHAVIORS as b (b.value)}
          <button
            onclick={() => b.value === "smooth" ? onReset("--sf-scroll-behavior") : onSet("--sf-scroll-behavior", b.value)}
            class={`flex-1 py-2 rounded-lg text-[10px] border transition-all cursor-pointer ${
              scrollBehavior === b.value
                ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {b.label}
          </button>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- Z-INDEX -->
  <section class="space-y-3">
    <button
      onclick={() => { showZIndex = !showZIndex; }}
      aria-expanded={showZIndex}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Z-index layers</div>
      <span class="text-[10px] text-slate-500">{showZIndex ? "▲" : "▼"}</span>
    </button>
    {#if showZIndex}
      <SliderRow
        label="Base offset" value={zBaseOffset} min={0} max={1000} step={10}
        help="--sf-z-base — added to all z-index tokens to avoid conflicts with existing stacking contexts"
        overridden={"--sf-z-base" in overrides}
        onChange={(v) => onSet("--sf-z-base", String(v))}
        onReset={() => onReset("--sf-z-base")}
      />
      <div class="bg-white/4 rounded-xl border border-white/8 p-3 space-y-1.5">
        {#each Z_INDEX_STEPS as z (z.token)}
          {@const isOverridden = z.token in overrides}
          <div class="flex items-center gap-2">
            <div class={`w-1.5 h-1.5 rounded-full shrink-0 ${isOverridden ? "bg-amber-400" : "bg-white/20"}`}></div>
            <span class="text-[9px] font-mono text-slate-400 w-20 shrink-0">{z.label}</span>
            <span class="text-[8px] text-slate-600 flex-1">{z.note}</span>
            <span class="text-[8px] font-mono text-slate-500">{z.token.replace("--sf-z-", "")}</span>
          </div>
        {/each}
      </div>
      <p class="text-[9px] text-slate-600">Override individual z-index tokens in the "All tokens" tab.</p>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- SELECTION -->
  <section class="space-y-3">
    <button
      onclick={() => { showTextSelection = !showTextSelection; }}
      aria-expanded={showTextSelection}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Text selection</div>
      <span class="text-[10px] text-slate-500">{showTextSelection ? "▲" : "▼"}</span>
    </button>
    {#if showTextSelection}
      <div class="space-y-2">
        <div>
          <div class="text-[10px] font-semibold text-slate-400 mb-1.5">Selection background</div>
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
          <div class="text-[10px] font-semibold text-slate-400 mb-1.5">Selection text color</div>
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
        <div class="bg-white/4 rounded-xl border border-white/8 p-3">
          <p
            class="text-[11px] text-slate-200 select-all"
            style={`--sf-color-selection-bg: ${overrides["--sf-color-selection-bg"] ?? "#6366f1"}; --sf-color-selection-text: ${overrides["--sf-color-selection-text"] ?? "#ffffff"}`}
          >
            Select this text to preview the selection color.
          </p>
        </div>
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- FOCUS RING STYLE -->
  <section class="space-y-3">
    <button
      onclick={() => { showFocusRingStyle = !showFocusRingStyle; }}
      aria-expanded={showFocusRingStyle}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Focus ring style</div>
      <span class="text-[10px] text-slate-500">{showFocusRingStyle ? "▲" : "▼"}</span>
    </button>
    {#if showFocusRingStyle}
      <div class="flex gap-2">
        {#each ["solid", "dashed", "dotted"] as style (style)}
          {@const current = overrides["--sf-focus-ring-style"] ?? "solid"}
          <button
            onclick={() => style === "solid" ? onReset("--sf-focus-ring-style") : onSet("--sf-focus-ring-style", style)}
            class={`flex-1 py-2 rounded-lg text-[10px] border transition-all cursor-pointer capitalize ${
              current === style
                ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
            }`}
          >
            {style}
          </button>
        {/each}
      </div>
      <!-- Focus ring style preview -->
      <div class="bg-white/4 rounded-xl border border-white/8 p-4 flex items-center justify-center">
        <div
          class="px-4 py-2 bg-indigo-600/30 rounded-lg text-[11px] text-indigo-200"
          style={`outline: 2px ${focusRingStyle} ${overrides["--sf-focus-ring-color"] || "oklch(0.7 0.2 235)"}; outline-offset: 2px`}
        >
          Focus ring · {focusRingStyle}
        </div>
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- COMPONENT SIZES -->
  <section class="space-y-3">
    <button
      onclick={() => { showComponentSizes = !showComponentSizes; }}
      aria-expanded={showComponentSizes}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Component size scale</div>
      <span class="text-[10px] text-slate-500">{showComponentSizes ? "▲" : "▼"}</span>
    </button>
    {#if showComponentSizes}
      <p class="text-[10px] text-slate-600 leading-relaxed">
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
      <div class="bg-white/4 rounded-xl border border-white/8 p-3 flex items-end gap-2">
        {#each SIZE_TOKENS as s (s.token)}
          {@const val = getSizeValue(s)}
          <div class="flex flex-col items-center gap-1 flex-1">
            <div
              class="w-full bg-indigo-500/30 border border-indigo-500/30 rounded flex items-center justify-center"
              style={`height: ${Math.min(val * 14, 64)}px`}
            ></div>
            <span class="text-[8px] font-mono text-slate-600">{s.label}</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- CARET & LINKS -->
  <section class="space-y-3">
    <button
      onclick={() => { showCaretLinks = !showCaretLinks; }}
      aria-expanded={showCaretLinks}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Caret &amp; links</div>
      <span class="text-[10px] text-slate-500">{showCaretLinks ? "▲" : "▼"}</span>
    </button>
    {#if showCaretLinks}
      <div>
        <div class="text-[10px] font-semibold text-slate-400 mb-1.5">Caret color</div>
        <ColorInput
          token="--sf-caret-color"
          value={caretColor}
          placeholder="default (action color)"
          isOverridden={"--sf-caret-color" in overrides}
          onSet={(v) => onSet("--sf-caret-color", v)}
          onReset={() => onReset("--sf-caret-color")}
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
          <span class="text-[11px] font-semibold text-slate-200">Underline thickness</span>
          {#if "--sf-link-underline-thickness" in overrides}
            <button onclick={() => onReset("--sf-link-underline-thickness")} class="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus:opacity-100">reset</button>
          {/if}
        </div>
        <div class="flex gap-1">
          {#each [["auto", "auto"], ["1px", "1px"], ["2px", "2px"], ["3px", "3px"]] as [label, val] (val)}
            <button
              onclick={() => val === "auto" ? onReset("--sf-link-underline-thickness") : onSet("--sf-link-underline-thickness", val)}
              class={`flex-1 py-1.5 rounded-lg text-[10px] border transition-all cursor-pointer ${
                underlineThickness === val
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                  : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >{label}</button>
          {/each}
        </div>
      </div>
      <!-- Live sample: caret (type in the field) + underlined link -->
      <div class="bg-white/4 rounded-xl border border-white/8 p-3 space-y-2">
        <input
          type="text"
          placeholder="Click and type to see the caret…"
          style={`caret-color:${caretColor || "#6366f1"}`}
          class="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <p class="text-[11px] text-slate-300">
          A <a
            href="#sample-link"
            onclick={(e) => e.preventDefault()}
            class="text-indigo-300"
            style={`text-decoration:underline;text-underline-offset:${underlineOffset}em;text-decoration-thickness:${underlineThickness}`}
          >sample link</a> with the current underline settings.
        </p>
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- ICON SIZES -->
  <section class="space-y-3">
    <button
      onclick={() => { showIconSizes = !showIconSizes; }}
      aria-expanded={showIconSizes}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Icon sizes</div>
      <span class="text-[10px] text-slate-500">{showIconSizes ? "▲" : "▼"}</span>
    </button>
    {#if showIconSizes}
      <p class="text-[10px] text-slate-600 leading-relaxed">
        Icon scale tokens used by <span class="font-mono text-slate-400">.sf-icon-*</span> utilities. Values are in <span class="font-mono text-slate-400">em</span> units relative to surrounding text.
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
        help="--sf-icon-box-pad — padding around icon when using .sf-icon-box"
        overridden={"--sf-icon-box-pad" in overrides}
        onChange={(v) => onSet("--sf-icon-box-pad", `${v}em`)}
        onReset={() => onReset("--sf-icon-box-pad")}
      />
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- OBJECT FIT / POSITION -->
  <section class="space-y-3">
    <button
      onclick={() => { showObjectFit = !showObjectFit; }}
      aria-expanded={showObjectFit}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Object fit</div>
      <span class="text-[10px] text-slate-500">{showObjectFit ? "▲" : "▼"}</span>
    </button>
    {#if showObjectFit}
      <p class="text-[9px] text-slate-600">Default values for <span class="font-mono text-slate-400">.sf-media</span> images and replaced elements.</p>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-400 w-16 shrink-0">Fit</span>
        <div class="flex gap-1 flex-1">
          {#each ["cover","contain","fill","none"] as v (v)}
            {@const cur = overrides["--sf-object-fit"] ?? "cover"}
            <button
              onclick={() => v === "cover" ? onReset("--sf-object-fit") : onSet("--sf-object-fit", v)}
              class={`flex-1 py-1.5 rounded-lg text-[9px] border transition-all cursor-pointer ${cur === v ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200" : "border-white/8 text-slate-400 hover:bg-white/5"}`}
            >{v}</button>
          {/each}
        </div>
        {#if "--sf-object-fit" in overrides}
          <button onclick={() => onReset("--sf-object-fit")} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer">reset</button>
        {/if}
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-400 w-16 shrink-0">Position</span>
        <input
          type="text"
          value={overrides["--sf-object-position"] ?? ""}
          placeholder="50% 50%"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value.trim();
            v ? onSet("--sf-object-position", v) : onReset("--sf-object-position");
          }}
          class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-object-position" in overrides}
          <button onclick={() => onReset("--sf-object-position")} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- SAFE AREA INSETS -->
  <section class="space-y-3">
    <button
      onclick={() => { showSafeArea = !showSafeArea; }}
      aria-expanded={showSafeArea}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Safe area insets</div>
      <span class="text-[10px] text-slate-500">{showSafeArea ? "▲" : "▼"}</span>
    </button>
    {#if showSafeArea}
      <p class="text-[9px] text-slate-600 leading-relaxed">
        Default to the device's <span class="font-mono text-slate-400">env(safe-area-inset-*)</span>. Override only if you need fixed padding regardless of notch/home-indicator.
      </p>
      <div class="space-y-1.5">
        {#each [
          { label: "Top",    token: "--sf-safe-top",    placeholder: "env(safe-area-inset-top, 0px)" },
          { label: "Right",  token: "--sf-safe-right",  placeholder: "env(safe-area-inset-right, 0px)" },
          { label: "Bottom", token: "--sf-safe-bottom", placeholder: "env(safe-area-inset-bottom, 0px)" },
          { label: "Left",   token: "--sf-safe-left",   placeholder: "env(safe-area-inset-left, 0px)" },
        ] as row (row.token)}
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-semibold text-slate-400 w-14 shrink-0">{row.label}</span>
            <input
              type="text"
              value={overrides[row.token] ?? ""}
              placeholder={row.placeholder}
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                v ? onSet(row.token, v) : onReset(row.token);
              }}
              class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
            {#if row.token in overrides}
              <button onclick={() => onReset(row.token)} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- PRINT -->
  <section class="space-y-3">
    <button
      onclick={() => { showPrint = !showPrint; }}
      aria-expanded={showPrint}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Print styles</div>
      <span class="text-[10px] text-slate-500">{showPrint ? "▲" : "▼"}</span>
    </button>
    {#if showPrint}
      <p class="text-[9px] text-slate-600">Applied inside <span class="font-mono text-slate-400">@media print</span> via <span class="font-mono text-slate-400">optional/print.css</span>.</p>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-semibold text-slate-400 w-24 shrink-0">Page size</span>
        <div class="flex gap-1 flex-1">
          {#each ["a4","letter","legal","a3"] as v (v)}
            {@const cur = overrides["--sf-print-page-size"] ?? "a4"}
            <button
              onclick={() => v === "a4" ? onReset("--sf-print-page-size") : onSet("--sf-print-page-size", v)}
              class={`flex-1 py-1.5 rounded-lg text-[9px] border transition-all cursor-pointer ${cur === v ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200" : "border-white/8 text-slate-400 hover:bg-white/5"}`}
            >{v}</button>
          {/each}
        </div>
      </div>
      {#each [
        { label: "Base size", token: "--sf-print-base-size", placeholder: "11pt" },
        { label: "Page margin", token: "--sf-print-page-margin", placeholder: "2cm" },
      ] as row (row.token)}
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-semibold text-slate-400 w-24 shrink-0">{row.label}</span>
          <input
            type="text"
            value={overrides[row.token] ?? ""}
            placeholder={row.placeholder}
            oninput={(e) => {
              const v = (e.target as HTMLInputElement).value.trim();
              v ? onSet(row.token, v) : onReset(row.token);
            }}
            class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
          {#if row.token in overrides}
            <button onclick={() => onReset(row.token)} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
          {/if}
        </div>
      {/each}
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- STATE FLAGS -->
  <section class="space-y-3">
    <button
      onclick={() => { showStateFlags = !showStateFlags; }}
      aria-expanded={showStateFlags}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">State flags</div>
      <span class="text-[10px] text-slate-500">{showStateFlags ? "▲" : "▼"}</span>
    </button>
    {#if showStateFlags}
      <p class="text-[10px] text-slate-600 leading-relaxed">
        Boolean CSS custom property flags (0 = off, 1 = on). Components toggle these to activate state-specific styles.
        Overriding globally forces all matching elements into that state — useful for testing and demos.
      </p>
      <div class="space-y-1.5">
        {#each [
          { label: "is-active",  token: "--sf-is-active",  note: "Active/selected state" },
          { label: "is-current", token: "--sf-is-current", note: "Current page/item" },
          { label: "is-open",    token: "--sf-is-open",    note: "Open/expanded state" },
          { label: "is-pressed", token: "--sf-is-pressed", note: "Pressed/depressed state" },
        ] as f (f.token)}
          {@const cur = overrides[f.token] ?? "0"}
          <div class="flex items-center gap-2 py-0.5">
            <button
              type="button"
              aria-label={f.label}
              aria-pressed={cur === "1"}
              onclick={() => cur === "1" ? onReset(f.token) : onSet(f.token, "1")}
              class={`w-8 h-4 rounded-full transition-colors relative cursor-pointer shrink-0 ${cur === "1" ? "bg-indigo-600" : "bg-white/10"}`}
            >
              <div class={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${cur === "1" ? "translate-x-4" : "translate-x-0.5"}`}></div>
            </button>
            <span class="text-[9px] font-mono text-slate-300 w-24 shrink-0">{f.label}</span>
            <span class="text-[9px] text-slate-600 flex-1">{f.note}</span>
            {#if f.token in overrides}
              <button onclick={() => onReset(f.token)} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
            {/if}
          </div>
        {/each}
      </div>
      <div class="flex items-center gap-2 pt-1">
        <span class="text-[10px] font-semibold text-slate-400 w-24 shrink-0">Required marker</span>
        <input
          type="text"
          value={overrides["--sf-field-required-marker"] ?? ""}
          placeholder=" *"
          oninput={(e) => {
            const v = (e.target as HTMLInputElement).value;
            v ? onSet("--sf-field-required-marker", v) : onReset("--sf-field-required-marker");
          }}
          class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        {#if "--sf-field-required-marker" in overrides}
          <button onclick={() => onReset("--sf-field-required-marker")} class="text-[8px] text-slate-500 hover:text-rose-400 cursor-pointer shrink-0">reset</button>
        {/if}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- PREVIEW NOTE -->
  <div class="rounded-lg bg-white/3 border border-white/6 p-3">
    <p class="text-[10px] text-slate-500 leading-relaxed">
      Selection colors, caret, links, focus ring, borders and sizes all render in the
      live preview (try the <span class="text-slate-400 font-semibold">Components</span> template).
      <span class="text-slate-400 font-semibold">Scroll behavior</span> applies to the page
      itself and can't be shown in the static canvas.
    </p>
  </div>
</div>
