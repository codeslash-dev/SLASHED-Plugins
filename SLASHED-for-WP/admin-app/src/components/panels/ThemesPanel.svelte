<script lang="ts">
  import { Save, Trash2, Check } from '@lucide/svelte';
  import type { SavedSlot } from '../../types';
  import { listSavedThemes, saveTheme, deleteTheme } from '../../lib/savedThemes';

  let { overrides, onApplyTheme, onResetAll }: {
    overrides: Record<string, string>;
    onApplyTheme: (overrides: Record<string, string>) => void;
    onResetAll: () => void;
  } = $props();

  let themes = $state<SavedSlot[]>(listSavedThemes());
  let newName = $state("");

  let overridesCount = $derived(Object.keys(overrides).length);

  function shallowEq(a: Record<string, string>, b: Record<string, string>): boolean {
    const ak = Object.keys(a);
    if (ak.length !== Object.keys(b).length) return false;
    return ak.every((k) => a[k] === b[k]);
  }

  // Mark a theme as active when its snapshot matches the live overrides exactly.
  let activeId = $derived(themes.find((t) => shallowEq(t.overrides, overrides))?.id ?? "");

  function handleSave() {
    if (overridesCount === 0) return;
    themes = saveTheme(newName, overrides);
    newName = "";
  }

  function handleDelete(id: string) {
    themes = deleteTheme(id);
  }
</script>

<div class="p-4 space-y-5 overflow-y-auto flex-1 h-full">
  <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Themes</div>
  <p class="text-[11px] text-slate-400 leading-relaxed">
    Save your current configuration as a named theme, then re-apply it any time.
    Themes are stored in this browser.
  </p>

  <!-- Save current as a new theme -->
  <div class="rounded-xl border border-white/8 bg-white/4 p-3 space-y-2">
    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Save current</div>
    <div class="flex items-center gap-2">
      <input
        type="text"
        bind:value={newName}
        placeholder="Theme name"
        onkeydown={(e) => { if (e.key === "Enter") handleSave(); }}
        class="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
      />
      <button
        onclick={handleSave}
        disabled={overridesCount === 0}
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Save class="w-3 h-3" />
        Save
      </button>
    </div>
    <p class="text-[9px] text-slate-600">
      {#if overridesCount === 0}
        No active overrides yet — adjust some tokens first.
      {:else}
        Captures all {overridesCount} active override{overridesCount === 1 ? "" : "s"}.
      {/if}
    </p>
  </div>

  <!-- Saved themes -->
  <div class="space-y-2">
    {#if themes.length === 0}
      <div class="rounded-xl border border-dashed border-white/10 p-6 text-center">
        <p class="text-[11px] text-slate-500">No saved themes yet.</p>
        <p class="text-[10px] text-slate-600 mt-1">Configure your tokens, then save them above.</p>
      </div>
    {:else}
      {#each themes as theme (theme.id)}
        {@const tokenCount = Object.keys(theme.overrides).length}
        <div class={`group rounded-xl border transition-all overflow-hidden ${
          activeId === theme.id
            ? "border-indigo-500/40 bg-indigo-500/10"
            : "border-white/8 bg-white/4 hover:bg-white/6 hover:border-white/14"
        }`}>
          <div class="flex items-start gap-3 p-4">
            <span class="text-2xl leading-none shrink-0 mt-0.5">{theme.icon}</span>
            <div class="flex-1 min-w-0">
              <div class="text-[12px] font-bold text-slate-200 flex items-center gap-1.5">
                {theme.name}
                {#if activeId === theme.id}
                  <Check class="w-3 h-3 text-indigo-400" />
                {/if}
              </div>
              <div class="text-[10px] text-slate-500 mt-0.5 font-mono">{tokenCount} override{tokenCount === 1 ? "" : "s"}</div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button
                onclick={() => onApplyTheme(theme.overrides)}
                class="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/30 transition-all cursor-pointer"
              >Apply</button>
              <button
                aria-label="Delete theme"
                onclick={() => handleDelete(theme.id)}
                class="p-1.5 rounded-lg border border-white/8 text-slate-500 hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus:opacity-100"
              ><Trash2 class="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {#if tokenCount > 0}
            <div class="px-4 pb-3 flex flex-wrap gap-1">
              {#each Object.entries(theme.overrides).slice(0, 5) as [k, v] (k)}
                <div class="flex items-center gap-1 bg-white/4 rounded px-1.5 py-0.5">
                  {#if k.includes("color") || k.includes("source")}
                    <div class="w-2.5 h-2.5 rounded-full border border-white/10 shrink-0" style:background={v}></div>
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
    {/if}
  </div>

  <!-- Reset -->
  {#if overridesCount > 0}
    <button
      onclick={onResetAll}
      class="w-full py-2 rounded-lg text-[11px] font-bold border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
    >Reset all overrides</button>
  {/if}
</div>
