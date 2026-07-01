<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import type { SlashedToken } from './types';
  import SidebarNav from './components/shell/SidebarNav.svelte';
  import DomainPanel from './components/DomainPanel.svelte';
  import CommandPalette from './components/CommandPalette.svelte';
  import { fa } from './lib/codec';
  import { loadInitialOverrides, injectLivePreview, saveOverrides } from './lib/persistence';
  import { registerPreviewDoc } from './lib/previewResolver.svelte';
  import { domainOf } from './lib/domains';
  import tokensRaw from './data/api-index.generated.json';
  import {
    ChevronRight, Undo2, Redo2, Trash2, FolderOpen, Download, Save, Check, Loader2,
  } from 'lucide-svelte';

  const ALL_TOKENS = ((tokensRaw as any).tokens ?? tokensRaw) as SlashedToken[];

  const LS_OPEN_KEY   = 'slashed-overlay/open';
  const LS_DOMAIN_KEY = 'slashed-overlay/domain';

  const DOMAIN_LABELS: Record<string, string> = {
    home: 'Home', colors: 'Colors', typography: 'Typography', spacing: 'Spacing',
    layout: 'Layout', borders: 'Borders', shadows: 'Shadows', motion: 'Motion',
    effects: 'Effects', macros: 'Macros', misc: 'Misc', themes: 'Themes',
    wcag: 'WCAG', setup: 'Install', cheatsheet: 'Classes',
  };

  function overridesByDomain(ov: Record<string, string>): Record<string, number> {
    const map: Record<string, number> = {};
    for (const k of Object.keys(ov)) {
      const dom = domainOf(k);
      map[dom] = (map[dom] ?? 0) + 1;
    }
    return map;
  }

  function readBool(key: string, fallback: boolean): boolean {
    try { const v = localStorage.getItem(key); return v === null ? fallback : v !== 'false'; } catch { return fallback; }
  }
  function readStr(key: string, fallback: string): string {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }

  let isOpen    = $state(readBool(LS_OPEN_KEY, true));
  let isMobile  = $state(typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false);
  let overrides = $state<Record<string, string>>(loadInitialOverrides());
  let past      = $state<Record<string, string>[]>([]);
  let future    = $state<Record<string, string>[]>([]);
  let domain    = $state(readStr(LS_DOMAIN_KEY, 'home'));
  let showPalette = $state(false);
  let showResetConfirm = $state(false);
  let resetCancelBtn = $state<HTMLButtonElement | null>(null);
  let resetConfirmBtn = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (showResetConfirm) {
      tick().then(() => resetCancelBtn?.focus());
    }
  });

  let overridesCount = $derived(Object.keys(overrides).length);
  let domainBadges   = $derived(overridesByDomain(overrides));
  let canUndo        = $derived(past.length > 0);
  let canRedo        = $derived(future.length > 0);

  function shallowEq(a: Record<string, string>, b: Record<string, string>): boolean {
    const ak = Object.keys(a);
    if (ak.length !== Object.keys(b).length) return false;
    return ak.every((k) => a[k] === b[k]);
  }

  let lastSavedOverrides = $state<Record<string, string>>(untrack(() => ({ ...overrides })));
  let saveState = $state<'idle' | 'saving' | 'saved'>('idle');
  let hasPendingChanges = $derived(!shallowEq(overrides, lastSavedOverrides));
  let saveStateTimer: ReturnType<typeof setTimeout> | null = null;

  function syncHostBounds() {
    const host = document.getElementById('slashed-frontend-overlay');
    if (!host) return;

    const adminBarHeight = 'var(--wp-admin--admin-bar--height, 32px)';
    host.style.position = 'fixed';
    host.style.right = '0';
    host.style.zIndex = '100000';
    host.style.pointerEvents = 'auto';

    if (isOpen) {
      host.style.top = adminBarHeight;
      host.style.width = isMobile ? '100vw' : '420px';
      host.style.height = `calc(100vh - ${adminBarHeight})`;
    } else {
      host.style.top = `calc(${adminBarHeight} + 16px)`;
      host.style.width = '40px';
      host.style.height = '64px';
    }
  }

  // Panels (e.g. ColorsPanel's semantic preview) resolve real computed colors
  // via previewResolver, which normally reads them out of the dedicated
  // preview iframe App.svelte/PreviewPanel renders. The overlay has no such
  // iframe — the host page itself *is* the live preview, per the class doc
  // comment in class-frontend-configurator.php — so without registering it
  // here, resolveColor()/resolveColorForTheme() always return "" and every
  // swatch that depends on them (the whole Semantic colors grid) renders
  // blank/transparent instead of the resolved color.
  $effect(() => {
    injectLivePreview(overrides);
    // registerPreviewDoc() bumps previewVersion itself (on both the
    // first-registration and already-registered paths), so panels reading
    // previewVersion.value re-resolve on every override change without a
    // separate explicit bump here.
    registerPreviewDoc(document);
  });

  // On desktop push page content left; on mobile the panel is a full overlay.
  $effect(() => {
    if (!isMobile && isOpen) {
      document.documentElement.classList.add('sf-panel-active');
    } else {
      document.documentElement.classList.remove('sf-panel-active');
    }
  });

  $effect(() => { syncHostBounds(); });

  $effect(() => {
    try { localStorage.setItem(LS_OPEN_KEY,   String(isOpen)); } catch {}
  });

  $effect(() => {
    try { localStorage.setItem(LS_DOMAIN_KEY, domain); } catch {}
  });

  function toggle() { isOpen = !isOpen; }

  function setOverrides(updater: ((prev: Record<string, string>) => Record<string, string>) | Record<string, string>) {
    const prev = overrides;
    const next = typeof updater === 'function' ? updater(prev) : updater;
    if (!shallowEq(prev, next)) {
      past = [...past.slice(-49), prev];
      future = [];
      if (saveState === 'saved') saveState = 'idle';
    }
    overrides = next;
  }

  async function handleSave() {
    if (!hasPendingChanges || saveState === 'saving') return;
    const snapshot = { ...overrides };
    saveState = 'saving';
    try {
      await saveOverrides(overrides);
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
      saveState = 'idle';
    }
  }

  function handleSet(name: string, value: string)       { setOverrides((p) => ({ ...p, [name]: value })); }
  function handleReset(name: string)                    { setOverrides((p) => { const n = { ...p }; delete n[name]; return n; }); }
  function handleBulkChange(patch: Record<string, string | null>) {
    setOverrides((p) => {
      const n = { ...p };
      for (const [k, v] of Object.entries(patch)) { if (v === null) delete n[k]; else n[k] = v; }
      return n;
    });
  }
  // Applying a saved theme replaces the entire override set with the snapshot.
  function handleApplyTheme(themeOverrides: Record<string, string>) {
    setOverrides({ ...themeOverrides });
  }
  function handleResetAll() { showResetConfirm = true; }
  function confirmResetAll() { showResetConfirm = false; setOverrides({}); }
  function cancelResetAll() { showResetConfirm = false; }

  function handleUndo() {
    if (!past.length) return;
    const prev = past[past.length - 1];
    future = [overrides, ...future];
    past   = past.slice(0, -1);
    overrides = prev;
  }
  function handleRedo() {
    if (!future.length) return;
    const next = future[0];
    past   = [...past, overrides];
    future = future.slice(1);
    overrides = next;
  }

  function handleExport() {
    const css  = fa(overrides, { mode: 'layer', banner: true });
    const blob = new Blob([css], { type: 'text/css' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'slashed-overrides.css'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.css,.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (!text) return;
        if (file.name.endsWith('.json')) {
          try {
            const data = JSON.parse(text);
            if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
              // Restrict to real token-name keys too, not just string values — an
              // imported JSON file is untrusted input and its keys end up as
              // object property names downstream (CodeQL: remote-property-injection).
              const safe = Object.fromEntries(
                Object.entries(data as Record<string, unknown>).filter(
                  ([k, v]) => typeof v === 'string' && /^--sf-[\w-]+$/.test(k)
                )
              ) as Record<string, string>;
              setOverrides(safe);
            }
          } catch {}
        } else {
          const parsed: Record<string, string> = {};
          const re = /(--sf-[\w-]+)\s*:\s*([^;]+);/g;
          let m;
          while ((m = re.exec(text)) !== null) parsed[m[1].trim()] = m[2].trim();
          if (Object.keys(parsed).length) setOverrides((p) => ({ ...p, ...parsed }));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  onMount(() => {
    // Inject a stylesheet that pushes page content left on desktop.
    // Using padding-right + box-sizing on <html> is reliable across WP themes
    // even when body/html have overflow-x: hidden or other overflow settings.
    const pushStyle = document.createElement('style');
    pushStyle.id = 'sf-panel-push';
    pushStyle.textContent = [
      'html { transition: padding-right 200ms ease-in-out; }',
      'html.sf-panel-active { padding-right: 420px !important; overflow-x: clip; }',
    ].join('\n');
    document.head.appendChild(pushStyle);

    const mql = window.matchMedia('(max-width: 768px)');
    const onMql = (e: MediaQueryListEvent) => { isMobile = e.matches; };
    mql.addEventListener('change', onMql);

    const keydown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (!isOpen) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === 'z')                  { e.preventDefault(); handleUndo(); }
      if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && key === 'z') || key === 'y')) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && !e.repeat && key === 'k')                     { e.preventDefault(); showPalette = !showPalette; }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && key === 's')                   { e.preventDefault(); handleSave(); }
    };
    const onToggle = () => toggle();
    window.addEventListener('keydown', keydown);
    document.addEventListener('slashed:toggle-overlay', onToggle);
    return () => {
      pushStyle.remove();
      document.documentElement.classList.remove('sf-panel-active');
      mql.removeEventListener('change', onMql);
      window.removeEventListener('keydown', keydown);
      document.removeEventListener('slashed:toggle-overlay', onToggle);
      if (saveStateTimer) clearTimeout(saveStateTimer);
    };
  });
</script>

<!--
  Floating trigger tab — visible only when the panel is closed.
  Positioned just below the WP admin bar (which is 32px tall at desktop).
-->
{#if !isOpen}
  <button
    onclick={toggle}
    aria-label="Open SLASHED token editor"
    class="fixed right-0 z-[100000] pointer-events-auto bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl flex flex-col items-center justify-center gap-1 px-1.5 py-3 rounded-l-xl transition-colors cursor-pointer"
    style="top: calc(var(--wp-admin--admin-bar--height, 32px) + 16px);"
  >
    <span class="text-sm font-black leading-none select-none">/</span>
    <ChevronRight class="w-3 h-3 opacity-70 rotate-180" />
  </button>
{/if}

<!--
  Main overlay panel — slides in/out via CSS transform.
  Always rendered so domain-panel state survives collapse/expand cycles.
  z-index 100000 puts it above the WP admin bar (z-index 99999).
-->
<div
  class="fixed right-0 z-[100000] pointer-events-auto flex flex-col bg-[#0a0a0f] text-slate-200 font-sans shadow-2xl shadow-black/60 border-l border-white/8 transition-transform duration-200 ease-in-out"
  class:translate-x-full={!isOpen}
  class:translate-x-0={isOpen}
  style:visibility={isOpen ? undefined : 'hidden'}
  style="top: var(--wp-admin--admin-bar--height, 32px); width: {isMobile ? '100vw' : '420px'}; height: calc(100vh - var(--wp-admin--admin-bar--height, 32px));"
  aria-hidden={!isOpen}
  inert={!isOpen || undefined}
  class:pointer-events-none={!isOpen}
>
  <!-- Compact header (40px) -->
  <div class="h-10 bg-[#0d0d14] border-b border-white/8 flex items-center px-2 gap-1.5 shrink-0">
    <div class="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm leading-none shrink-0 shadow-lg shadow-indigo-600/30 select-none">
      /
    </div>
    <span class="text-[10px] font-bold text-white tracking-tight shrink-0">SLASHED</span>
    <span class="text-[9px] text-slate-500 font-mono uppercase tracking-widest truncate min-w-0">
      {DOMAIN_LABELS[domain] ?? domain}
    </span>
    {#if overridesCount > 0}
      <span class="shrink-0 text-[9px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold px-1.5 py-0.5 rounded-full font-mono leading-none">
        {overridesCount}
      </span>
    {/if}

    <div class="flex-1 min-w-0"></div>

    <button
      onclick={handleSave}
      disabled={!hasPendingChanges || saveState === 'saving'}
      title={hasPendingChanges ? "Save changes (Ctrl+S)" : "No unsaved changes"}
      aria-label={saveState === 'saving' ? 'Saving changes' : hasPendingChanges ? 'Save changes' : 'No unsaved changes'}
      class={[
        "p-1 rounded transition-colors cursor-pointer shrink-0 disabled:pointer-events-none",
        saveState === 'saved'
          ? "text-emerald-300"
          : hasPendingChanges
            ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            : "text-slate-500 opacity-40",
      ].join(' ')}
    >
      {#if saveState === 'saving'}
        <Loader2 class="w-3 h-3 animate-spin" />
      {:else if saveState === 'saved'}
        <Check class="w-3 h-3" />
      {:else}
        <Save class="w-3 h-3" />
      {/if}
    </button>

    <button onclick={handleUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"
      class="p-1 rounded text-slate-400 hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer shrink-0">
      <Undo2 class="w-3 h-3" />
    </button>
    <button onclick={handleRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
      class="p-1 rounded text-slate-400 hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer shrink-0">
      <Redo2 class="w-3 h-3" />
    </button>

    <div class="w-px h-3.5 bg-white/10 mx-0.5 shrink-0"></div>

    <button onclick={handleImport} title="Import CSS / JSON"
      class="p-1 rounded text-slate-400 hover:text-white hover:bg-white/8 transition-all cursor-pointer shrink-0">
      <FolderOpen class="w-3 h-3" />
    </button>
    <button onclick={handleExport} disabled={overridesCount === 0} title="Export CSS"
      class="p-1 rounded text-slate-400 hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer shrink-0">
      <Download class="w-3 h-3" />
    </button>
    <button onclick={handleResetAll} disabled={overridesCount === 0} title="Reset all overrides"
      class="p-1 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer shrink-0">
      <Trash2 class="w-3 h-3" />
    </button>

    <div class="w-px h-3.5 bg-white/10 mx-0.5 shrink-0"></div>

    <button onclick={toggle} title="Collapse panel"
      class="p-1 rounded text-slate-400 hover:text-white hover:bg-white/8 transition-all cursor-pointer shrink-0">
      <ChevronRight class="w-3 h-3" />
    </button>
  </div>

  <!-- Body: icon nav rail + domain panel -->
  <div class="flex flex-1 min-h-0">
    <!-- Reuse the same SidebarNav from the full editor -->
    <SidebarNav
      activeId={domain}
      onSelect={(d) => { domain = d; }}
      overridesByDomain={domainBadges}
    />

    <!-- Domain panel fills remaining width (~364px) -->
    <div class="flex-1 bg-[#0c0c15] flex flex-col min-h-0">
      <div class="h-9 flex items-center px-4 border-b border-white/6 shrink-0">
        <span class="text-[11px] font-bold text-slate-300 uppercase tracking-widest flex-1">
          {DOMAIN_LABELS[domain] ?? domain}
        </span>
      </div>
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
  </div>

  <!-- Command palette (Ctrl+K) rendered above the panel content -->
  {#if showPalette}
    <CommandPalette
      tokens={ALL_TOKENS}
      {overrides}
      onNavigate={(d) => { domain = d; }}
      onClose={() => { showPalette = false; }}
    />
  {/if}

  <!-- Reset-all confirmation dialog -->
  {#if showResetConfirm}
    <div
      class="absolute inset-0 z-[100001] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-confirm-title"
      tabindex="-1"
      onkeydown={(e) => {
        if (e.key === 'Escape') { e.stopPropagation(); cancelResetAll(); }
        if (e.key === 'Tab') {
          e.preventDefault();
          const focused = document.activeElement;
          if (focused === resetCancelBtn) resetConfirmBtn?.focus();
          else resetCancelBtn?.focus();
        }
      }}
    >
      <div class="bg-[#1a1a2e] border border-white/10 rounded-xl p-5 mx-4 shadow-2xl w-full max-w-[320px]">
        <h3 id="reset-confirm-title" class="text-white font-bold text-sm mb-2">Reset all overrides?</h3>
        <p class="text-slate-400 text-xs mb-4">
          This will clear all {overridesCount} customisation{overridesCount !== 1 ? 's' : ''}.
          You can still undo this before saving.
        </p>
        <div class="flex gap-2 justify-end">
          <button
            bind:this={resetCancelBtn}
            onclick={cancelResetAll}
            class="px-3 py-1.5 text-xs rounded-lg bg-white/8 text-slate-300 hover:bg-white/12 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            bind:this={resetConfirmBtn}
            onclick={confirmResetAll}
            class="px-3 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors cursor-pointer"
          >
            Reset all
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
