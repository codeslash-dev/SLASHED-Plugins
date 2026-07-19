<script lang="ts">
  /**
   * RawTokenRow — a labelled free-text field for arbitrary CSS token values
   * (ratios, shadows, urls, keyframes…) with an inline reset. Replaces the
   * hand-rolled "text input + reset" blocks duplicated across panels. Empty
   * input (after trim) resets the override; the raw value is stored verbatim
   * so intentional leading whitespace (e.g. markers) is preserved.
   */
  let { label, labelWidth = "w-20", value, placeholder, overridden, onSet, onReset }: {
    label?: string;
    labelWidth?: string;
    value: string;
    placeholder?: string;
    overridden: boolean;
    onSet: (value: string) => void;
    onReset: () => void;
  } = $props();
</script>

<div class="flex items-center gap-2">
  {#if label}
    <span class={`text-[10px] font-semibold text-slate-600 dark:text-slate-400 ${labelWidth} shrink-0`}>{label}</span>
  {/if}
  <input
    type="text"
    {value}
    {placeholder}
    oninput={(e) => { const v = (e.target as HTMLInputElement).value; v.trim() ? onSet(v) : onReset(); }}
    class="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[9px] font-mono text-slate-700 dark:text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
  />
  {#if overridden}
    <button onclick={onReset} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
  {/if}
</div>
