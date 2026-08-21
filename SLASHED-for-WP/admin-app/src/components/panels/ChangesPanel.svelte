<script lang="ts">
  import { RotateCcw, AlertTriangle, Unlink, Link2, SlidersHorizontal, HelpCircle, Check } from '@lucide/svelte';
  import type { SlashedToken } from '../../types';
  import TokenRow from '../inputs/TokenRow.svelte';
  import { summarizeChanges, scaleShadows, buildDependencyGraph, type ChangeEntry } from '../../lib/tokenModel';
  import { domainOf } from '../../lib/domains';

  let { tokens, overrides, onSet, onReset, onBulkChange, onResetAll, onSelectDomain }: {
    tokens: SlashedToken[];
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
    onBulkChange: (patch: Record<string, string | null>) => void;
    onResetAll: () => void;
    onSelectDomain: (d: string) => void;
  } = $props();

  const DOMAIN_LABEL: Record<string, string> = {
    colors: "Colors", typography: "Typography", spacing: "Spacing", layout: "Layout",
    borders: "Shape", depth: "Depth", motion: "Motion",
    macros: "Macros", components: "Components", misc: "System",
  };

  let summary = $derived(summarizeChanges(tokens, overrides));
  let shadows = $derived(scaleShadows(overrides));
  let graph = $derived(buildDependencyGraph(tokens));

  // Consequence groups, most-actionable first. Each carries its own colour and
  // a one-line "why this matters".
  type GroupDef = {
    key: "invalid" | "detached" | "relinked" | "custom" | "unknown";
    label: string;
    blurb: string;
    icon: typeof AlertTriangle;
    accent: string;
  };
  const GROUPS: GroupDef[] = [
    { key: "invalid",  label: "Invalid",  blurb: "Contains a malformed or CSS-breaking value — fix or reset it before export.", icon: AlertTriangle, accent: "text-rose-600 dark:text-rose-400" },
    { key: "detached", label: "Detached", blurb: "Frozen — no longer follows the token that would produce it.", icon: Unlink, accent: "text-amber-600 dark:text-amber-400" },
    { key: "relinked", label: "Re-linked", blurb: "Re-pointed at another token instead of a fixed value.", icon: Link2, accent: "text-sky-600 dark:text-sky-400" },
    { key: "custom",   label: "Custom",   blurb: "A source value you set. Expected and safe.", icon: SlidersHorizontal, accent: "text-indigo-600 dark:text-indigo-400" },
    { key: "unknown",  label: "Not in this build", blurb: "Override keys that aren't tokens in this framework version.", icon: HelpCircle, accent: "text-slate-500 dark:text-slate-500" },
  ];

  function resetGroup(entries: ChangeEntry[]) {
    const patch: Record<string, null> = {};
    for (const e of entries) patch[e.name] = null;
    onBulkChange(patch);
  }

  function clearShadow(steps: string[]) {
    const patch: Record<string, null> = {};
    for (const s of steps) patch[s] = null;
    onBulkChange(patch);
  }
</script>

<div class="flex flex-col h-full min-h-0">
  <!-- Header -->
  <div class="px-4 pt-4 pb-3 shrink-0">
    <div class="flex items-center justify-between gap-2">
      <div>
        <h2 class="text-[13px] font-bold text-slate-800 dark:text-slate-100">Changes</h2>
        <p class="text-[10px] text-slate-500 dark:text-slate-500 mt-0.5">
          Every active override, grouped by what it does to the system.
        </p>
      </div>
      {#if summary.total > 0}
        <button
          onclick={onResetAll}
          class="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
        >
          <RotateCcw class="w-3 h-3" /> Reset all
        </button>
      {/if}
    </div>

    {#if summary.total > 0}
      <!-- Consequence summary chips -->
      <div class="flex flex-wrap gap-1.5 mt-3">
        {#each GROUPS as g (g.key)}
          {@const n = summary[g.key].length}
          {#if n > 0}
            <span class={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/5 dark:bg-white/8 ${g.accent}`}>
              <g.icon class="w-2.5 h-2.5" /> {n} {g.label}
            </span>
          {/if}
        {/each}
      </div>
    {/if}
  </div>

  <div class="w-full h-px bg-black/6 dark:bg-white/6 shrink-0"></div>

  <!-- Body -->
  <div class="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-4">
    {#if summary.total === 0}
      <div class="flex flex-col items-center justify-center text-center py-16 px-6 gap-2">
        <div class="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Check class="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p class="text-[12px] font-bold text-slate-700 dark:text-slate-300">No changes yet</p>
        <p class="text-[10px] text-slate-500 dark:text-slate-500 max-w-[15rem]">
          You're on the framework defaults. Edit any panel and your overrides will collect here.
        </p>
      </div>
    {:else}
      <!-- Scale-shadow callouts: pinned steps that make a source knob inert. -->
      {#each shadows as sh (sh.family.id)}
        <div class="mx-1 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div class="flex items-start gap-2">
            <AlertTriangle class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                {sh.shadowedSteps.length} {sh.family.label} step{sh.shadowedSteps.length !== 1 ? "s" : ""} pinned
              </div>
              <div class="text-[9px] text-amber-700/80 dark:text-amber-300/80 leading-snug mt-0.5">
                These fixed values override the generated ladder, so its source
                knob{sh.overriddenSources.length === 1 ? "" : "s"} can't move them.
              </div>
              <button
                onclick={() => clearShadow(sh.shadowedSteps)}
                class="mt-1.5 text-[9px] font-bold text-amber-800 dark:text-amber-200 underline hover:no-underline cursor-pointer"
              >
                Restore generated scale
              </button>
            </div>
          </div>
        </div>
      {/each}

      <!-- Consequence groups -->
      {#each GROUPS as g (g.key)}
        {@const entries = summary[g.key]}
        {#if entries.length > 0}
          <section>
            <div class="flex items-center gap-2 px-2 mb-1">
              <g.icon class={`w-3 h-3 ${g.accent}`} />
              <span class={`text-[10px] font-bold uppercase tracking-wider ${g.accent}`}>{g.label}</span>
              <span class="text-[9px] text-slate-400 dark:text-slate-600">{entries.length}</span>
              <div class="h-px flex-1 bg-black/6 dark:bg-white/6"></div>
              <button
                onclick={() => resetGroup(entries)}
                class="text-[9px] font-bold text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              >
                Reset {entries.length}
              </button>
            </div>
            <p class="text-[9px] text-slate-400 dark:text-slate-600 px-2 mb-1.5">{g.blurb}</p>

            <div class="space-y-0.5 px-1">
              {#each entries as entry (entry.name)}
                {#if entry.token}
                  {@const dom = domainOf(entry.name)}
                  <div>
                    <button
                      onclick={() => onSelectDomain(dom)}
                      class="ml-3.5 mb-px text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                      title={`Open in ${DOMAIN_LABEL[dom] ?? dom}`}
                    >
                      {DOMAIN_LABEL[dom] ?? dom} →
                    </button>
                    <TokenRow
                      token={entry.token}
                      overrideValue={overrides[entry.name]}
                      dependentsCount={graph.usedBy[entry.name]?.length ?? 0}
                      onSet={(v) => onSet(entry.name, v)}
                      onReset={() => onReset(entry.name)}
                    />
                  </div>
                {:else}
                  <!-- Unknown key: no catalogue token, so a minimal row. -->
                  <div class="px-3 py-2 rounded-lg bg-black/4 dark:bg-white/4 flex items-center gap-2">
                    <div class="min-w-0 flex-1">
                      <div class="text-[10px] font-mono text-slate-600 dark:text-slate-400 truncate" title={entry.name}>
                        {entry.name.replace("--sf-", "")}
                      </div>
                      <div class="text-[9px] font-mono text-slate-400 dark:text-slate-600 truncate" title={entry.value}>
                        {entry.value}
                      </div>
                    </div>
                    <button
                      onclick={() => onReset(entry.name)}
                      class="text-[9px] text-slate-400 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                    >
                      remove
                    </button>
                  </div>
                {/if}
              {/each}
            </div>
          </section>
        {/if}
      {/each}
    {/if}
  </div>
</div>
