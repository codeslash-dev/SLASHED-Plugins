<script lang="ts">
  import type { PowerKnob } from '../../types';
  import RangeWithNumber from './RangeWithNumber.svelte';

  let { knob, overrides, onChange }: {
    knob: PowerKnob;
    overrides: Record<string, string>;
    onChange: (name: string, value: string | null) => void;
  } = $props();

  let rawVal = $derived(overrides[knob.name]);
  let decoded = $derived(rawVal !== undefined
    ? (knob.decode ? knob.decode(rawVal) : parseFloat(rawVal))
    : knob.default);
  let value = $derived(isNaN(decoded) ? knob.default : decoded);
  let isOverridden = $derived(knob.name in overrides);

  function handleChange(v: number) {
    const encoded = knob.encode ? knob.encode(v) : String(v);
    onChange(knob.name, encoded);
  }

  function handleReset() {
    onChange(knob.name, null);
  }
</script>

<div class="group">
  <div class="flex items-center justify-between mb-1.5">
    <div class="flex items-center gap-2">
      <span class="text-[11px] font-semibold text-slate-700 dark:text-slate-300">{knob.label}</span>
      {#if knob.driving !== undefined}
        <span class="text-[9px] text-slate-400 dark:text-slate-600 font-mono">→ {knob.driving} tokens</span>
      {/if}
    </div>
    {#if isOverridden}
      <button
        onclick={handleReset}
        class="text-[9px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer "
      >
        reset
      </button>
    {/if}
  </div>
  <RangeWithNumber
    {value}
    min={knob.min}
    max={knob.max}
    step={knob.step}
    unit={knob.unit}
    onChange={handleChange}
  />
  {#if knob.help}
    <p class="text-[10px] text-slate-400 dark:text-slate-600 mt-1 leading-relaxed">{knob.help}</p>
  {/if}
</div>
