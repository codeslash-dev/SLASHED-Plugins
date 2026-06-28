<script lang="ts">
  import RangeWithNumber from './RangeWithNumber.svelte';

  let { label, help, value, min, max, step, unit, overridden, onChange, onReset }: {
    label: string;
    help?: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    overridden: boolean;
    onChange: (v: number) => void;
    onReset: () => void;
  } = $props();
</script>

<div class="group">
  <div class="flex items-center justify-between mb-1.5">
    <span class="text-[11px] font-semibold text-slate-200">{label}</span>
    {#if overridden}
      <button
        onclick={onReset}
        class="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-colors"
      >
        reset
      </button>
    {/if}
  </div>
  <RangeWithNumber {value} {min} {max} {step} {unit} {onChange} />
  {#if help}
    <p class="text-[10px] text-slate-600 mt-1 leading-relaxed">{help}</p>
  {/if}
</div>
