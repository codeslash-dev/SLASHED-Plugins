<script lang="ts">
  import type { SlashedToken } from '../../types';
  import TokenRow from '../inputs/TokenRow.svelte';

  let { tokens, overrides, patterns, onSet, onReset }: {
    tokens: SlashedToken[];
    overrides: Record<string, string>;
    patterns: string[];
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
  } = $props();

  const TIER_ORDER: Record<string, number> = { PUBLIC: 0, "PUBLIC-ADVANCED": 1, INTERNAL: 2 };

  let query = $state("");
  let showInternal = $state(false);
  let onlyModified = $state(false);

  let domainTokens = $derived(
    tokens
      .filter((t) => patterns.some((p) => t.name.includes(p)))
      .sort((a, b) => {
        const ta = TIER_ORDER[a.tier ?? "INTERNAL"] ?? 2;
        const tb = TIER_ORDER[b.tier ?? "INTERNAL"] ?? 2;
        if (ta !== tb) return ta - tb;
        return a.name.localeCompare(b.name);
      })
  );

  let filtered = $derived(() => {
    let list = domainTokens;
    if (!showInternal) list = list.filter((t) => t.tier !== "INTERNAL");
    if (onlyModified) list = list.filter((t) => t.name in overrides);
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    return list;
  });

  let modifiedCount = $derived(domainTokens.filter((t) => t.name in overrides).length);
  let publicCount = $derived(domainTokens.filter((t) => t.tier === "PUBLIC").length);
  let advancedCount = $derived(domainTokens.filter((t) => t.tier === "PUBLIC-ADVANCED").length);
  let internalCount = $derived(domainTokens.filter((t) => t.tier === "INTERNAL").length);
</script>

<div class="flex flex-col h-full min-h-0">
  <!-- Search + filters -->
  <div class="px-3 pt-3 pb-2 space-y-2 shrink-0">
    <input
      type="text"
      placeholder="Search tokens…"
      value={query}
      oninput={(e) => { query = (e.target as HTMLInputElement).value; }}
      class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
    />
    <div class="flex items-center gap-3">
      <button
        onclick={() => { onlyModified = !onlyModified; }}
        class={`flex items-center gap-1 text-[9px] font-bold transition-colors cursor-pointer ${onlyModified ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400"}`}
      >
        <div class={`w-2.5 h-2.5 rounded border flex items-center justify-center transition-colors ${onlyModified ? "bg-indigo-600 border-indigo-500" : "border-black/20 dark:border-white/20"}`}>
          {#if onlyModified}
            <div class="w-1 h-1 bg-white rounded-sm"></div>
          {/if}
        </div>
        Modified only {modifiedCount > 0 ? `(${modifiedCount})` : ""}
      </button>
      <button
        onclick={() => { showInternal = !showInternal; }}
      aria-expanded={showInternal}
        class={`flex items-center gap-1 text-[9px] font-bold transition-colors cursor-pointer ${showInternal ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400"}`}
      >
        <div class={`w-2.5 h-2.5 rounded border flex items-center justify-center transition-colors ${showInternal ? "bg-amber-600 border-amber-500" : "border-black/20 dark:border-white/20"}`}>
          {#if showInternal}
            <div class="w-1 h-1 bg-white rounded-sm"></div>
          {/if}
        </div>
        Internal ({internalCount})
      </button>
      <span class="ml-auto text-[9px] text-slate-300 dark:text-slate-700 font-mono">
        {filtered().length}/{domainTokens.length}
      </span>
    </div>

    <!-- Tier legend -->
    <div class="flex gap-3">
      <div class="flex items-center gap-1">
        <div class="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
        <span class="text-[8px] text-slate-400 dark:text-slate-600">Public ({publicCount})</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-1.5 h-1.5 rounded-full bg-amber-600"></div>
        <span class="text-[8px] text-slate-400 dark:text-slate-600">Advanced ({advancedCount})</span>
      </div>
      {#if showInternal}
        <div class="flex items-center gap-1">
          <div class="w-1.5 h-1.5 rounded-full bg-rose-800"></div>
          <span class="text-[8px] text-slate-400 dark:text-slate-600">Internal ({internalCount})</span>
        </div>
      {/if}
    </div>
  </div>

  <div class="w-full h-px bg-black/6 dark:bg-white/6 shrink-0"></div>

  <!-- Token list -->
  <div class="flex-1 min-h-0 overflow-y-auto py-1">
    {#if filtered().length === 0}
      <div class="text-center py-8 text-[11px] text-slate-400 dark:text-slate-600">
        {onlyModified ? "No modified tokens in this domain" : "No tokens found"}
      </div>
    {:else}
      <div class="space-y-0.5 px-1">
        {#each filtered() as t (t.name)}
          <div class="relative">
            {#if t.tier === "PUBLIC-ADVANCED"}
              <div class="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-600/40 rounded-full"></div>
            {/if}
            {#if t.tier === "INTERNAL"}
              <div class="absolute left-0 top-0 bottom-0 w-0.5 bg-rose-800/40 rounded-full"></div>
            {/if}
            <TokenRow
              token={t}
              overrideValue={overrides[t.name]}
              onSet={(v) => onSet(t.name, v)}
              onReset={() => onReset(t.name)}
            />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
