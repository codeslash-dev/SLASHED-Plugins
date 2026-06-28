<script lang="ts">
  import { Sparkles, Palette, Type, Ruler, Square, Layers, Zap } from 'lucide-svelte';
  import type { PresetTheme } from '../../types';
  import { THEME_PRESETS } from '../../lib/themes';

  let { overrides, onSelect, onApplyTheme, onResetAll }: {
    overrides: Record<string, string>;
    onSelect: (domain: string) => void;
    onApplyTheme: (theme: PresetTheme) => void;
    onResetAll: () => void;
  } = $props();

  const DOMAIN_CARDS = [
    { id: "colors",     icon: Palette, label: "Colors",     desc: "Brand, semantic & neutral palettes" },
    { id: "typography", icon: Type,    label: "Typography", desc: "Font families & fluid type scale" },
    { id: "spacing",    icon: Ruler,   label: "Spacing",    desc: "Space scale & section rhythm" },
    { id: "borders",    icon: Square,  label: "Borders",    desc: "Corner radius & border widths" },
    { id: "shadows",    icon: Layers,  label: "Shadows",    desc: "Elevation & depth control" },
    { id: "motion",     icon: Zap,     label: "Motion",     desc: "Duration & easing curves" },
  ] as const;

  let overridesCount = $derived(Object.keys(overrides).length);
</script>

<div class="p-4 space-y-5 overflow-y-auto flex-1">
  <!-- Welcome -->
  <div class="rounded-xl bg-gradient-to-br from-indigo-600/20 to-purple-600/10 border border-indigo-500/20 p-4">
    <div class="flex items-center gap-2 mb-2">
      <Sparkles class="w-4 h-4 text-indigo-400" />
      <span class="text-[11px] font-bold text-indigo-300 uppercase tracking-widest">SLASHED Studio</span>
    </div>
    <p class="text-[12px] text-slate-300 leading-relaxed">
      Configure every SLASHED design token visually. Changes appear live in the preview.
      {#if overridesCount > 0}
        You have <span class="text-indigo-300 font-bold">{overridesCount} active override{overridesCount !== 1 ? "s" : ""}</span>.
      {:else}
        Start by picking a theme preset below, or dive into any domain.
      {/if}
    </p>
    {#if overridesCount > 0}
      <button
        onclick={onResetAll}
        class="mt-2 text-[10px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
      >
        Reset all overrides →
      </button>
    {/if}
  </div>

  <!-- Theme presets -->
  <div>
    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Theme presets</div>
    <div class="grid grid-cols-2 gap-2">
      {#each THEME_PRESETS.slice(0, 6) as theme (theme.id)}
        <button
          onclick={() => onApplyTheme(theme)}
          class="flex items-start gap-2 p-3 rounded-xl bg-white/4 border border-white/8 hover:bg-white/8 hover:border-white/14 transition-all cursor-pointer text-left group"
        >
          <span class="text-lg leading-none shrink-0">{theme.icon}</span>
          <div class="min-w-0">
            <div class="text-[11px] font-semibold text-slate-200 group-hover:text-white transition-colors">{theme.name}</div>
            <div class="text-[9px] text-slate-500 leading-relaxed mt-0.5 truncate">{theme.blurb}</div>
          </div>
        </button>
      {/each}
    </div>
    <button
      onclick={() => onSelect("themes")}
      class="mt-2 w-full text-[10px] text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer text-center py-1"
    >
      View all themes →
    </button>
  </div>

  <!-- Domain shortcuts -->
  <div>
    <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Token domains</div>
    <div class="space-y-1">
      {#each DOMAIN_CARDS as d (d.id)}
        {@const domainOverrides = Object.keys(overrides).filter((k) => k.includes(d.id.slice(0, 5))).length}
        {@const DomainIcon = d.icon}
        <button
          onclick={() => onSelect(d.id)}
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/6 transition-colors cursor-pointer group text-left"
        >
          <div class="text-slate-500 group-hover:text-slate-300 transition-colors shrink-0">
            <DomainIcon class="w-4 h-4" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[11px] font-semibold text-slate-300 group-hover:text-white transition-colors">{d.label}</div>
            <div class="text-[9px] text-slate-600">{d.desc}</div>
          </div>
          {#if domainOverrides > 0}
            <span class="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-full font-mono shrink-0">
              {domainOverrides}
            </span>
          {/if}
          <span class="text-slate-700 group-hover:text-slate-500 text-[10px]">→</span>
        </button>
      {/each}
    </div>
  </div>
</div>
