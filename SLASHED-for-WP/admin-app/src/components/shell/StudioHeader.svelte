<script lang="ts">
  import { tick } from 'svelte';
  import { Undo2, Redo2, Trash2, Share2, FolderOpen, Check, Save, Loader2, AlertTriangle, Sun, Moon } from '@lucide/svelte';
  import { themeState, toggleTheme } from '../../lib/theme.svelte';

  const version = typeof __SLASHED_VERSION__ !== "undefined" ? __SLASHED_VERSION__ : "";

  let { overridesCount, canUndo, canRedo, hasPendingChanges, saveState, onUndo, onRedo, onResetAll, onImport, onExport, onSave }: {
    overridesCount: number;
    canUndo: boolean;
    canRedo: boolean;
    hasPendingChanges: boolean;
    saveState: 'idle' | 'saving' | 'saved' | 'error';
    onUndo: () => void;
    onRedo: () => void;
    onResetAll: () => void;
    onImport: () => void;
    onExport: () => void;
    onSave: () => void;
  } = $props();

  let shareFeedback = $state(false);
  let showResetConfirm = $state(false);
  let resetCancelBtn = $state<HTMLButtonElement | null>(null);
  let resetConfirmBtn = $state<HTMLButtonElement | null>(null);

  $effect(() => {
    if (showResetConfirm) {
      tick().then(() => resetCancelBtn?.focus());
    }
  });

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      shareFeedback = true;
      setTimeout(() => { shareFeedback = false; }, 2000);
    } catch {
      // ignore
    }
  }

  function handleResetAllClick() {
    showResetConfirm = true;
  }

  function confirmReset() {
    showResetConfirm = false;
    onResetAll();
  }

  function cancelReset() {
    showResetConfirm = false;
  }
</script>

<header class="h-[52px] bg-slate-50 dark:bg-[#0d0d14] border-b border-black/8 dark:border-white/8 flex items-center px-3 gap-2 sm:gap-3 shrink-0 z-20">
  <div class="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg leading-none select-none shadow-lg shadow-indigo-600/30 shrink-0">
    /
  </div>

  <div class="hidden sm:block shrink-0">
    <div class="text-[11px] font-bold text-slate-900 dark:text-white tracking-tight leading-none flex items-center gap-1.5">
      SLASHED Studio
      <span class="text-[9px] bg-indigo-500/20 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold px-1.5 py-0.5 rounded-full font-mono">
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
      class="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-700 dark:text-indigo-300 text-[10px] font-bold font-mono hover:bg-indigo-500/20 transition-colors cursor-pointer shrink-0"
    >
      <span class="w-4 h-4 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[9px] font-black">{overridesCount}</span>
      <span class="hidden sm:inline">customised · </span>Export →
    </button>
  {/if}

  <div class="flex-1"></div>

  <div class="flex items-center gap-1.5">
    <button
      onclick={onSave}
      disabled={!hasPendingChanges || saveState === 'saving'}
      title={saveState === 'error' ? "Save failed — click to retry" : hasPendingChanges ? "Save changes (Ctrl+S)" : "No unsaved changes"}
      class={[
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer",
        saveState === 'error'
          ? "bg-red-100 dark:bg-red-900/40 border border-red-500/30 text-red-700 dark:text-red-300"
          : saveState === 'saved'
          ? "bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
          : hasPendingChanges
            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/30"
            : "bg-black/5 dark:bg-white/5 text-slate-500 disabled:opacity-40 disabled:pointer-events-none",
      ].join(' ')}
    >
      {#if saveState === 'saving'}
        <Loader2 class="w-3.5 h-3.5 animate-spin" />
        Saving…
      {:else if saveState === 'saved'}
        <Check class="w-3.5 h-3.5" />
        Saved
      {:else if saveState === 'error'}
        <AlertTriangle class="w-3.5 h-3.5" />
        Save failed
      {:else}
        <Save class="w-3.5 h-3.5" />
        Save
      {/if}
    </button>

    <button
      onclick={onUndo}
      disabled={!canUndo}
      title="Undo (Ctrl+Z)"
      class="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/8 dark:hover:bg-white/8 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer"
    >
      <Undo2 class="w-3.5 h-3.5" />
    </button>
    <button
      onclick={onRedo}
      disabled={!canRedo}
      title="Redo (Ctrl+Shift+Z)"
      class="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/8 dark:hover:bg-white/8 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer"
    >
      <Redo2 class="w-3.5 h-3.5" />
    </button>

    <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>

    <button
      onclick={handleShare}
      title="Copy share link"
      class="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/8 dark:hover:bg-white/8 transition-all cursor-pointer"
    >
      {#if shareFeedback}
        <Check class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      {:else}
        <Share2 class="w-3.5 h-3.5" />
      {/if}
    </button>

    <button
      onclick={onImport}
      title="Import CSS overrides"
      class="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/8 dark:hover:bg-white/8 transition-all cursor-pointer"
    >
      <FolderOpen class="w-3.5 h-3.5" />
    </button>

    <button
      onclick={handleResetAllClick}
      disabled={overridesCount === 0}
      title="Reset all overrides"
      class="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:bg-rose-500/10 disabled:opacity-25 disabled:pointer-events-none transition-all cursor-pointer"
    >
      <Trash2 class="w-3.5 h-3.5" />
    </button>

    <div class="w-px h-4 bg-black/10 dark:bg-white/10 mx-1"></div>

    <button
      onclick={toggleTheme}
      title={themeState.value === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={themeState.value === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={themeState.value === "dark"}
      class="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/8 dark:hover:bg-white/8 transition-all cursor-pointer"
    >
      {#if themeState.value === "dark"}
        <Sun class="w-3.5 h-3.5" />
      {:else}
        <Moon class="w-3.5 h-3.5" />
      {/if}
    </button>
  </div>
</header>

{#if showResetConfirm}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="reset-confirm-title"
    tabindex="-1"
    onclick={(e) => { if (e.target === e.currentTarget) cancelReset(); }}
    onkeydown={(e) => {
      if (e.key === 'Escape') { e.stopPropagation(); cancelReset(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        const focused = document.activeElement;
        if (focused === resetCancelBtn) resetConfirmBtn?.focus();
        else resetCancelBtn?.focus();
      }
    }}
  >
    <div class="bg-white dark:bg-[#1a1a2e] border border-black/10 dark:border-white/10 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
      <h3 id="reset-confirm-title" class="text-slate-900 dark:text-white font-bold text-sm mb-2">Reset all overrides?</h3>
      <p class="text-slate-600 dark:text-slate-400 text-xs mb-5">
        This will clear all {overridesCount} customisation{overridesCount !== 1 ? 's' : ''}.
        You can still undo this before saving.
      </p>
      <div class="flex gap-2 justify-end">
        <button
          bind:this={resetCancelBtn}
          onclick={cancelReset}
          class="px-3 py-1.5 text-xs rounded-lg bg-black/8 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-black/12 dark:hover:bg-white/12 transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          bind:this={resetConfirmBtn}
          onclick={confirmReset}
          class="px-3 py-1.5 text-xs rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors cursor-pointer"
        >
          Reset all
        </button>
      </div>
    </div>
  </div>
{/if}
