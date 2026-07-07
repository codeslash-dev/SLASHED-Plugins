<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { SlidersHorizontal, Eye, RotateCcw } from '@lucide/svelte';
  import type { PreviewTemplate, SlashedToken, ApiIndex } from './types';
  import StudioHeader from './components/shell/StudioHeader.svelte';
  import SidebarNav from './components/shell/SidebarNav.svelte';
  import StatusBar from './components/shell/StatusBar.svelte';
  import PreviewPanel from './components/shell/PreviewPanel.svelte';
  import DomainPanel from './components/DomainPanel.svelte';
  import { generateCSS } from './lib/codec';
  import { loadInitialOverrides, injectLivePreview, saveOverrides, hasWpBoot } from './lib/persistence';
  import { domainOf } from './lib/domains';
  import tokensRaw from './data/api-index.generated.json';
  import CommandPalette from './components/CommandPalette.svelte';

  const ALL_TOKENS = ((tokensRaw as ApiIndex).tokens ?? tokensRaw) as SlashedToken[];

  const DOMAIN_LABELS: Record<string, string> = {
    home: "Home", colors: "Colors", typography: "Typography", spacing: "Spacing",
    layout: "Layout", borders: "Borders", shadows: "Shadows", motion: "Motion",
    effects: "Effects", macros: "Macros", misc: "Misc", components: "Components",
    themes: "Themes", wcag: "WCAG", setup: "Install", cheatsheet: "Classes",
  };

  function overridesByDomain(ov: Record<string, string>): Record<string, number> {
    const map: Record<string, number> = {};
    for (const k of Object.keys(ov)) {
      const dom = domainOf(k);
      map[dom] = (map[dom] ?? 0) + 1;
    }
    return map;
  }

  // Embedded hosts (e.g. the WP admin page) mount us into a sized container in
  // normal document flow, not the document body — w-screen/h-screen would then
  // size to the viewport while still being offset by the host's own layout
  // chrome, overflowing past its right edge. Standalone keeps viewport units
  // since it owns the whole page. Uses hasWpBoot() (any host), not
  // isEmbedded() (REST persistence specifically) — a host can mount us
  // without configuring REST.
  const embedded = hasWpBoot();

  // Core state
  let overrides = $state<Record<string, string>>(loadInitialOverrides());
  let past = $state<Record<string, string>[]>([]);
  let future = $state<Record<string, string>[]>([]);

  let domain = $state("home");
  let showPalette = $state(false);
  // On narrow screens the controls panel and the live preview can't both fit, so
  // we show one at a time and let the user fold between them (desktop shows both).
  let mobileView = $state<"controls" | "preview">("controls");
  let previewTheme = $state<"light" | "dark">("light");
  let previewWidth = $state<"fluid" | "mobile" | "tablet" | "desktop">("fluid");
  let previewMotion = $state<"normal" | "slow" | "none">("normal");
  let previewTemplate = $state<PreviewTemplate>("marketing");

  // Derived
  let overridesCount = $derived(Object.keys(overrides).length);
  let domainBadges = $derived(overridesByDomain(overrides));
  // Scope the active category's reset to exactly the keys domainOf() would
  // badge under this domain — matching against the domain's own pattern list
  // directly would over-match, since patterns overlap across domains (e.g.
  // layout's "-bg-" also appears in color tokens like --sf-color-bg--active,
  // which domainOf() resolves to "colors" by checking that domain first).
  let domainOverrideKeys = $derived(
    Object.keys(overrides).filter((k) => domainOf(k) === domain)
  );
  let domainOverridesCount = $derived(domainOverrideKeys.length);
  let canUndo = $derived(past.length > 0);
  let canRedo = $derived(future.length > 0);

  // Shallow equality for flat string records — much cheaper than JSON.stringify on every tick.
  function shallowEq(a: Record<string, string>, b: Record<string, string>): boolean {
    const ak = Object.keys(a);
    if (ak.length !== Object.keys(b).length) return false;
    return ak.every((k) => a[k] === b[k]);
  }

  // Save state — hasPendingChanges is derived so undo/redo update it automatically.
  let lastSavedOverrides = $state<Record<string, string>>(untrack(() => ({ ...overrides })));
  let saveState = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
  let hasPendingChanges = $derived(!shallowEq(overrides, lastSavedOverrides));
  let saveStateTimer: ReturnType<typeof setTimeout> | null = null;

  // Live CSS preview on every change — actual persistence only on explicit save.
  $effect(() => { injectLivePreview(overrides); });

  function setOverrides(updater: ((prev: Record<string, string>) => Record<string, string>) | Record<string, string>) {
    const prev = overrides;
    const next = typeof updater === "function" ? updater(prev) : updater;
    if (!shallowEq(prev, next)) {
      past = [...past.slice(-49), prev];
      future = [];
      if (saveState === 'saved' || saveState === 'error') saveState = 'idle';
    }
    overrides = next;
  }

  async function handleSave() {
    if (!hasPendingChanges || saveState === 'saving') return;
    const snapshot = { ...overrides };
    saveState = 'saving';
    try {
      await saveOverrides(overrides);
      // Only mark clean if overrides haven't changed since save started.
      if (shallowEq(overrides, snapshot)) {
        lastSavedOverrides = snapshot;
        saveState = 'saved';
        if (saveStateTimer) clearTimeout(saveStateTimer);
        saveStateTimer = setTimeout(() => {
          if (saveState === 'saved') saveState = 'idle';
          saveStateTimer = null;
        }, 2000);
      } else {
        saveState = 'idle';
      }
    } catch (err) {
      console.warn('slashed: save failed', err);
      saveState = 'error';
    }
  }

  function handleSet(name: string, value: string) {
    setOverrides((prev) => ({ ...prev, [name]: value }));
  }

  function handleReset(name: string) {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function handleBulkChange(patch: Record<string, string | null>) {
    setOverrides((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) delete next[k];
        else next[k] = v;
      }
      return next;
    });
  }

  // Applying a saved theme replaces the entire override set with the snapshot.
  function handleApplyTheme(themeOverrides: Record<string, string>) {
    setOverrides({ ...themeOverrides });
  }

  function handleResetAll() {
    setOverrides({});
  }

  function handleResetDomain() {
    const patch: Record<string, null> = {};
    for (const k of domainOverrideKeys) patch[k] = null;
    handleBulkChange(patch);
  }

  function handleUndo() {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const curr = overrides;
    past = past.slice(0, -1);
    future = [curr, ...future];
    overrides = previous;
  }

  function handleRedo() {
    if (future.length === 0) return;
    const next = future[0];
    const curr = overrides;
    future = future.slice(1);
    past = [...past, curr];
    overrides = next;
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".css,.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (!text) return;
        if (file.name.endsWith(".json")) {
          try {
            const data = JSON.parse(text);
            if (data !== null && typeof data === "object" && !Array.isArray(data)) {
              // Restrict to real token-name keys too, not just string values — an
              // imported JSON file is untrusted input and its keys end up as
              // object property names downstream (CodeQL: remote-property-injection).
              const safe = Object.fromEntries(
                Object.entries(data as Record<string, unknown>).filter(
                  ([k, v]) => typeof v === "string" && /^--sf-[\w-]+$/.test(k)
                )
              ) as Record<string, string>;
              if (Object.keys(safe).length > 0) setOverrides(safe);
            }
          } catch {}
        } else {
          const parsed: Record<string, string> = {};
          const re = /(--sf-[\w-]+)\s*:\s*([^;]+);/g;
          let m;
          while ((m = re.exec(text)) !== null) {
            parsed[m[1].trim()] = m[2].trim();
          }
          if (Object.keys(parsed).length > 0) setOverrides((prev) => ({ ...prev, ...parsed }));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleExport() {
    const css = generateCSS(overrides, { mode: "layer", banner: true });
    const blob = new Blob([css], { type: "text/css" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "slashed-overrides.css";
    a.click();
    URL.revokeObjectURL(url);
  }

  onMount(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key === "z") || e.key === "y")) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && !e.repeat && e.key.toLowerCase() === "k") {
        e.preventDefault();
        showPalette = !showPalette;
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (saveStateTimer) clearTimeout(saveStateTimer);
    };
  });
</script>

{#snippet foldToggleButton(view: "controls" | "preview", Icon: typeof SlidersHorizontal, label: string)}
  <button
    onclick={() => { mobileView = view; }}
    aria-pressed={mobileView === view}
    class={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold transition-colors cursor-pointer ${
      mobileView === view ? "text-indigo-700 dark:text-indigo-300 bg-indigo-500/10" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
    }`}
  >
    <Icon class="w-3.5 h-3.5" /> {label}
    {#if view === "preview" && overridesCount > 0}
      <span class="w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[8px] font-black">{overridesCount > 9 ? "9+" : overridesCount}</span>
    {/if}
  </button>
{/snippet}

<div class="{embedded ? 'w-full h-full' : 'w-screen h-screen'} flex flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0a0f] text-slate-800 dark:text-slate-200 font-sans">
  <!-- Top header bar -->
  <StudioHeader
    {overrides}
    {overridesCount}
    {canUndo}
    {canRedo}
    {hasPendingChanges}
    {saveState}
    onUndo={handleUndo}
    onRedo={handleRedo}
    onResetAll={handleResetAll}
    onImport={handleImport}
    onExport={handleExport}
    onSave={handleSave}
  />

  <!-- Mobile fold toggle: switch between the controls panel and the live
       preview. Lives right under the header (not at the bottom) so it's
       visible without scrolling and doesn't compete with the status bar. -->
  <div class="md:hidden flex items-stretch border-b border-black/8 dark:border-white/8 bg-slate-50 dark:bg-[#0d0d14] shrink-0">
    {@render foldToggleButton("controls", SlidersHorizontal, "Controls")}
    {@render foldToggleButton("preview", Eye, "Preview")}
  </div>

  <!-- Main body: sidebar + left panel + preview -->
  <div class="flex flex-1 min-h-0">
    <!-- Icon nav rail — hidden on mobile while the preview is folded open -->
    <div class={`shrink-0 ${mobileView === "preview" ? "hidden md:flex" : "flex"}`}>
      <SidebarNav
        activeId={domain}
        onSelect={(d) => { domain = d; }}
        overridesByDomain={domainBadges}
      />
    </div>

    <!-- Left domain panel — fills remaining row width on mobile (the icon
         rail above already claims its own space, so w-full here would mean
         100% of the whole row and overflow past it), fixed 360px on desktop -->
    <div class={`flex-1 min-w-0 md:flex-none md:w-[360px] bg-slate-50 dark:bg-[#0c0c15] border-r border-black/8 dark:border-white/8 flex-col min-h-0 ${mobileView === "preview" ? "hidden md:flex" : "flex"}`}>
      <!-- Panel heading -->
      <div class="h-9 flex items-center px-4 border-b border-black/6 dark:border-white/6 shrink-0 gap-2">
        <span data-testid="panel-heading" class="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex-1">
          {DOMAIN_LABELS[domain] ?? domain}
        </span>
        {#if domainOverridesCount > 0}
          <button
            onclick={handleResetDomain}
            data-testid="reset-category"
            title={`Reset ${domainOverridesCount} override${domainOverridesCount !== 1 ? "s" : ""} in ${DOMAIN_LABELS[domain] ?? domain}`}
            class="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw class="w-3 h-3" />
            Reset {domainOverridesCount}
          </button>
        {/if}
      </div>
      <!-- Scrollable panel content -->
      <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
        <DomainPanel
          {domain}
          tokens={ALL_TOKENS}
          {overrides}
          onSet={handleSet}
          onReset={handleReset}
          onBulkChange={handleBulkChange}
          onApplyTheme={handleApplyTheme}
          onSelectDomain={(d) => { domain = d; }}
          onResetAll={handleResetAll}
        />
      </div>
    </div>

    <!-- Right: live preview — full screen on mobile when folded open -->
    <div class={`flex-1 flex-col min-h-0 min-w-0 ${mobileView === "controls" ? "hidden md:flex" : "flex"}`}>
      <PreviewPanel
        {overrides}
        {previewTheme}
        {previewWidth}
        {previewMotion}
        {previewTemplate}
        onThemeChange={(t) => { previewTheme = t; }}
        onWidthChange={(w) => { previewWidth = w; }}
        onMotionChange={(m) => { previewMotion = m; }}
        onTemplateChange={(t) => { previewTemplate = t; }}
      />
    </div>
  </div>

  <!-- Status bar -->
  <StatusBar
    {overridesCount}
    domain={DOMAIN_LABELS[domain] ?? domain}
  />

  <!-- Command palette -->
  {#if showPalette}
    <CommandPalette
      tokens={ALL_TOKENS}
      {overrides}
      onNavigate={(d) => { domain = d; }}
      onClose={() => { showPalette = false; }}
    />
  {/if}
</div>
