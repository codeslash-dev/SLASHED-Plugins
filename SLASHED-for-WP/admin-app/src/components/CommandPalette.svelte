<script lang="ts">
  import { onMount } from 'svelte';
  import type { SlashedToken } from '../types';
  import { domainOf } from '../lib/domains';

  let { tokens, overrides, onNavigate, onClose }: {
    tokens: SlashedToken[];
    overrides: Record<string, string>;
    onNavigate: (domain: string) => void;
    onClose: () => void;
  } = $props();

  let query = $state("");
  let selectedIndex = $state(0);
  let inputEl = $state<HTMLInputElement | null>(null);

  const DOMAIN_LABELS: Record<string, string> = {
    colors: "Colors", typography: "Typography", spacing: "Spacing", layout: "Layout",
    borders: "Borders", shadows: "Shadows", motion: "Motion", effects: "Effects",
    macros: "Macros", misc: "Misc",
  };

  let results = $derived((() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const matches: Array<{ token: SlashedToken; domain: string; overridden: boolean }> = [];
    for (const t of tokens) {
      if (t.tier === "INTERNAL") continue;
      const nameMatch = t.name.toLowerCase().includes(q);
      const descMatch = t.description?.toLowerCase().includes(q) ?? false;
      if (nameMatch || descMatch) {
        matches.push({ token: t, domain: domainOf(t.name), overridden: t.name in overrides });
        if (matches.length >= 40) break;
      }
    }
    return matches;
  })());

  $effect(() => {
    query; // re-run when query changes so selectedIndex stays in bounds
    selectedIndex = 0;
  });

  $effect(() => {
    if (inputEl) inputEl.focus();
  });

  function handleSelect(domain: string) {
    onNavigate(domain);
    onClose();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
    if (results.length === 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      selectedIndex = 0;
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); selectedIndex = Math.min(selectedIndex + 1, results.length - 1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); selectedIndex = Math.max(selectedIndex - 1, 0); return; }
    if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex].domain);
    }
  }
</script>

<!-- Backdrop -->
<div
  class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
  role="dialog"
  aria-modal="true"
  aria-label="Token search"
  tabindex="-1"
  onmousedown={(e) => { if (e.target === e.currentTarget) onClose(); }}
>
  <!-- Panel -->
  <div class="w-[560px] max-w-[95vw] bg-[#111118] border border-white/12 rounded-2xl shadow-2xl overflow-hidden">
    <!-- Search input -->
    <div class="flex items-center gap-3 px-4 py-3 border-b border-white/8">
      <svg class="w-4 h-4 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        bind:this={inputEl}
        bind:value={query}
        onkeydown={handleKeydown}
        placeholder="Search tokens… (e.g. radius, primary, duration)"
        class="flex-1 bg-transparent text-[13px] text-slate-100 placeholder-slate-600 outline-none"
      />
      <kbd class="text-[9px] font-mono text-slate-600 border border-white/10 rounded px-1.5 py-0.5 shrink-0">Esc</kbd>
    </div>

    <!-- Results -->
    <div class="max-h-[360px] overflow-y-auto">
      {#if query.trim() && results.length === 0}
        <div class="px-4 py-8 text-center text-[11px] text-slate-600">No tokens matching "{query}"</div>
      {:else if !query.trim()}
        <div class="px-4 py-8 text-center text-[11px] text-slate-600">Type to search tokens by name or description</div>
      {:else}
        {#each results as r, i (r.token.name)}
          <button
            onmouseenter={() => { selectedIndex = i; }}
            onclick={() => handleSelect(r.domain)}
            class={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
              selectedIndex === i ? "bg-indigo-500/15" : "hover:bg-white/4"
            }`}
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-mono text-slate-200 truncate">{r.token.name}</span>
                {#if r.overridden}
                  <span class="shrink-0 text-[8px] font-bold text-indigo-400 bg-indigo-500/15 border border-indigo-500/25 rounded px-1 py-0.5">overridden</span>
                {/if}
              </div>
              {#if r.token.description}
                <div class="text-[10px] text-slate-600 truncate mt-0.5">{r.token.description}</div>
              {/if}
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-[9px] text-slate-600 font-mono truncate max-w-[100px]">
                {r.overridden ? overrides[r.token.name] : r.token.value}
              </span>
              <span class="text-[9px] font-bold text-slate-500 bg-white/5 rounded px-1.5 py-0.5">
                {DOMAIN_LABELS[r.domain] ?? r.domain}
              </span>
            </div>
          </button>
        {/each}
      {/if}
    </div>

    <!-- Footer hint -->
    {#if results.length > 0}
      <div class="px-4 py-2 border-t border-white/6 flex items-center gap-3 text-[9px] text-slate-600">
        <span><kbd class="font-mono border border-white/10 rounded px-1">↑↓</kbd> navigate</span>
        <span><kbd class="font-mono border border-white/10 rounded px-1">↵</kbd> open panel</span>
        <span><kbd class="font-mono border border-white/10 rounded px-1">Esc</kbd> close</span>
      </div>
    {/if}
  </div>
</div>
