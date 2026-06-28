<script lang="ts">
  let { overridesCount, domain }: {
    overridesCount: number;
    domain: string;
  } = $props();
</script>

<div class="h-6 bg-[#07070b] border-t border-white/6 flex items-center px-4 gap-4 shrink-0 select-none">
  <div class="flex items-center gap-1.5">
    <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
    <span class="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">Live</span>
  </div>
  <span class="text-[9px] font-mono text-slate-600">
    {#if overridesCount > 0}
      <span class="text-indigo-400">{overridesCount} override{overridesCount !== 1 ? "s" : ""} active</span>
    {:else}
      No overrides — showing framework defaults
    {/if}
  </span>
  <div class="flex-1"></div>
  <span class="text-[9px] font-mono text-slate-700">{domain}</span>
</div>
