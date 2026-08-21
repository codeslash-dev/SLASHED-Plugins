<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { SlidersHorizontal, Eye, RotateCcw, ChevronDown } from '@lucide/svelte';
  import type { PreviewTemplate, SlashedToken, ApiIndex } from './types';
  import { PANEL_TO_TAB } from './lib/preview';
  import StudioHeader from './components/shell/StudioHeader.svelte';
  import SidebarNav from './components/shell/SidebarNav.svelte';
  import StatusBar from './components/shell/StatusBar.svelte';
  import PreviewPanel from './components/shell/PreviewPanel.svelte';
  import DomainPanel from './components/DomainPanel.svelte';
  import { generateCSS } from './lib/codec';
  import { loadInitialOverrides, injectLivePreview, saveOverrides, hasWpBoot } from './lib/persistence';
  import { domainOf } from './lib/domains';
  import { parseImport, summarizeImport, type ImportReport } from './lib/importOverrides';
  import tokensRaw from './data/api-index.generated.json';
  import CommandPalette from './components/CommandPalette.svelte';

  const ALL_TOKENS = ((tokensRaw as ApiIndex).tokens ?? tokensRaw) as SlashedToken[];
  const LIVE_TOKEN_NAMES = new Set(ALL_TOKENS.map((t) => t.name));

  const DOMAIN_LABELS: Record<string, string> = {
    home: "Home", colors: "Colors", typography: "Typography", spacing: "Spacing",
    layout: "Layout", borders: "Shape", depth: "Depth", motion: "Motion",
    macros: "Macros", misc: "System", components: "Components",
    changes: "Changes", themes: "Presets", wcag: "Accessibility",
    setup: "Install & export", cheatsheet: "Reference",
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
  // Mobile category drawer (replaces the cramped icon rail on narrow screens).
  let navDrawerOpen = $state(false);
  // When the drawer (a modal dialog) opens, move focus into it so keyboard users
  // land inside the modal — the dialog's Escape handler then receives the event,
  // and screen readers announce it. On close, focus returns to the trigger.
  function drawerFocus(node: HTMLElement) {
    const prev = document.activeElement as HTMLElement | null;
    node.focus();
    return { destroy() { prev?.focus?.(); } };
  }
  // Close on Escape and trap Tab/Shift+Tab inside the modal drawer so keyboard
  // focus can't wander to the controls behind an aria-modal dialog.
  function onDrawerKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") { navDrawerOpen = false; return; }
    if (e.key !== "Tab") return;
    const root = e.currentTarget as HTMLElement;
    const items = [...root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }
  // One-shot deep-link request from search: navigate to a domain AND focus a
  // specific token's row in its All-tokens list. The nonce lets the same token
  // be re-focused (a second search for it still scrolls/highlights).
  let focusRequest = $state<{ token: string; nonce: number } | null>(null);
  let focusNonce = 0;
  // Transient feedback after an import (the old flow failed silently).
  let importStatus = $state<string | null>(null);
  let importStatusTimer: ReturnType<typeof setTimeout> | null = null;
  // Parsed-but-not-yet-applied import, awaiting a Merge/Replace choice.
  let importPreview = $state<{ overrides: Record<string, string>; report: ImportReport; filename: string } | null>(null);

  function navigateTo(domainId: string, token?: string) {
    domain = domainId;
    if (token) {
      focusNonce += 1;
      focusRequest = { token, nonce: focusNonce };
    } else {
      focusRequest = null;
    }
    mobileView = "controls";
  }
  // On narrow screens the controls panel and the live preview can't both fit, so
  // we show one at a time and let the user fold between them (desktop shows both).
  let mobileView = $state<"controls" | "preview">("controls");
  let previewTheme = $state<"light" | "dark">("light");
  let previewWidth = $state<"fluid" | "mobile" | "tablet" | "desktop">("fluid");
  let previewMotion = $state<"normal" | "slow" | "none">("normal");
  let previewTemplate = $state<PreviewTemplate>("color");

  // Lifecycle / reference tools have no live visual sample, so the preview used
  // to sit there showing an irrelevant Color gallery over half the screen.
  // For these the preview is hidden and the panel takes the full width instead.
  // (Accessibility keeps the preview — its contrast checker reads the rendered
  // colours from the iframe.)
  const FULLWIDTH_DOMAINS = new Set(["changes", "themes", "setup", "cheatsheet"]);
  let hidePreview = $derived(FULLWIDTH_DOMAINS.has(domain));
  // A tool screen has nothing to fold to, so keep the mobile view on controls.
  $effect(() => { if (hidePreview) untrack(() => { mobileView = "controls"; }); });

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

  // Auto-follow: switching the control panel switches the preview to the tab
  // that visualises it (edit Colors → see the Color gallery). Fires only on a
  // panel change, so a manual preview-tab click persists until the next switch.
  // Panels with no visual counterpart (home/install/classes) leave the tab as-is.
  $effect(() => {
    const tab = PANEL_TO_TAB[domain];
    if (tab) untrack(() => { previewTemplate = tab; });
  });

  // Each user-visible edit is its own undo step. Controls currently do not
  // expose a reliable gesture boundary, so time-based coalescing could merge
  // two distinct actions on the same token.

  function setOverrides(updater: ((prev: Record<string, string>) => Record<string, string>) | Record<string, string>) {
    const prev = overrides;
    const next = typeof updater === "function" ? updater(prev) : updater;
    if (!shallowEq(prev, next)) {
      // Keep discrete edits independently undoable. Range input events are
      // intentionally not time-grouped until the control provides boundaries.
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

  function showImportStatus(msg: string) {
    importStatus = msg;
    if (importStatusTimer) clearTimeout(importStatusTimer);
    importStatusTimer = setTimeout(() => { importStatus = null; importStatusTimer = null; }, 6000);
  }

  function applyImport(mode: "merge" | "replace") {
    if (!importPreview) return;
    const { overrides: imported, report } = importPreview;
    setOverrides(mode === "replace" ? { ...imported } : (prev) => ({ ...prev, ...imported }));
    showImportStatus(`${mode === "replace" ? "Replaced" : "Merged"} · ${summarizeImport(report)}`);
    importPreview = null;
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
        if (!text) { showImportStatus("Nothing imported — the selected file is empty."); return; }
        // One validated pipeline for both CSS and JSON: sanitised, migrated,
        // merged (non-destructive), and always reported — no more silent no-ops.
        const { overrides: imported, report } = parseImport(text, file.name, LIVE_TOKEN_NAMES);
        // Nothing usable → just report; otherwise open the Merge/Replace chooser
        // so the user reviews what will change before it's applied.
        if (report.malformed || Object.keys(imported).length === 0) {
          showImportStatus(summarizeImport(report));
          return;
        }
        importPreview = { overrides: imported, report, filename: file.name };
      };
      reader.onerror = () => { showImportStatus("Import failed — the selected file could not be read."); };
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
      if (e.key === "Escape" && navDrawerOpen) {
        e.preventDefault();
        navDrawerOpen = false;
        return;
      }
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
      if (importStatusTimer) clearTimeout(importStatusTimer);
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
    onOpenSearch={() => { showPalette = true; }}
  />

  <!-- Import feedback: a transient banner (the previous import flow gave none). -->
  {#if importStatus}
    <div role="status" class="shrink-0 flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border-b border-indigo-500/20 text-[11px] text-indigo-700 dark:text-indigo-300">
      <span class="flex-1">{importStatus}</span>
      <button onclick={() => { importStatus = null; }} aria-label="Dismiss" class="text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-200 cursor-pointer font-bold">×</button>
    </div>
  {/if}

  <!-- Mobile fold toggle: switch between the controls panel and the live
       preview. Lives right under the header (not at the bottom) so it's
       visible without scrolling and doesn't compete with the status bar.
       Hidden on tool screens, which have no preview to fold to. -->
  {#if !hidePreview}
    <div class="md:hidden flex items-stretch border-b border-black/8 dark:border-white/8 bg-slate-50 dark:bg-[#0d0d14] shrink-0">
      {@render foldToggleButton("controls", SlidersHorizontal, "Controls")}
      {@render foldToggleButton("preview", Eye, "Preview")}
    </div>
  {/if}

  <!-- Main body: sidebar + left panel + preview -->
  <div class="flex flex-1 min-h-0">
    <!-- Icon nav rail — desktop only. On mobile the category drawer (opened
         from the panel heading) replaces it, so the narrow screen isn't eaten
         by an unlabelled 56px strip. -->
    <div class="shrink-0 hidden md:flex">
      <SidebarNav
        activeId={domain}
        onSelect={(d) => { navigateTo(d); }}
        overridesByDomain={domainBadges}
      />
    </div>

    <!-- Left domain panel — fixed 360px alongside the preview, but full width
         on tool screens where the preview is hidden. On mobile it fills the row
         (the icon rail already claims its own space). -->
    <div class={`min-w-0 bg-slate-50 dark:bg-[#0c0c15] border-r border-black/8 dark:border-white/8 flex-col min-h-0 ${
      hidePreview ? "flex-1 flex" : `flex-1 md:flex-none md:w-[360px] ${mobileView === "preview" ? "hidden md:flex" : "flex"}`
    }`}>
      <!-- Panel heading -->
      <div class="h-9 flex items-center px-4 border-b border-black/6 dark:border-white/6 shrink-0 gap-2">
        <!-- On mobile this is the category-drawer trigger (chevron); on desktop
             it's a static label (the rail handles navigation there). -->
        <div data-testid="panel-heading" class="flex items-center gap-1.5 flex-1 min-w-0">
          <!-- Mobile: the interactive category-drawer trigger. -->
          <button
            onclick={() => { navDrawerOpen = true; }}
            aria-label="Choose a panel"
            class="md:hidden flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer"
          >
            <span class="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest truncate">
              {DOMAIN_LABELS[domain] ?? domain}
            </span>
            <ChevronDown class="w-3 h-3 text-slate-400 shrink-0" />
          </button>
          <!-- Desktop: a static label (the rail handles navigation there); no
               button, so it never enters the tab order or opens a hidden drawer. -->
          <span class="hidden md:inline text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest truncate">
            {DOMAIN_LABELS[domain] ?? domain}
          </span>
        </div>
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
          focusToken={focusRequest?.token ?? null}
          focusNonce={focusRequest?.nonce ?? 0}
          onSet={handleSet}
          onReset={handleReset}
          onBulkChange={handleBulkChange}
          onApplyTheme={handleApplyTheme}
          onSelectDomain={(d) => { navigateTo(d); }}
          onResetAll={handleResetAll}
        />
      </div>
    </div>

    <!-- Right: live preview — full screen on mobile when folded open. Omitted
         entirely on tool screens (Changes / Presets / Install & export /
         Reference), which have no live sample. -->
    {#if !hidePreview}
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
    {/if}
  </div>

  <!-- Status bar -->
  <StatusBar
    {overridesCount}
    domain={DOMAIN_LABELS[domain] ?? domain}
  />

  <!-- Mobile category drawer — labelled, grouped navigation (the desktop rail
       equivalent). md:hidden so it never appears on desktop. -->
  {#if navDrawerOpen}
    <div
      class="md:hidden fixed inset-0 z-40 flex"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a panel"
      tabindex="-1"
      use:drawerFocus
      onkeydown={onDrawerKeydown}
    >
      <div class="w-64 max-w-[80vw] h-full shadow-2xl overflow-y-auto">
        <SidebarNav
          expanded
          activeId={domain}
          onSelect={(d) => { domain = d; navDrawerOpen = false; mobileView = "controls"; }}
          overridesByDomain={domainBadges}
        />
      </div>
      <button
        class="flex-1 h-full bg-black/50 backdrop-blur-sm cursor-pointer"
        aria-label="Close menu"
        onclick={() => { navDrawerOpen = false; }}
      ></button>
    </div>
  {/if}

  <!-- Import chooser — review the parsed report, then Merge or Replace. -->
  {#if importPreview}
    {@const r = importPreview.report}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Import overrides"
      tabindex="-1"
      onkeydown={(e) => { if (e.key === "Escape") importPreview = null; }}
    >
      <div class="w-[420px] max-w-full bg-white dark:bg-[#111118] border border-black/12 dark:border-white/12 rounded-2xl shadow-2xl overflow-hidden">
        <div class="px-4 py-3 border-b border-black/8 dark:border-white/8">
          <h3 class="text-[13px] font-bold text-slate-800 dark:text-slate-100">Import overrides</h3>
          <p class="text-[10px] text-slate-500 mt-0.5 font-mono truncate">{importPreview.filename}</p>
        </div>

        <div class="px-4 py-3 space-y-1.5 text-[11px]">
          <div class="flex justify-between"><span class="text-slate-500">Tokens to import</span><span class="font-bold text-slate-800 dark:text-slate-200">{r.accepted}</span></div>
          {#if r.renamed > 0}<div class="flex justify-between"><span class="text-slate-500">Migrated (renamed)</span><span class="font-mono text-sky-600 dark:text-sky-400">{r.renamed}</span></div>{/if}
          {#if r.removed > 0}<div class="flex justify-between"><span class="text-slate-500">Dropped (removed by framework)</span><span class="font-mono text-slate-500">{r.removed}</span></div>{/if}
          {#if r.unknown > 0}<div class="flex justify-between"><span class="text-slate-500">Unknown in this build</span><span class="font-mono text-amber-600 dark:text-amber-400">{r.unknown}</span></div>{/if}
          {#if r.invalid.length > 0}<div class="flex justify-between"><span class="text-slate-500">Skipped (invalid)</span><span class="font-mono text-rose-600 dark:text-rose-400">{r.invalid.length}</span></div>{/if}
          {#if r.collisions > 0}<div class="flex justify-between"><span class="text-slate-500">Skipped (migration collision)</span><span class="font-mono text-amber-600 dark:text-amber-400">{r.collisions}</span></div>{/if}
          <p class="text-[10px] text-slate-400 dark:text-slate-600 pt-1.5 leading-relaxed">
            <span class="font-semibold">Merge</span> keeps your current {overridesCount} override{overridesCount !== 1 ? "s" : ""} and adds these on top.
            <span class="font-semibold">Replace</span> discards the current set first.
          </p>
        </div>

        <div class="px-4 py-3 border-t border-black/8 dark:border-white/8 flex items-center justify-end gap-2">
          <button
            onclick={() => { importPreview = null; }}
            class="px-3 py-1.5 text-[11px] rounded-lg bg-black/8 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-black/12 dark:hover:bg-white/12 transition-colors cursor-pointer"
          >Cancel</button>
          <button
            onclick={() => applyImport("replace")}
            class="px-3 py-1.5 text-[11px] rounded-lg bg-rose-600/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-600/20 transition-colors cursor-pointer"
          >Replace</button>
          <button
            onclick={() => applyImport("merge")}
            class="px-3 py-1.5 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition-colors cursor-pointer"
          >Merge</button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Command palette -->
  {#if showPalette}
    <CommandPalette
      tokens={ALL_TOKENS}
      {overrides}
      onNavigate={(d, token) => {
        navigateTo(d, token);
      }}
      onClose={() => { showPalette = false; }}
    />
  {/if}
</div>
