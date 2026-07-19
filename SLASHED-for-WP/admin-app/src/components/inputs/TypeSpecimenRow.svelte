<script lang="ts">
  /**
   * TypeSpecimenRow — one row of the typographic scale preview. The "Aa"
   * renders at the token's real, live font-size (`var(--sf-…)` resolved in
   * this document, which loads the framework tokens plus live overrides), and
   * the label reports the actually rendered size measured from the DOM — the
   * preview can never disagree with reality.
   */
  let { label, varName, family = "--sf-font-body" }: {
    label: string;
    varName: string;
    family?: string;
  } = $props();

  let el = $state<HTMLElement | null>(null);
  let px = $state(0);
  let rootPx = $state(16);

  $effect(() => {
    if (!el) return;
    const node = el;
    const measure = () => {
      px = parseFloat(getComputedStyle(node).fontSize) || 0;
      rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    };
    measure();
    // A font-size change resizes the span, so ResizeObserver re-measures on
    // every token/override change and on viewport-driven fluid changes alike.
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  });
</script>

<div class="flex items-baseline gap-2">
  <span class="text-[9px] font-mono text-slate-400 dark:text-slate-600 w-6 shrink-0 text-right">{label}</span>
  <span
    bind:this={el}
    class="text-slate-900/80 dark:text-white/80 font-medium leading-none"
    style={`font-size: var(${varName}); font-family: var(${family})`}
  >Aa</span>
  <span class="text-[9px] font-mono text-slate-400 dark:text-slate-600 ml-auto shrink-0">{px ? `${(px / rootPx).toFixed(2)}rem` : ""}</span>
</div>
