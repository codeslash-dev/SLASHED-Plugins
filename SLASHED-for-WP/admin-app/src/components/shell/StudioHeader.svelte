<script lang="ts">
  import { Undo2, Redo2, Trash2, Share2, FolderOpen, Check, Save, Loader2 } from 'lucide-svelte';

  const version = typeof __SLASHED_VERSION__ !== "undefined" ? __SLASHED_VERSION__ : "";

  let { overridesCount, canUndo, canRedo, hasPendingChanges, saveState, onUndo, onRedo, onResetAll, onImport, onExport, onSave }: {
    overridesCount: number;
    canUndo: boolean;
    canRedo: boolean;
    hasPendingChanges: boolean;
    saveState: 'idle' | 'saving' | 'saved';
    onUndo: () => void;
    onRedo: () => void;
    onResetAll: () => void;
    onImport: () => void;
    onExport: () => void;
    onSave: () => void;
  } = $props();

  let shareFeedback = $state(false);

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      shareFeedback = true;
      setTimeout(() => { shareFeedback = false; }, 2000);
    } catch {
      // ignore
    }
  }
</script>

<header class="h-[52px] bg-[#0d0d14] border-b border-white/8 flex items-center px-3 gap-3 shrink-0 z-20">
  <div class="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg leading-none select-none shadow-lg shadow-indigo-600/30 shrink-0">
    /
  </div>

  <div class="shrink-0">
    <div class="text-[11px] font-bold text-white tracking-tight leading-none flex items-center gap-1.5">
      SLASHED Studio
      <span class="text-[9px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold px-1.5 py-0.5 rounded-full font-mono">
        v{version}
      </span>
    </div>
    <div class="text-[9px] text-slate-500 font-mono tracking-widest uppercase mt-0.5">
      Token Architect
    </div>
  </div>

  {#if overridesCount > 0}
    <button
      onclick={onExport}
      class="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-300 text-[10px] font-bold font-mono hover:bg-indigo-500/20 transition-colors cursor-pointer shrink-0"
    >
      <span class="w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[9px] font-black">{overridesCount}</span>
      customised · Export →
    </button>
  {/if}

  <div class="flex-1"></div>

  <div class="flex items-center gap-1.5">
    <button
      onclick={onUndo}
      disabled={!canUndo}
      title="Undo (Ctrl+Z)"
      class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer"
    >
      <Undo2 class="w-3.5 h-3.5" />
    </button>
    <button
      onclick={onRedo}
      disabled={!canRedo}
      title="Redo (Ctrl+Shift+Z)"
      class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer"
    >
      <Redo2 class="w-3.5 h-3.5" />
    </button>

    <div class="w-px h-4 bg-white/10 mx-1"></div>

    <button
      onclick={handleShare}
      title="Copy share link"
      class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all cursor-pointer"
    >
      {#if shareFeedback}
        <Check class="w-3.5 h-3.5 text-emerald-400" />
      {:else}
        <Share2 class="w-3.5 h-3.5" />
      {/if}
    </button>

    <button
      onclick={onImport}
      title="Import CSS overrides"
      class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-all cursor-pointer"
    >
      <FolderOpen class="w-3.5 h-3.5" />
    </button>

    <button
      onclick={onResetAll}
      disabled={overridesCount === 0}
      title="Reset all overrides"
      class="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer"
    >
      <Trash2 class="w-3.5 h-3.5" />
    </button>

    <div class="w-px h-4 bg-white/10 mx-1"></div>

    <button
      onclick={onSave}
      disabled={!hasPendingChanges || saveState === 'saving'}
      title={hasPendingChanges ? "Save changes (Ctrl+S)" : "No unsaved changes"}
      class={[
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
        saveState === 'saved'
          ? "bg-emerald-900/40 border border-emerald-500/30 text-emerald-300"
          : hasPendingChanges
            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30"
            : "bg-white/5 text-slate-500 disabled:opacity-40 disabled:pointer-events-none",
      ].join(' ')}
    >
      {#if saveState === 'saving'}
        <Loader2 class="w-3.5 h-3.5 animate-spin" />
        Saving…
      {:else if saveState === 'saved'}
        <Check class="w-3.5 h-3.5" />
        Saved
      {:else}
        <Save class="w-3.5 h-3.5" />
        Save
      {/if}
    </button>
  </div>
</header>
