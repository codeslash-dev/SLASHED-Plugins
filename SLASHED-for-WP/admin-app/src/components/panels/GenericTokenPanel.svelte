<script lang="ts">
  import type { SlashedToken } from '../../types';
  import TokenRow from '../inputs/TokenRow.svelte';

  let { domain, tokens, overrides, onSet, onReset, patterns }: {
    domain: string;
    tokens: SlashedToken[];
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
    patterns?: string[];
  } = $props();

  let query = $state("");

  let domainTokens = $derived(() => {
    const pats = patterns ?? [domain];
    return tokens.filter((t) =>
      pats.some((p) => t.name.includes(p)) && t.tier !== "INTERNAL"
    );
  });

  let filtered = $derived(() => {
    if (!query) return domainTokens();
    const q = query.toLowerCase();
    return domainTokens().filter((t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
  });

  let modifiedCount = $derived(filtered().filter((t) => t.name in overrides).length);
</script>

<div class="p-4 space-y-4">
  <div class="flex items-center justify-between">
    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest capitalize">{domain} tokens</div>
    {#if modifiedCount > 0}
      <span class="text-[9px] font-bold text-indigo-400 font-mono">{modifiedCount} modified</span>
    {/if}
  </div>

  <input
    type="text"
    placeholder={`Search ${domain} tokens…`}
    value={query}
    oninput={(e) => { query = (e.target as HTMLInputElement).value; }}
    class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
  />

  {#if filtered().length === 0}
    <p class="text-[11px] text-slate-600 text-center py-8">No tokens found</p>
  {:else}
    <div class="space-y-0.5">
      {#each filtered().slice(0, 60) as t (t.name)}
        <TokenRow
          token={t}
          overrideValue={overrides[t.name]}
          onSet={(v) => onSet(t.name, v)}
          onReset={() => onReset(t.name)}
        />
      {/each}
      {#if filtered().length > 60}
        <p class="text-[10px] text-slate-600 text-center py-2">
          {filtered().length - 60} more — refine your search
        </p>
      {/if}
    </div>
  {/if}
</div>
