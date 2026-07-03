<script lang="ts">
  import type { SlashedToken } from '../../types';
  import SliderRow from '../inputs/SliderRow.svelte';
  import ColorInput from '../inputs/ColorInput.svelte';
  import { themeState } from '../../lib/theme.svelte';

  const COLUMN_RULE_STYLES = ["solid", "dashed", "dotted"];

  // <option> only reliably accepts a background via inline style (no dark:
  // variant support), so it's derived from the chrome theme directly.
  let optionBg = $derived(themeState.value === 'dark' ? '#16161e' : '#ffffff');

  let { overrides, onSet, onReset, onBulkChange }: {
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
    onBulkChange: (patch: Record<string, string | null>) => void;
  } = $props();

  function parseRem(val: string | undefined, fallback: number): number {
    if (!val) return fallback;
    const v = parseFloat(val);
    return isNaN(v) ? fallback : v;
  }

  let containerNarrow   = $derived(parseRem(overrides["--sf-container-narrow"],  38));
  let containerProse    = $derived(parseRem(overrides["--sf-container-prose"],   65));
  let containerDefault  = $derived(parseRem(overrides["--sf-container-default"], 75));
  let containerWide     = $derived(parseRem(overrides["--sf-container-wide"],    90));
  let centerMax         = $derived(parseRem(overrides["--sf-center-max"],        75));
  let centerGutter      = $derived(parseRem(overrides["--sf-center-gutter"],     1));
  let gridMin           = $derived(parseRem(overrides["--sf-grid-min"],          16));
  let headerMobile      = $derived(parseRem(overrides["--sf-header-height-mobile"],  3.5));
  let headerDesktop     = $derived(parseRem(overrides["--sf-header-height-desktop"], 5));
  let sidebarWidth      = $derived(parseRem(overrides["--sf-sidebar-width"],     18));
  let stickyMobile      = $derived(parseRem(overrides["--sf-sticky-offset-mobile"],  3.5));
  let stickyDesktop     = $derived(parseRem(overrides["--sf-sticky-offset-desktop"], 5));

  const BENTO_TOKENS = [
    { label: "Columns",    token: "--sf-bento-cols-default", min: 1, max: 12, step: 1, unit: "", default: 4 },
    { label: "Row default",token: "--sf-bento-row-default",  min: 4, max: 24, step: 0.5, unit: "rem", default: 10 },
    { label: "Row compact",token: "--sf-bento-row-compact",  min: 2, max: 16, step: 0.5, unit: "rem", default: 6 },
    { label: "Row tall",   token: "--sf-bento-row-tall",     min: 8, max: 32, step: 0.5, unit: "rem", default: 16 },
  ];

  let showContainerWidths = $state(false);
  let showCenterWrapper = $state(false);
  let showAutoGrid = $state(false);
  let showHeaderHeight = $state(false);
  let showStickyOffset = $state(false);
  let showSidebar = $state(false);
  let showBento = $state(false);
  let showMore = $state(false);
  let showBgLayer = $state(false);
  let showNamedRatios = $state(false);

  function getBentoVal(t: typeof BENTO_TOKENS[0]): number {
    const raw = overrides[t.token];
    if (!raw) return t.default;
    return parseFloat(raw);
  }

  // Additional layout primitives (switcher, sidebar, equal, cover, frame, reel,
  // imposter, content-grid, alternate) — tokens exist but had no UI.
  let switcherThreshold = $derived(parseRem(overrides["--sf-switcher-threshold"], 30));
  let sidebarMinWidth   = $derived(parseRem(overrides["--sf-sidebar-min-width"], 50));
  let equalMinCol       = $derived(parseRem(overrides["--sf-equal-min-col"], 16));
  let equalRuleWidth    = $derived(parseRem(overrides["--sf-equal-rule-width"], 0));
  let equalRuleColor    = $derived(overrides["--sf-equal-rule-color"] ?? "");
  let coverMinHeight    = $derived(parseRem(overrides["--sf-cover-min-height"], 100));
  let imposterMargin    = $derived(parseRem(overrides["--sf-imposter-margin"], 1));
  let breakoutWidth     = $derived(parseRem(overrides["--sf-breakout-width"], 90));
  let contentWidth      = $derived(parseRem(overrides["--sf-content-width"], 75));
  let alternateInnerGap = $derived(parseRem(overrides["--sf-alternate-inner-gap"], 1));
  let frameRatio        = $derived(overrides["--sf-frame-ratio"] ?? "16 / 9");
  let reelItemWidth     = $derived(overrides["--sf-reel-item-width"] ?? "max-content");

  const FRAME_PRESETS = ["16 / 9", "4 / 3", "3 / 2", "1 / 1", "21 / 9"];
  const REEL_PRESETS = [
    { label: "auto",  value: "max-content" },
    { label: "12rem", value: "12rem" },
    { label: "16rem", value: "16rem" },
    { label: "20rem", value: "20rem" },
  ];
</script>

<div class="p-4 space-y-6">

  <!-- CONTAINERS -->
  <section class="space-y-4">
    <button
      onclick={() => { showContainerWidths = !showContainerWidths; }}
      aria-expanded={showContainerWidths}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Container widths</div>
      <span class="text-[10px] text-slate-500">{showContainerWidths ? "▲" : "▼"}</span>
    </button>
    {#if showContainerWidths}
      <!-- Compact pairs -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <div class="text-[9px] text-slate-400 dark:text-slate-600 mb-1">Narrow</div>
          <SliderRow
            label="" value={containerNarrow} min={20} max={60} step={1} unit="rem"
            overridden={"--sf-container-narrow" in overrides}
            onChange={(v) => onSet("--sf-container-narrow", `${v}rem`)}
            onReset={() => onReset("--sf-container-narrow")}
          />
        </div>
        <div>
          <div class="text-[9px] text-slate-400 dark:text-slate-600 mb-1">Prose</div>
          <SliderRow
            label="" value={containerProse} min={40} max={90} step={1} unit="ch"
            overridden={"--sf-container-prose" in overrides}
            onChange={(v) => onSet("--sf-container-prose", `${v}ch`)}
            onReset={() => onReset("--sf-container-prose")}
          />
        </div>
        <div>
          <div class="text-[9px] text-slate-400 dark:text-slate-600 mb-1">Default</div>
          <SliderRow
            label="" value={containerDefault} min={50} max={120} step={1} unit="rem"
            overridden={"--sf-container-default" in overrides}
            onChange={(v) => onSet("--sf-container-default", `${v}rem`)}
            onReset={() => onReset("--sf-container-default")}
          />
        </div>
        <div>
          <div class="text-[9px] text-slate-400 dark:text-slate-600 mb-1">Wide</div>
          <SliderRow
            label="" value={containerWide} min={60} max={160} step={1} unit="rem"
            overridden={"--sf-container-wide" in overrides}
            onChange={(v) => onSet("--sf-container-wide", `${v}rem`)}
            onReset={() => onReset("--sf-container-wide")}
          />
        </div>
      </div>

      <!-- Visual width preview -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3 space-y-2">
        {#each [
          { label: "narrow",  value: containerNarrow,  max: containerWide, unit: "rem" },
          { label: "prose",   value: containerProse,   max: containerWide * 1.5, unit: "ch" },
          { label: "default", value: containerDefault, max: containerWide, unit: "rem" },
          { label: "wide",    value: containerWide,    max: containerWide, unit: "rem" },
        ] as row (row.label)}
          <div class="flex items-center gap-2">
            <span class="text-[9px] font-mono text-slate-400 dark:text-slate-600 w-12 text-right shrink-0">{row.label}</span>
            <div class="flex-1 h-4 bg-black/5 dark:bg-white/5 rounded overflow-hidden">
              <div
                class="h-full bg-indigo-500/30 border-r border-indigo-400/40 rounded"
                style={`width: ${Math.min((row.value / row.max) * 100, 100)}%`}
              ></div>
            </div>
            <span class="text-[9px] font-mono text-slate-500 w-14 shrink-0">{row.value}{row.unit}</span>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- CENTER WRAPPER -->
  <section class="space-y-3">
    <button
      onclick={() => { showCenterWrapper = !showCenterWrapper; }}
      aria-expanded={showCenterWrapper}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Center wrapper</div>
      <span class="text-[10px] text-slate-500">{showCenterWrapper ? "▲" : "▼"}</span>
    </button>
    {#if showCenterWrapper}
      <SliderRow
        label="Max width" value={centerMax} min={30} max={160} step={1} unit="rem"
        help="--sf-center-max — max-width of the .sf-center centering wrapper"
        overridden={"--sf-center-max" in overrides}
        onChange={(v) => onSet("--sf-center-max", `${v}rem`)}
        onReset={() => onReset("--sf-center-max")}
        rawDefault="var(--sf-container-default)"
        currentRaw={overrides["--sf-center-max"]}
        onRawSet={(v) => onSet("--sf-center-max", v)}
      />
      <SliderRow
        label="Gutter" value={centerGutter} min={0} max={4} step={0.125} unit="rem"
        help="--sf-center-gutter — minimum side padding inside the center wrapper"
        overridden={"--sf-center-gutter" in overrides}
        onChange={(v) => onSet("--sf-center-gutter", `${v}rem`)}
        onReset={() => onReset("--sf-center-gutter")}
        rawDefault="var(--sf-gutter)"
        currentRaw={overrides["--sf-center-gutter"]}
        onRawSet={(v) => onSet("--sf-center-gutter", v)}
      />
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- AUTO GRID -->
  <section class="space-y-4">
    <button
      onclick={() => { showAutoGrid = !showAutoGrid; }}
      aria-expanded={showAutoGrid}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Auto grid</div>
      <span class="text-[10px] text-slate-500">{showAutoGrid ? "▲" : "▼"}</span>
    </button>
    {#if showAutoGrid}
      <SliderRow
        label="Grid min cell width" value={gridMin} min={8} max={40} step={0.5} unit="rem"
        help="sf-grid minimum column width — browser auto-fills columns"
        overridden={"--sf-grid-min" in overrides}
        onChange={(v) => onSet("--sf-grid-min", `${v}rem`)}
        onReset={() => onReset("--sf-grid-min")}
      />
      <!-- Named grid size tokens -->
      <div>
        <div class="text-[9px] text-slate-400 dark:text-slate-600 mb-1.5">Named sizes (grid-min-xs → 2xl)</div>
        <div class="space-y-1.5">
          {#each [
            { label: "xs",  token: "--sf-grid-min-xs",  def: 10 },
            { label: "s",   token: "--sf-grid-min-s",   def: 13 },
            { label: "m",   token: "--sf-grid-min-m",   def: 16 },
            { label: "l",   token: "--sf-grid-min-l",   def: 20 },
            { label: "xl",  token: "--sf-grid-min-xl",  def: 24 },
            { label: "2xl", token: "--sf-grid-min-2xl", def: 28 },
          ] as g (g.token)}
            <SliderRow
              label={g.label} value={parseRem(overrides[g.token], g.def)} min={6} max={40} step={0.5} unit="rem"
              overridden={g.token in overrides}
              onChange={(v) => onSet(g.token, `${v}rem`)}
              onReset={() => onReset(g.token)}
            />
          {/each}
        </div>
      </div>
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3">
        <div class="text-[9px] text-slate-400 dark:text-slate-600 mb-2 font-mono">Preview at 360px panel width</div>
        <div
          class="grid gap-1"
          style={`grid-template-columns: repeat(auto-fill, minmax(${Math.min(gridMin * 16 * (360 / 1200), 120)}px, 1fr))`}
        >
          {#each Array.from({ length: 8 }) as _, i (i)}
            <div class="h-8 bg-indigo-500/20 border border-indigo-500/20 rounded text-[8px] font-mono text-indigo-600/60 dark:text-indigo-400/60 flex items-center justify-center">col</div>
          {/each}
        </div>
      </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- HEADER -->
  <section class="space-y-4">
    <button
      onclick={() => { showHeaderHeight = !showHeaderHeight; }}
      aria-expanded={showHeaderHeight}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Header height</div>
      <span class="text-[10px] text-slate-500">{showHeaderHeight ? "▲" : "▼"}</span>
    </button>
    {#if showHeaderHeight}
      <div class="grid grid-cols-2 gap-3">
        <div>
          <div class="text-[9px] text-slate-400 dark:text-slate-600 mb-1">Mobile</div>
          <SliderRow
            label="" value={headerMobile} min={2} max={8} step={0.25} unit="rem"
            overridden={"--sf-header-height-mobile" in overrides}
            onChange={(v) => onSet("--sf-header-height-mobile", `${v}rem`)}
            onReset={() => onReset("--sf-header-height-mobile")}
          />
        </div>
        <div>
          <div class="text-[9px] text-slate-400 dark:text-slate-600 mb-1">Desktop</div>
          <SliderRow
            label="" value={headerDesktop} min={3} max={10} step={0.25} unit="rem"
            overridden={"--sf-header-height-desktop" in overrides}
            onChange={(v) => onSet("--sf-header-height-desktop", `${v}rem`)}
            onReset={() => onReset("--sf-header-height-desktop")}
          />
        </div>
      </div>
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 overflow-hidden">
        <div
          class="flex items-center px-3 bg-indigo-500/10 border-b border-black/8 dark:border-white/8"
          style={`height: ${Math.min(headerMobile * 12, 64)}px`}
        >
          <div class="w-16 h-2 bg-indigo-400/40 rounded"></div>
          <div class="ml-auto flex gap-2">
            {#each [1, 2, 3] as i (i)}
              <div class="w-8 h-1.5 bg-slate-400/60 dark:bg-slate-600/60 rounded"></div>
            {/each}
          </div>
        </div>
        <div class="p-2 text-[9px] text-slate-400 dark:text-slate-600 font-mono">{headerMobile}rem mobile · {headerDesktop}rem desktop</div>
      </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- STICKY OFFSETS -->
  <section class="space-y-3">
    <button
      onclick={() => { showStickyOffset = !showStickyOffset; }}
      aria-expanded={showStickyOffset}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sticky offset</div>
      <span class="text-[10px] text-slate-500">{showStickyOffset ? "▲" : "▼"}</span>
    </button>
    {#if showStickyOffset}
      <p class="text-[9px] text-slate-400 dark:text-slate-600">Offsets position:sticky elements below a fixed header. Defaults to header heights.</p>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <div class="text-[9px] text-slate-400 dark:text-slate-600 mb-1">Mobile</div>
          <SliderRow
            label="" value={stickyMobile} min={0} max={12} step={0.25} unit="rem"
            overridden={"--sf-sticky-offset-mobile" in overrides}
            onChange={(v) => onSet("--sf-sticky-offset-mobile", `${v}rem`)}
            onReset={() => onReset("--sf-sticky-offset-mobile")}
            rawDefault="var(--sf-header-height-mobile)"
            currentRaw={overrides["--sf-sticky-offset-mobile"]}
            onRawSet={(v) => onSet("--sf-sticky-offset-mobile", v)}
          />
        </div>
        <div>
          <div class="text-[9px] text-slate-400 dark:text-slate-600 mb-1">Desktop</div>
          <SliderRow
            label="" value={stickyDesktop} min={0} max={12} step={0.25} unit="rem"
            overridden={"--sf-sticky-offset-desktop" in overrides}
            onChange={(v) => onSet("--sf-sticky-offset-desktop", `${v}rem`)}
            onReset={() => onReset("--sf-sticky-offset-desktop")}
            rawDefault="var(--sf-header-height-desktop)"
            currentRaw={overrides["--sf-sticky-offset-desktop"]}
            onRawSet={(v) => onSet("--sf-sticky-offset-desktop", v)}
          />
        </div>
      </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- SIDEBAR -->
  <section class="space-y-4">
    <button
      onclick={() => { showSidebar = !showSidebar; }}
      aria-expanded={showSidebar}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sidebar</div>
      <span class="text-[10px] text-slate-500">{showSidebar ? "▲" : "▼"}</span>
    </button>
    {#if showSidebar}
      <SliderRow
        label="Sidebar width" value={sidebarWidth} min={10} max={32} step={0.5} unit="rem"
        help="--sf-sidebar-width — default sidebar / drawer width"
        overridden={"--sf-sidebar-width" in overrides}
        onChange={(v) => onSet("--sf-sidebar-width", `${v}rem`)}
        onReset={() => onReset("--sf-sidebar-width")}
      />
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3 flex gap-2 items-stretch" style="height: 60px">
        <div
          class="bg-indigo-500/15 border border-indigo-500/20 rounded flex-shrink-0 flex items-center justify-center"
          style={`width: ${Math.min(sidebarWidth * 3.5, 100)}px`}
        >
          <span class="text-[8px] font-mono text-indigo-600/60 dark:text-indigo-400/60 rotate-90 whitespace-nowrap">{sidebarWidth}rem</span>
        </div>
        <div class="flex-1 bg-black/4 dark:bg-white/4 rounded"></div>
      </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- BENTO GRID -->
  <div>
    <button
      onclick={() => { showBento = !showBento; }}
      aria-expanded={showBento}
      class="w-full flex items-center justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer py-1"
    >
      <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bento grid</span>
      <span class="text-[10px] text-slate-500">{showBento ? "▲" : "▼"}</span>
    </button>
    {#if showBento}
      <div class="mt-2 space-y-2">
        {#each BENTO_TOKENS as t (t.token)}
          <SliderRow
            label={t.label} value={getBentoVal(t)} min={t.min} max={t.max} step={t.step} unit={t.unit}
            help={t.token}
            overridden={t.token in overrides}
            onChange={(v) => onSet(t.token, t.unit ? `${v}${t.unit}` : String(v))}
            onReset={() => onReset(t.token)}
          />
        {/each}
      </div>
    {/if}
  </div>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- MORE LAYOUT PRIMITIVES -->
  <div>
    <button
      onclick={() => { showMore = !showMore; }}
      aria-expanded={showMore}
      aria-controls="more-layout-primitives"
      class="w-full flex items-center justify-between text-[10px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer py-1"
    >
      <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">More layout primitives</span>
      <span class="text-[10px] text-slate-500">{showMore ? "▲" : "▼"}</span>
    </button>
    {#if showMore}
      <div id="more-layout-primitives" class="mt-3 space-y-5">

        <!-- Switcher -->
        <section class="space-y-2">
          <div class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Switcher</div>
          <SliderRow
            label="Threshold" value={switcherThreshold} min={10} max={60} step={1} unit="rem"
            help="--sf-switcher-threshold — width below which .sf-switcher stacks vertically"
            overridden={"--sf-switcher-threshold" in overrides}
            onChange={(v) => onSet("--sf-switcher-threshold", `${v}rem`)}
            onReset={() => onReset("--sf-switcher-threshold")}
          />
        </section>

        <!-- Sidebar content min -->
        <section class="space-y-2">
          <div class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Sidebar content</div>
          <SliderRow
            label="Content min width" value={sidebarMinWidth} min={20} max={80} step={1} unit="%"
            help="--sf-sidebar-min-width — minimum width of the .sf-sidebar content column before it wraps"
            overridden={"--sf-sidebar-min-width" in overrides}
            onChange={(v) => onSet("--sf-sidebar-min-width", `${v}%`)}
            onReset={() => onReset("--sf-sidebar-min-width")}
          />
        </section>

        <!-- Cluster -->
        <section class="space-y-2">
          <div class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Cluster</div>
          {#each [
            { label: "Align",   token: "--sf-cluster-align",   def: "center",     opts: ["flex-start","center","flex-end","stretch","baseline"] },
            { label: "Justify", token: "--sf-cluster-justify", def: "flex-start", opts: ["flex-start","center","flex-end","space-between","space-around"] },
          ] as row (row.token)}
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">{row.label}</span>
              <select
                value={overrides[row.token] ?? row.def}
                onchange={(e) => {
                  const v = (e.target as HTMLSelectElement).value;
                  v === row.def ? onReset(row.token) : onSet(row.token, v);
                }}
                class="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {#each row.opts as o (o)}
                  <option value={o} style={`background:${optionBg};`}>{o}</option>
                {/each}
              </select>
              {#if row.token in overrides}
                <button onclick={() => onReset(row.token)} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
              {/if}
            </div>
          {/each}
        </section>

        <!-- Equal columns (flowing CSS multi-column, not a grid) -->
        <section class="space-y-2">
          <div class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Equal columns (flowing)</div>
          <div class="text-[9px] text-slate-400 dark:text-slate-600">Content flows between columns like a newspaper — use .sf-grid for discrete grid cells instead.</div>
          <SliderRow
            label="Min column width" value={equalMinCol} min={6} max={36} step={0.5} unit="rem"
            help="--sf-equal-min-col — column-width floor for .sf-equal"
            overridden={"--sf-equal-min-col" in overrides}
            onChange={(v) => onSet("--sf-equal-min-col", `${v}rem`)}
            onReset={() => onReset("--sf-equal-min-col")}
          />
          <SliderRow
            label="Rule width" value={equalRuleWidth} min={0} max={4} step={0.5} unit="px"
            help="--sf-equal-rule-width — column-rule width between flowing columns, 0 = off"
            overridden={"--sf-equal-rule-width" in overrides}
            onChange={(v) => onSet("--sf-equal-rule-width", `${v}px`)}
            onReset={() => onReset("--sf-equal-rule-width")}
          />
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-20 shrink-0">Rule style</span>
            <select
              value={overrides["--sf-equal-rule-style"] ?? "solid"}
              onchange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                v === "solid" ? onReset("--sf-equal-rule-style") : onSet("--sf-equal-rule-style", v);
              }}
              class="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {#each COLUMN_RULE_STYLES as s (s)}
                <option value={s} style={`background:${optionBg};`}>{s}</option>
              {/each}
            </select>
            {#if "--sf-equal-rule-style" in overrides}
              <button onclick={() => onReset("--sf-equal-rule-style")} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
            {/if}
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-20 shrink-0">Rule color</span>
            <ColorInput
              token="--sf-equal-rule-color"
              value={equalRuleColor}
              placeholder="inherits border"
              isOverridden={"--sf-equal-rule-color" in overrides}
              onSet={(v) => onSet("--sf-equal-rule-color", v)}
              onReset={() => onReset("--sf-equal-rule-color")}
            />
          </div>
        </section>

        <!-- Cover -->
        <section class="space-y-2">
          <div class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Cover</div>
          <SliderRow
            label="Min height" value={coverMinHeight} min={20} max={100} step={1} unit="dvh"
            help="--sf-cover-min-height — minimum height of the .sf-cover layout"
            overridden={"--sf-cover-min-height" in overrides}
            onChange={(v) => onSet("--sf-cover-min-height", `${v}dvh`)}
            onReset={() => onReset("--sf-cover-min-height")}
          />
        </section>

        <!-- Frame ratio -->
        <section class="space-y-2">
          <div class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Frame ratio</div>
          <p class="text-[9px] text-slate-400 dark:text-slate-600">--sf-frame-ratio — aspect ratio for .sf-frame</p>
          <div class="grid grid-cols-5 gap-1">
            {#each FRAME_PRESETS as r (r)}
              <button
                onclick={() => r === "16 / 9" ? onReset("--sf-frame-ratio") : onSet("--sf-frame-ratio", r)}
                class={`py-1 rounded-lg text-[9px] border transition-all cursor-pointer font-mono ${
                  frameRatio.replace(/\s/g, "") === r.replace(/\s/g, "")
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                    : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >{r}</button>
            {/each}
          </div>
        </section>

        <!-- Reel -->
        <section class="space-y-2">
          <div class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Reel</div>
          <p class="text-[9px] text-slate-400 dark:text-slate-600">--sf-reel-item-width — width of each item in a horizontal .sf-reel</p>
          <div class="grid grid-cols-4 gap-1">
            {#each REEL_PRESETS as p (p.value)}
              <button
                onclick={() => p.value === "max-content" ? onReset("--sf-reel-item-width") : onSet("--sf-reel-item-width", p.value)}
                class={`py-1 rounded-lg text-[9px] border transition-all cursor-pointer ${
                  reelItemWidth === p.value
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                    : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >{p.label}</button>
            {/each}
          </div>
          <div class="flex items-center gap-2 pt-0.5">
            <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">Height</span>
            <input
              type="text"
              value={overrides["--sf-reel-height"] ?? ""}
              placeholder="auto"
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                v ? onSet("--sf-reel-height", v) : onReset("--sf-reel-height");
              }}
              class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
            {#if "--sf-reel-height" in overrides}
              <button onclick={() => onReset("--sf-reel-height")} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
            {/if}
          </div>
        </section>

        <!-- Imposter -->
        <section class="space-y-2">
          <div class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Imposter</div>
          <SliderRow
            label="Margin" value={imposterMargin} min={0} max={4} step={0.125} unit="rem"
            help="--sf-imposter-margin — viewport inset for the centered .sf-imposter overlay"
            overridden={"--sf-imposter-margin" in overrides}
            onChange={(v) => onSet("--sf-imposter-margin", `${v}rem`)}
            onReset={() => onReset("--sf-imposter-margin")}
            rawDefault="var(--sf-space-m)"
            currentRaw={overrides["--sf-imposter-margin"]}
            onRawSet={(v) => onSet("--sf-imposter-margin", v)}
          />
        </section>

        <!-- Content grid (breakout) -->
        <section class="space-y-2">
          <div class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Content grid (breakout)</div>
          <SliderRow
            label="Content width" value={contentWidth} min={40} max={120} step={1} unit="rem"
            help="--sf-content-width — default reading column width in .sf-content-grid"
            overridden={"--sf-content-width" in overrides}
            onChange={(v) => onSet("--sf-content-width", `${v}rem`)}
            onReset={() => onReset("--sf-content-width")}
            rawDefault="var(--sf-container-default)"
            currentRaw={overrides["--sf-content-width"]}
            onRawSet={(v) => onSet("--sf-content-width", v)}
          />
          <SliderRow
            label="Breakout width" value={breakoutWidth} min={50} max={160} step={1} unit="rem"
            help="--sf-breakout-width — wide breakout column width in .sf-content-grid"
            overridden={"--sf-breakout-width" in overrides}
            onChange={(v) => onSet("--sf-breakout-width", `${v}rem`)}
            onReset={() => onReset("--sf-breakout-width")}
            rawDefault="var(--sf-container-wide)"
            currentRaw={overrides["--sf-breakout-width"]}
            onRawSet={(v) => onSet("--sf-breakout-width", v)}
          />
        </section>

        <!-- Alternate -->
        <section class="space-y-2">
          <div class="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Alternate (zigzag)</div>
          <SliderRow
            label="Inner gap" value={alternateInnerGap} min={0} max={4} step={0.125} unit="rem"
            help="--sf-alternate-inner-gap — gap between media and text within an .sf-alternate row"
            overridden={"--sf-alternate-inner-gap" in overrides}
            onChange={(v) => onSet("--sf-alternate-inner-gap", `${v}rem`)}
            onReset={() => onReset("--sf-alternate-inner-gap")}
            rawDefault="var(--sf-gap)"
            currentRaw={overrides["--sf-alternate-inner-gap"]}
            onRawSet={(v) => onSet("--sf-alternate-inner-gap", v)}
          />
        </section>
      </div>
    {/if}
  </div>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- NAMED RATIOS -->
  <div>
    <button
      onclick={() => { showNamedRatios = !showNamedRatios; }}
      aria-expanded={showNamedRatios}
      class="w-full flex items-center justify-between cursor-pointer py-1"
    >
      <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Named ratios</span>
      <span class="text-[10px] text-slate-500">{showNamedRatios ? "▲" : "▼"}</span>
    </button>
    {#if showNamedRatios}
      <div class="mt-2 space-y-2">
        <p class="text-[9px] text-slate-400 dark:text-slate-600">Override the built-in named aspect ratios used by <span class="font-mono text-slate-600 dark:text-slate-400">.sf-ratio-*</span> utilities.</p>
        {#each [
          { label: "Square",   token: "--sf-ratio-square",   def: "1"       },
          { label: "Portrait", token: "--sf-ratio-portrait", def: "3 / 4"   },
          { label: "3:2",      token: "--sf-ratio-3-2",      def: "3 / 2"   },
          { label: "4:3",      token: "--sf-ratio-4-3",      def: "4 / 3"   },
          { label: "Video",    token: "--sf-ratio-video",    def: "16 / 9"  },
          { label: "Cinema",   token: "--sf-ratio-cinema",   def: "21 / 9"  },
          { label: "Golden",   token: "--sf-ratio-golden",   def: "1.618 / 1" },
        ] as r (r.token)}
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">{r.label}</span>
            <input
              type="text"
              value={overrides[r.token] ?? ""}
              placeholder={r.def}
              oninput={(e) => {
                const v = (e.target as HTMLInputElement).value.trim();
                v ? onSet(r.token, v) : onReset(r.token);
              }}
              class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
            {#if r.token in overrides}
              <button onclick={() => onReset(r.token)} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- BACKGROUND LAYER -->
  <div>
    <button
      onclick={() => { showBgLayer = !showBgLayer; }}
      aria-expanded={showBgLayer}
      class="w-full flex items-center justify-between cursor-pointer py-1"
    >
      <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Background layer (.sf-bg)</span>
      <span class="text-[10px] text-slate-500">{showBgLayer ? "▲" : "▼"}</span>
    </button>
    {#if showBgLayer}
      <div class="mt-2 space-y-3">
        <p class="text-[9px] text-slate-400 dark:text-slate-600">Default values for the <span class="font-mono text-slate-600 dark:text-slate-400">.sf-bg</span> full-bleed background utility.</p>
        {#each [
          { label: "Fit",      token: "--sf-bg-fit",      placeholder: "cover",    opts: ["cover","contain","fill","none","scale-down"] },
          { label: "Position", token: "--sf-bg-position", placeholder: "50% 50%",  opts: ["50% 50%","top","bottom","left","right","center"] },
        ] as row (row.token)}
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-16 shrink-0">{row.label}</span>
            <select
              value={overrides[row.token] ?? row.placeholder}
              onchange={(e) => {
                const v = (e.target as HTMLSelectElement).value;
                v === row.placeholder ? onReset(row.token) : onSet(row.token, v);
              }}
              class="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {#each row.opts as o (o)}
                <option value={o} style={`background:${optionBg};`}>{o}</option>
              {/each}
            </select>
            {#if row.token in overrides}
              <button onclick={() => onReset(row.token)} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
            {/if}
          </div>
        {/each}
        <SliderRow
          label="Inset" value={parseRem(overrides["--sf-bg-inset"], 0)} min={0} max={4} step={0.25} unit="rem"
          help="--sf-bg-inset — inset the background from the container edges"
          overridden={"--sf-bg-inset" in overrides}
          onChange={(v) => onSet("--sf-bg-inset", `${v}rem`)}
          onReset={() => onReset("--sf-bg-inset")}
        />
        <SliderRow
          label="Radius" value={parseRem(overrides["--sf-bg-radius"], 0)} min={0} max={4} step={0.125} unit="rem"
          help="--sf-bg-radius — corner radius of the background element"
          overridden={"--sf-bg-radius" in overrides}
          onChange={(v) => onSet("--sf-bg-radius", `${v}rem`)}
          onReset={() => onReset("--sf-bg-radius")}
        />
        <SliderRow
          label="Z-index" value={parseRem(overrides["--sf-bg-z"], -2)} min={-10} max={0} step={1}
          help="--sf-bg-z — stack order of the background pseudo-element (typically negative)"
          overridden={"--sf-bg-z" in overrides}
          onChange={(v) => onSet("--sf-bg-z", String(v))}
          onReset={() => onReset("--sf-bg-z")}
        />
      </div>
    {/if}
  </div>
</div>
