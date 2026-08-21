<script lang="ts">
  import type { SlashedToken } from '../types';
  import { domainOf } from '../lib/domains';

  let { tokens, overrides, onNavigate, onClose }: {
    tokens: SlashedToken[];
    overrides: Record<string, string>;
    /** Navigate to a panel; when `token` is given, deep-link to that token's row. */
    onNavigate: (domain: string, token?: string) => void;
    onClose: () => void;
  } = $props();

  let query = $state("");
  let selectedIndex = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  const DOMAIN_LABELS: Record<string, string> = {
    home: "Home", colors: "Colors", typography: "Typography", spacing: "Spacing",
    layout: "Layout", borders: "Shape", depth: "Depth", motion: "Motion",
    macros: "Macros", misc: "System", components: "Components",
    changes: "Changes", wcag: "Accessibility", themes: "Presets",
    setup: "Install & export", cheatsheet: "Reference",
  };

  // Navigation destinations — makes this a real command palette (jump to any
  // panel/tool), not just a token search.
  const NAV_ALIASES: Record<string, string[]> = {
    borders: ["border", "radius", "shape"], shadows: ["shadow", "depth"],
    effects: ["effect"], wcag: ["accessibility", "contrast"],
    themes: ["theme", "preset"], setup: ["install", "export"],
    cheatsheet: ["reference", "classes"], misc: ["system"],
  };
  const NAV = [
    "home", "colors", "typography", "spacing", "borders", "motion",
    "layout", "depth", "macros", "components", "misc",
    "changes", "wcag", "themes", "setup", "cheatsheet",
  ].map((id) => ({ id, label: DOMAIN_LABELS[id] ?? id, terms: [id, ...(NAV_ALIASES[id] ?? [])] }));

  type Result =
    | { kind: "nav"; id: string; label: string }
    | { kind: "token"; token: SlashedToken; domain: string; overridden: boolean };

  let results = $derived.by<Result[]>(() => {
    const q = query.trim().toLowerCase();
    // Navigation matches (all destinations when empty, so the palette is useful
    // before typing).
    const nav: Result[] = (q ? NAV.filter((n) =>
      n.label.toLowerCase().includes(q) || n.terms.some((term) => term.includes(q))
    ) : NAV)
      .map((n) => ({ kind: "nav", id: n.id, label: n.label }));

    const tokenMatches: Result[] = [];
    if (q) {
      for (const t of tokens) {
        if (t.tier === "INTERNAL") continue;
        if (t.name.toLowerCase().includes(q) || (t.description?.toLowerCase().includes(q) ?? false)) {
          tokenMatches.push({ kind: "token", token: t, domain: domainOf(t.name), overridden: t.name in overrides });
          if (tokenMatches.length >= 40) break;
        }
      }
    }
    return [...nav, ...tokenMatches];
  });

  // Number of nav results (for the "Go to" / "Tokens" section split).
  let navCount = $derived(results.filter((r) => r.kind === "nav").length);

  $effect(() => { query; selectedIndex = 0; });
  $effect(() => { if (inputEl) inputEl.focus(); });

  function select(r: Result) {
    if (r.kind === "nav") onNavigate(r.id);
    else onNavigate(r.domain, r.token.name);
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); selectedIndex = Math.min(selectedIndex + 1, results.length - 1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); selectedIndex = Math.max(selectedIndex - 1, 0); return; }
    if (e.key === "Enter" && results[selectedIndex]) { e.preventDefault(); select(results[selectedIndex]); }
  }
</script>

<div
  class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
  role="dialog"
  aria-modal="true"
  aria-label="Search"
  tabindex="-1"
  onmousedown={(e) => { if (e.target === e.currentTarget) onClose(); }}
>
  <div class="w-[560px] max-w-[95vw] bg-white dark:bg-[#111118] border border-black/12 dark:border-white/12 rounded-2xl shadow-2xl overflow-hidden">
    <div class="flex items-center gap-3 px-4 py-3 border-b border-black/8 dark:border-white/8">
      <svg class="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        bind:this={inputEl}
        bind:value={query}
        onkeydown={handleKeydown}
        placeholder="Search panels & tokens… (e.g. Shape, radius, primary)"
        class="flex-1 bg-transparent text-[13px] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 outline-none"
      />
      <kbd class="text-[9px] font-mono text-slate-400 dark:text-slate-600 border border-black/10 dark:border-white/10 rounded px-1.5 py-0.5 shrink-0">Esc</kbd>
    </div>

    <div class="max-h-[360px] overflow-y-auto">
      {#if results.length === 0}
        <div class="px-4 py-8 text-center text-[11px] text-slate-400 dark:text-slate-600">No matches for "{query}"</div>
      {:else}
        {#each results as r, i (r.kind === "nav" ? `nav:${r.id}` : `tok:${r.token.name}`)}
          {#if i === 0 && navCount > 0}
            <div class="px-4 pt-2 pb-1 text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Go to</div>
          {/if}
          {#if r.kind === "token" && i === navCount}
            <div class="px-4 pt-2 pb-1 text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">Tokens</div>
          {/if}
          <button
            onmouseenter={() => { selectedIndex = i; }}
            onclick={() => select(r)}
            class={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors cursor-pointer ${
              selectedIndex === i ? "bg-indigo-500/15" : "hover:bg-black/4 dark:hover:bg-white/4"
            }`}
          >
            {#if r.kind === "nav"}
              <span class="text-[12px] font-semibold text-slate-800 dark:text-slate-200 flex-1 truncate">{r.label}</span>
              <span class="text-[9px] text-slate-400 dark:text-slate-600">panel</span>
            {:else}
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-mono text-slate-800 dark:text-slate-200 truncate">{r.token.name}</span>
                  {#if r.overridden}
                    <span class="shrink-0 text-[8px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 border border-indigo-500/25 rounded px-1 py-0.5">overridden</span>
                  {/if}
                </div>
                {#if r.token.description}
                  <div class="text-[10px] text-slate-400 dark:text-slate-600 truncate mt-0.5">{r.token.description}</div>
                {/if}
              </div>
              <span class="text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/5 rounded px-1.5 py-0.5 shrink-0">
                {DOMAIN_LABELS[r.domain] ?? r.domain}
              </span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>

    {#if results.length > 0}
      <div class="px-4 py-2 border-t border-black/6 dark:border-white/6 flex items-center gap-3 text-[9px] text-slate-400 dark:text-slate-600">
        <span><kbd class="font-mono border border-black/10 dark:border-white/10 rounded px-1">↑↓</kbd> navigate</span>
        <span><kbd class="font-mono border border-black/10 dark:border-white/10 rounded px-1">↵</kbd> open</span>
        <span><kbd class="font-mono border border-black/10 dark:border-white/10 rounded px-1">Esc</kbd> close</span>
      </div>
    {/if}
  </div>
</div>
