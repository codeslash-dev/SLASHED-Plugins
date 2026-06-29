<script lang="ts">
  import { onMount } from 'svelte';
  import type { PreviewTemplate, PresetTheme, SlashedToken } from './types';
  import StudioHeader from './components/shell/StudioHeader.svelte';
  import SidebarNav from './components/shell/SidebarNav.svelte';
  import StatusBar from './components/shell/StatusBar.svelte';
  import PreviewPanel from './components/shell/PreviewPanel.svelte';
  import DomainPanel from './components/DomainPanel.svelte';
  import { fa } from './lib/codec';
  import { loadInitialOverrides, injectLivePreview, saveOverrides } from './lib/persistence';
  import { domainOf } from './lib/domains';
  import tokensRaw from './data/api-index.generated.json';
  import CommandPalette from './components/CommandPalette.svelte';

  const ALL_TOKENS = ((tokensRaw as any).tokens ?? tokensRaw) as SlashedToken[];

  const DOMAIN_LABELS: Record<string, string> = {
    home: "Home", colors: "Colors", typography: "Typography", spacing: "Spacing",
    layout: "Layout", borders: "Borders", shadows: "Shadows", motion: "Motion",
    effects: "Effects", macros: "Macros", misc: "Misc", themes: "Themes",
    wcag: "WCAG", setup: "Install", cheatsheet: "Classes",
  };

  function overridesByDomain(ov: Record<string, string>): Record<string, number> {
    const map: Record<string, number> = {};
    for (const k of Object.keys(ov)) {
      const dom = domainOf(k);
      map[dom] = (map[dom] ?? 0) + 1;
    }
    return map;
  }

  // Core state
  let overrides = $state<Record<string, string>>(loadInitialOverrides());
  let past = $state<Record<string, string>[]>([]);
  let future = $state<Record<string, string>[]>([]);

  let domain = $state("home");
  let showPalette = $state(false);
  let previewTheme = $state<"light" | "dark">("light");
  let previewWidth = $state<"fluid" | "mobile" | "tablet" | "desktop">("fluid");
  let previewMotion = $state<"normal" | "slow" | "none">("normal");
  let previewTemplate = $state<PreviewTemplate>("marketing");

  // Derived
  let overridesCount = $derived(Object.keys(overrides).length);
  let domainBadges = $derived(overridesByDomain(overrides));
  let canUndo = $derived(past.length > 0);
  let canRedo = $derived(future.length > 0);

  // Save state — hasPendingChanges is derived so undo/redo update it automatically.
  let lastSavedSnapshot = $state(JSON.stringify(overrides));
  let saveState = $state<'idle' | 'saving' | 'saved'>('idle');
  let hasPendingChanges = $derived(JSON.stringify(overrides) !== lastSavedSnapshot);
  let saveStateTimer: ReturnType<typeof setTimeout> | null = null;

  // Live CSS preview on every change — actual persistence only on explicit save.
  $effect(() => { injectLivePreview(overrides); });

  function setOverrides(updater: ((prev: Record<string, string>) => Record<string, string>) | Record<string, string>) {
    const prev = overrides;
    const next = typeof updater === "function" ? updater(prev) : updater;
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      past = [...past.slice(-49), prev];
      future = [];
      if (saveState === 'saved') saveState = 'idle';
    }
    overrides = next;
  }

  async function handleSave() {
    if (!hasPendingChanges || saveState === 'saving') return;
    const snapshot = JSON.stringify(overrides);
    saveState = 'saving';
    try {
      await saveOverrides(overrides);
      // Only mark clean if overrides haven't changed since save started.
      if (JSON.stringify(overrides) === snapshot) {
        lastSavedSnapshot = snapshot;
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
      saveState = 'idle';
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

  function handleApplyTheme(theme: PresetTheme) {
    if (theme.id === "default") {
      setOverrides({});
    } else {
      handleBulkChange(theme.overrides as Record<string, string | null>);
    }
  }

  function handleResetAll() {
    setOverrides({});
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
              const safe = Object.fromEntries(
                Object.entries(data as Record<string, unknown>).filter(([, v]) => typeof v === "string")
              ) as Record<string, string>;
              setOverrides(safe);
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
    const css = fa(overrides, { mode: "layer", banner: true });
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

<div class="w-screen h-screen flex flex-col overflow-hidden bg-[#0a0a0f] text-slate-200 font-sans">
  <!-- Top header bar -->
  <StudioHeader
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

  <!-- Main body: sidebar + left panel + preview -->
  <div class="flex flex-1 min-h-0">
    <!-- Icon nav rail -->
    <SidebarNav
      activeId={domain}
      onSelect={(d) => { domain = d; }}
      overridesByDomain={domainBadges}
    />

    <!-- Left domain panel — fixed 360px -->
    <div class="w-[360px] shrink-0 bg-[#0c0c15] border-r border-white/8 flex flex-col min-h-0">
      <!-- Panel heading -->
      <div class="h-9 flex items-center px-4 border-b border-white/6 shrink-0">
        <span data-testid="panel-heading" class="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex-1">
          {DOMAIN_LABELS[domain] ?? domain}
        </span>
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

    <!-- Right: live preview -->
    <div class="flex-1 flex flex-col min-h-0 min-w-0">
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
