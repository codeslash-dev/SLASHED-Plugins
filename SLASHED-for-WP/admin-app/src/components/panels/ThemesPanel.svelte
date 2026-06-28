<script lang="ts">
  import type { PresetTheme } from '../../types';
  import { THEME_PRESETS } from '../../lib/themes';

  let { overrides, onApplyTheme, onResetAll }: {
    overrides: Record<string, string>;
    onApplyTheme: (theme: PresetTheme) => void;
    onResetAll: () => void;
  } = $props();
</script>

<div class="p-4 space-y-5 overflow-y-auto flex-1 h-full">
  <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Theme presets</div>
  <p class="text-[11px] text-slate-400 leading-relaxed">
    Apply a curated set of overrides with one click. Existing overrides outside the theme's scope are preserved.
  </p>

  <div class="space-y-2">
    {#each THEME_PRESETS as theme (theme.id)}
      {@const tokenCount = Object.keys(theme.overrides).length}
      <div class="group rounded-xl border border-white/8 bg-white/4 hover:bg-white/6 hover:border-white/14 transition-all overflow-hidden">
        <div class="flex items-start gap-3 p-4">
          <span class="text-2xl leading-none shrink-0 mt-0.5">{theme.icon}</span>
          <div class="flex-1 min-w-0">
            <div class="text-[12px] font-bold text-slate-200">{theme.name}</div>
            <div class="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{theme.blurb}</div>
            <div class="flex items-center gap-2 mt-2">
              {#if theme.tags}
                {#each theme.tags as tag (tag)}
                  <span class="text-[9px] bg-white/6 text-slate-500 px-2 py-0.5 rounded-full">{tag}</span>
                {/each}
              {/if}
              {#if tokenCount > 0}
                <span class="text-[9px] text-slate-600 font-mono">{tokenCount} overrides</span>
              {/if}
            </div>
          </div>
          <button
            onclick={() => onApplyTheme(theme)}
            class={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              theme.id === "default"
                ? "border border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                : "bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30"
            }`}
          >
            {theme.id === "default" ? "Reset all" : "Apply"}
          </button>
        </div>

        {#if tokenCount > 0}
          <div class="px-4 pb-3 flex flex-wrap gap-1">
            {#each Object.entries(theme.overrides).slice(0, 5) as [k, v] (k)}
              <div class="flex items-center gap-1 bg-white/4 rounded px-1.5 py-0.5">
                {#if k.includes("color") || k.includes("source")}
                  <div
                    class="w-2.5 h-2.5 rounded-full border border-white/10 shrink-0"
                    style={`background: ${v}`}
                  ></div>
                {/if}
                <span class="text-[8px] font-mono text-slate-600">{k.replace("--sf-", "")}</span>
              </div>
            {/each}
            {#if tokenCount > 5}
              <span class="text-[8px] text-slate-600 px-1.5 py-0.5">+{tokenCount - 5} more</span>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
