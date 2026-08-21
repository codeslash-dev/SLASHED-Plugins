<script lang="ts">
  // Depth = the merged "Shadows + Effects" panel. The audit found these two
  // overlapped (drop-shadow lived in Effects, shadow in Shadows) and split one
  // mental area — "how things sit above the page" — across two rail items. This
  // composes the two existing, self-contained panels under one destination:
  // elevation/shadow/glow first, then the standalone effects (blur, opacity,
  // scrollbar, text/drop shadow). Both panels already take the same props, so
  // no control logic is duplicated.
  import ShadowsPanel from './ShadowsPanel.svelte';
  import EffectsPanel from './EffectsPanel.svelte';

  let { overrides, onSet, onReset }: {
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
  } = $props();
</script>

<div>
  <div class="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
    Elevation & shadows
  </div>
  <ShadowsPanel {overrides} {onSet} {onReset} />

  <div class="mx-4 my-2 h-px bg-black/8 dark:bg-white/8"></div>

  <div class="px-4 pt-2 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
    Effects
  </div>
  <EffectsPanel {overrides} {onSet} {onReset} />
</div>
