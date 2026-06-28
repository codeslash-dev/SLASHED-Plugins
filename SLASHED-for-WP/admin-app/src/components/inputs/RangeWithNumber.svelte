<script lang="ts">
  let { value, min, max, step, unit, onChange, disabled = false }: {
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    onChange: (v: number) => void;
    disabled?: boolean;
  } = $props();

  function clamp(v: number) {
    return Math.min(max, Math.max(min, v));
  }

  let pct = $derived(((value - min) / (max - min)) * 100);
</script>

<div class="flex items-center gap-2 w-full">
  <div class="relative flex-1 h-5 flex items-center">
    <div class="absolute inset-x-0 h-1 bg-white/8 rounded-full"></div>
    <div
      class="absolute left-0 h-1 bg-indigo-500 rounded-full"
      style={`width: ${pct}%`}
    ></div>
    <input
      type="range"
      {min}
      {max}
      {step}
      {value}
      {disabled}
      oninput={(e) => onChange(clamp(parseFloat((e.target as HTMLInputElement).value)))}
      class="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed h-full"
    />
    <div
      class="absolute w-3 h-3 bg-white rounded-full shadow-md border border-white/20 pointer-events-none"
      style={`left: calc(${pct}% - 6px)`}
    ></div>
  </div>
  <div class="flex items-center shrink-0">
    <input
      type="number"
      {min}
      {max}
      {step}
      {value}
      {disabled}
      onchange={(e) => onChange(clamp(parseFloat((e.target as HTMLInputElement).value) || 0))}
      class="w-14 bg-white/5 border border-white/10 rounded text-[11px] font-mono text-slate-200 text-right px-1.5 py-0.5 focus:outline-none focus:border-indigo-500 disabled:opacity-40"
    />
    {#if unit}
      <span class="text-[10px] text-slate-500 ml-1 font-mono">{unit}</span>
    {/if}
  </div>
</div>
