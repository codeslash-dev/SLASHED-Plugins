<script lang="ts">
  import {
    Sparkles, Palette, Type, Ruler, Layout, Square, Layers, Zap,
    Puzzle, Blocks, Component, SwatchBook, ShieldCheck, Package, BookOpen, Save, ListChecks,
  } from '@lucide/svelte';
  import type { SavedSlot } from '../../types';
  import { listSavedThemes, saveTheme } from '../../lib/savedThemes';
  import { domainOf } from '../../lib/domains';

  let { overrides, onSelect, onApplyTheme, onResetAll }: {
    overrides: Record<string, string>;
    onSelect: (domain: string) => void;
    onApplyTheme: (overrides: Record<string, string>) => void;
    onResetAll: () => void;
  } = $props();

  // Mirrors SidebarNav's grouped information architecture so Home and the rail
  // always tell the same story (same order, names and descriptions).
  const GROUPS = [
    {
      label: "Foundations",
      items: [
        { id: "colors",     icon: Palette,   label: "Colors",     desc: "Brand, semantic & neutral palettes" },
        { id: "typography", icon: Type,      label: "Typography", desc: "Font families & fluid type scale" },
        { id: "spacing",    icon: Ruler,     label: "Spacing",    desc: "Space scale & section rhythm" },
        { id: "borders",    icon: Square,    label: "Shape",      desc: "Corner radius & border widths" },
        { id: "motion",     icon: Zap,       label: "Motion",     desc: "Duration & easing curves" },
      ],
    },
    {
      label: "Composition",
      items: [
        { id: "layout",     icon: Layout,    label: "Layout",     desc: "Containers, grids & primitives" },
        { id: "depth",      icon: Layers,    label: "Depth",      desc: "Shadows, glow, blur & opacity" },
        { id: "macros",     icon: Blocks,    label: "Macros",     desc: "Flow, prose, aspect & scrim" },
        { id: "components", icon: Component, label: "Components", desc: "Button & card component tokens" },
        { id: "misc",       icon: Puzzle,    label: "System",     desc: "Layering, sizing, media, selection" },
      ],
    },
    {
      label: "Quality",
      items: [
        { id: "changes",    icon: ListChecks,  label: "Changes",       desc: "Review every active override" },
        { id: "wcag",       icon: ShieldCheck, label: "Accessibility", desc: "Focus ring, touch target & contrast" },
      ],
    },
    {
      label: "Project",
      items: [
        { id: "themes",     icon: SwatchBook, label: "Presets",          desc: "Save & re-apply configurations" },
        { id: "setup",      icon: Package,    label: "Install & export", desc: "Export overrides & setup" },
        { id: "cheatsheet", icon: BookOpen,   label: "Reference",        desc: "Class & token catalogue" },
      ],
    },
  ] as const;

  let overridesCount = $derived(Object.keys(overrides).length);

  // Per-destination override count — the same canonical domainOf() classifier
  // the sidebar and Reset use, so counts never disagree. `changes` shows the
  // total; non-token tools show nothing.
  const NON_TOKEN_IDS = new Set<string>(["changes", "themes", "setup", "cheatsheet"]);
  const TOKEN_DOMAIN_IDS = new Set<string>(
    GROUPS.flatMap((g) => g.items.map((i) => i.id as string)).filter((id) => !NON_TOKEN_IDS.has(id)),
  );
  function countFor(id: string): number {
    if (id === "changes") return overridesCount;
    if (!TOKEN_DOMAIN_IDS.has(id)) return 0;
    return Object.keys(overrides).filter((k) => domainOf(k) === id).length;
  }
  let savedThemes = $state<SavedSlot[]>(listSavedThemes());
  let newName = $state("");

  function handleQuickSave() {
    if (overridesCount === 0) return;
    savedThemes = saveTheme(newName, overrides);
    newName = "";
  }
</script>

<div class="p-4 space-y-5 overflow-y-auto flex-1">
  <!-- Welcome -->
  <div class="rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border border-indigo-500/20 p-4">
    <div class="flex items-center gap-2 mb-2">
      <Sparkles class="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      <span class="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">SLASHED Studio</span>
    </div>
    <p class="text-[12px] text-slate-700 dark:text-slate-300 leading-relaxed">
      Configure every SLASHED design token visually. Changes appear live in the preview.
      {#if overridesCount > 0}
        You have <span class="text-indigo-700 dark:text-indigo-300 font-bold">{overridesCount} active override{overridesCount !== 1 ? "s" : ""}</span>.
      {:else}
        Pick any domain below to get started.
      {/if}
    </p>
    {#if overridesCount > 0}
      <button
        onclick={onResetAll}
        class="mt-2 text-[10px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer"
      >
        Reset all overrides →
      </button>
    {/if}
  </div>

  <!-- Grouped destinations (mirror of the sidebar IA) -->
  {#each GROUPS as group (group.label)}
    <div>
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{group.label}</div>
      <div class="space-y-1">
        {#each group.items as d (d.id)}
          {@const count = countFor(d.id)}
          {@const DomainIcon = d.icon}
          <button
            onclick={() => onSelect(d.id)}
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/6 dark:hover:bg-white/6 transition-colors cursor-pointer group text-left"
          >
            <div class="text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors shrink-0">
              <DomainIcon class="w-4 h-4" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[11px] font-semibold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{d.label}</div>
              <div class="text-[9px] text-slate-400 dark:text-slate-600">{d.desc}</div>
            </div>
            {#if count > 0}
              <span class="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full font-mono shrink-0">{count}</span>
            {/if}
            <span class="text-slate-300 dark:text-slate-700 group-hover:text-slate-500 text-[10px]">→</span>
          </button>
        {/each}
      </div>
    </div>
  {/each}

  <!-- Saved themes -->
  <div>
    <div class="flex items-center justify-between mb-2">
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Presets</div>
      <button
        onclick={() => onSelect("themes")}
        class="text-[10px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
      >Manage →</button>
    </div>

    <div class="flex items-center gap-2 mb-2">
      <input
        type="text"
        bind:value={newName}
        placeholder="Save current as…"
        onkeydown={(e) => { if (e.key === "Enter") handleQuickSave(); }}
        class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 dark:text-slate-200 placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
      />
      <button
        onclick={handleQuickSave}
        disabled={overridesCount === 0}
        aria-label="Save current theme"
        class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600/20 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600/30 transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
      ><Save class="w-3 h-3" /></button>
    </div>

    {#if savedThemes.length === 0}
      <p class="text-[10px] text-slate-400 dark:text-slate-600">No saved themes yet. Configure tokens, then save.</p>
    {:else}
      <div class="grid grid-cols-2 gap-2">
        {#each savedThemes.slice(0, 6) as theme (theme.id)}
          <button
            onclick={() => onApplyTheme(theme.overrides)}
            class="flex items-start gap-2 p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8 hover:bg-black/8 dark:hover:bg-white/8 hover:border-black/14 dark:hover:border-white/14 transition-all cursor-pointer text-left group"
          >
            <span class="text-lg leading-none shrink-0">{theme.icon}</span>
            <div class="min-w-0">
              <div class="text-[11px] font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors truncate">{theme.name}</div>
              <div class="text-[9px] text-slate-500 mt-0.5 font-mono">{theme.blurb}</div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
