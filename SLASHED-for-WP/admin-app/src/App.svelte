<script lang="ts">
  import { onMount } from 'svelte';
  import type { PreviewTemplate, PresetTheme, SlashedToken } from './types';
  import StudioHeader from './components/shell/StudioHeader.svelte';
  import SidebarNav from './components/shell/SidebarNav.svelte';
  import StatusBar from './components/shell/StatusBar.svelte';
  import PreviewPanel from './components/shell/PreviewPanel.svelte';
  import DomainPanel from './components/DomainPanel.svelte';
  import { fa } from './lib/codec';
  import { loadInitialOverrides, persistOverrides } from './lib/persistence';
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

  // Persist + URL sync (standalone) or REST save (WP) + live style injection.
  $effect(() => {
    persistOverrides(overrides);
  });

  function setOverrides(updater: ((prev: Record<string, string>) => Record<string, string>) | Record<string, string>) {
    const prev = overrides;
    const next = typeof updater === "function" ? updater(prev) : updater;
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      past = [...past.slice(-49), prev];
      future = [];
    }
    overrides = next;
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
            if (typeof data === "object") setOverrides(data);
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
      if ((e.ctrlKey || e.metaKey) && !e.repeat && e.key.toLowerCase() === "k") {
        e.preventDefault();
        showPalette = !showPalette;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
</script>

<div class="w-screen h-screen flex flex-col overflow-hidden bg-[#0a0a0f] text-slate-200 font-sans">
  <!-- Top header bar -->
  <StudioHeader
    {overridesCount}
    {canUndo}
    {canRedo}
    onUndo={handleUndo}
    onRedo={handleRedo}
    onResetAll={handleResetAll}
    onImport={handleImport}
    onExport={handleExport}
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
