<script lang="ts">
  /**
   * AspectRatioInput — one shared preset grid for "pick a raw aspect ratio for
   * a single token" controls (Macros --sf-aspect, Layout --sf-frame-ratio).
   * Clicking the default preset resets the override. Optional live preview box.
   */
  type Preset = string | { label: string; value: string };

  let { token, value, defaultValue, presets, columns = 3, dense = false, showPreview = false, onSet, onReset }: {
    token: string;
    value: string;
    defaultValue: string;
    presets: Preset[];
    columns?: number;
    dense?: boolean;
    showPreview?: boolean;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
  } = $props();

  const COLS: Record<number, string> = {
    2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 5: "grid-cols-5", 6: "grid-cols-6",
  };
  const norm = (s: string) => s.replace(/\s/g, "");
  let items = $derived(presets.map((p) => (typeof p === "string" ? { label: p, value: p } : p)));
  let colClass = $derived(COLS[columns] ?? "grid-cols-3");
</script>

<div class={`grid ${colClass} ${dense ? "gap-1" : "gap-1.5"}`}>
  {#each items as p (p.value)}
    <button
      onclick={() => p.value === defaultValue ? onReset(token) : onSet(token, p.value)}
      class={`${dense ? "py-1 text-[9px]" : "py-1.5 text-[10px]"} rounded-lg border transition-all cursor-pointer font-mono ${
        norm(value) === norm(p.value)
          ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
          : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
      }`}
    >{p.label}</button>
  {/each}
</div>

{#if showPreview}
  <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3 flex justify-center mt-2">
    <div
      class="bg-indigo-500/30 border border-indigo-500/30 rounded-lg flex items-center justify-center text-[9px] font-mono text-indigo-800 dark:text-indigo-200"
      style={`aspect-ratio:${value};max-height:120px;max-width:100%;width:auto;height:120px`}
    >{value}</div>
  </div>
{/if}
