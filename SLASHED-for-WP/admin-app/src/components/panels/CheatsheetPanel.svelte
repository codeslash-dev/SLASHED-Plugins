<!--
  @license
  SPDX-License-Identifier: Apache-2.0
-->
<script lang="ts">
  import classesData from '../../data/classes.generated.json';
  import tokensData from '../../data/api-index.generated.json';
  import { Copy, Check } from '@lucide/svelte';
  import type { SlashedClass } from '../../types';

  const classes = classesData.classes;
  const tokens = tokensData.tokens.filter((t) => t.tier === 'PUBLIC' || t.tier === 'PUBLIC-ADVANCED');

  let query = $state('');
  let tab = $state<'classes' | 'tokens'>('classes');
  let copied = $state('');

  let filteredClasses = $derived(() => {
    const q = query.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter((c: SlashedClass) =>
      c.name.toLowerCase().includes(q) ||
      c.selector?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.group?.toLowerCase().includes(q)
    );
  });

  let filteredTokens = $derived(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.group?.toLowerCase().includes(q) ||
      t.value?.toLowerCase().includes(q)
    );
  });

  // Group by category > group
  function groupBy<T extends { category: string; group: string }>(items: T[]) {
    const map = new Map<string, Map<string, T[]>>();
    for (const item of items) {
      const cat = item.category || 'Other';
      const grp = item.group || '';
      if (!map.has(cat)) map.set(cat, new Map());
      const catMap = map.get(cat)!;
      if (!catMap.has(grp)) catMap.set(grp, []);
      catMap.get(grp)!.push(item);
    }
    return map;
  }

  let classGroups = $derived(groupBy(filteredClasses()));
  let tokenGroups = $derived(groupBy(filteredTokens()));

  let copiedResetTimer: ReturnType<typeof setTimeout> | null = null;

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copied = text;
      if (copiedResetTimer) clearTimeout(copiedResetTimer);
      copiedResetTimer = setTimeout(() => {
        if (copied === text) copied = '';
        copiedResetTimer = null;
      }, 1500);
    } catch { /* ignore */ }
  }

  const KIND_COLOR: Record<string, string> = {
    layout: 'text-violet-600 dark:text-violet-400',
    macro: 'text-sky-600 dark:text-sky-400',
    state: 'text-amber-600 dark:text-amber-400',
    accessibility: 'text-emerald-600 dark:text-emerald-400',
    motion: 'text-pink-400',
    print: 'text-slate-600 dark:text-slate-400',
    form: 'text-orange-400',
    component: 'text-indigo-600 dark:text-indigo-400',
    theme: 'text-teal-600 dark:text-teal-400',
  };
</script>

<div class="flex flex-col h-full min-h-0">
  <!-- Search -->
  <div class="px-4 pt-4 pb-2 space-y-2 shrink-0">
    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Classes &amp; Variables</div>
    <input
      type="search"
      bind:value={query}
      placeholder="Search classes, tokens, descriptions…"
      class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-[11px] text-slate-800 dark:text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
    />
    <!-- Tab switcher -->
    <div class="flex bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8 rounded-lg p-0.5 gap-0.5">
      <button
        onclick={() => { tab = 'classes'; }}
        class={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all cursor-pointer ${tab === 'classes' ? 'bg-indigo-600/30 text-indigo-800 dark:text-indigo-200 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
      >
        CSS classes ({filteredClasses().length})
      </button>
      <button
        onclick={() => { tab = 'tokens'; }}
        class={`flex-1 py-1.5 rounded text-[10px] font-bold transition-all cursor-pointer ${tab === 'tokens' ? 'bg-indigo-600/30 text-indigo-800 dark:text-indigo-200 border border-indigo-500/30' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
      >
        CSS vars ({filteredTokens().length})
      </button>
    </div>
  </div>

  <!-- Scrollable list -->
  <div class="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
    {#if tab === 'classes'}
      {#if filteredClasses().length === 0}
        <div class="text-[11px] text-slate-400 dark:text-slate-600 py-8 text-center">No classes match "{query}"</div>
      {:else}
        {#each [...classGroups.entries()] as [cat, groups] (cat)}
          <div class="mt-4 mb-1">
            <div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest py-1 border-b border-black/6 dark:border-white/6">{cat}</div>
          </div>
          {#each [...groups.entries()] as [grp, items] (grp)}
            {#if grp}
              <div class="text-[8px] text-slate-400 dark:text-slate-600 uppercase tracking-widest pt-2 pb-1 font-semibold">{grp}</div>
            {/if}
            <div class="space-y-0.5">
              {#each items as cls (cls.name)}
                <div class="flex items-start gap-2 group py-1 px-2 rounded-lg hover:bg-black/4 dark:hover:bg-white/4 transition-colors">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200">{cls.selector}</span>
                      {#if cls.kind}
                        <span class={`text-[8px] font-bold uppercase ${KIND_COLOR[cls.kind] ?? 'text-slate-500'}`}>{cls.kind}</span>
                      {/if}
                      {#if cls.optional}
                        <span class="text-[8px] text-slate-400 dark:text-slate-600 border border-black/10 dark:border-white/10 px-1 rounded">optional</span>
                      {/if}
                    </div>
                    {#if cls.description}
                      <div class="text-[9px] text-slate-500 mt-0.5 leading-relaxed">{cls.description}</div>
                    {/if}
                  </div>
                  <button
                    onclick={() => copyText(cls.selector)}
                    title="Copy selector"
                    class="shrink-0 opacity-40 hover:opacity-100 transition-opacity cursor-pointer p-1 rounded hover:bg-black/8 dark:hover:bg-white/8"
                  >
                    {#if copied === cls.selector}
                      <Check class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    {:else}
                      <Copy class="w-3 h-3 text-slate-500" />
                    {/if}
                  </button>
                </div>
              {/each}
            </div>
          {/each}
        {/each}
      {/if}
    {:else}
      {#if filteredTokens().length === 0}
        <div class="text-[11px] text-slate-400 dark:text-slate-600 py-8 text-center">No tokens match "{query}"</div>
      {:else}
        {#each [...tokenGroups.entries()] as [cat, groups] (cat)}
          <div class="mt-4 mb-1">
            <div class="text-[9px] font-bold text-slate-500 uppercase tracking-widest py-1 border-b border-black/6 dark:border-white/6">{cat}</div>
          </div>
          {#each [...groups.entries()] as [grp, items] (grp)}
            {#if grp}
              <div class="text-[8px] text-slate-400 dark:text-slate-600 uppercase tracking-widest pt-2 pb-1 font-semibold">{grp}</div>
            {/if}
            <div class="space-y-0.5">
              {#each items as tok (tok.name)}
                <div class="flex items-start gap-2 group py-1 px-2 rounded-lg hover:bg-black/4 dark:hover:bg-white/4 transition-colors">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-mono text-[10px] font-semibold text-slate-800 dark:text-slate-200">{tok.name}</span>
                      {#if tok.role === 'knob'}
                        <span class="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">knob</span>
                      {/if}
                      {#if tok.tier === 'PUBLIC-ADVANCED'}
                        <span class="text-[8px] text-amber-700/80 dark:text-amber-500/80 border border-amber-500/20 px-1 rounded">advanced</span>
                      {/if}
                    </div>
                    {#if tok.value}
                      <div class="font-mono text-[9px] text-slate-400 dark:text-slate-600 mt-0.5">{tok.value}</div>
                    {/if}
                    {#if tok.description}
                      <div class="text-[9px] text-slate-500 mt-0.5 leading-relaxed">{tok.description}</div>
                    {/if}
                  </div>
                  <button
                    onclick={() => copyText(`var(${tok.name})`)}
                    title="Copy var()"
                    class="shrink-0 opacity-40 hover:opacity-100 transition-opacity cursor-pointer p-1 rounded hover:bg-black/8 dark:hover:bg-white/8"
                  >
                    {#if copied === `var(${tok.name})`}
                      <Check class="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    {:else}
                      <Copy class="w-3 h-3 text-slate-500" />
                    {/if}
                  </button>
                </div>
              {/each}
            </div>
          {/each}
        {/each}
      {/if}
    {/if}
  </div>
</div>
