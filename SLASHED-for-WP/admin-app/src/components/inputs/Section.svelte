<script lang="ts">
  /**
   * Section — the shared collapsible panel section. Replaces the
   * button[aria-expanded] + {#if} header block that was hand-copied ~50 times
   * across every panel. `open` is bindable so panels keep their own $state.
   * `variant="advanced"` renders the de-emphasised sub-section header used for
   * "Advanced" power-knob groups.
   */
  import type { Snippet } from 'svelte';

  let { title, open = $bindable(false), variant = 'default', spacing = 'space-y-3', children }: {
    title: string;
    open?: boolean;
    variant?: 'default' | 'advanced';
    spacing?: string;
    children: Snippet;
  } = $props();
</script>

<section class={spacing}>
  <button
    onclick={() => open = !open}
    aria-expanded={open}
    class={variant === 'advanced'
      ? "w-full flex items-center justify-between text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors cursor-pointer"
      : "w-full flex items-center justify-between cursor-pointer"}
  >
    <div class={variant === 'advanced'
      ? "text-[10px] font-semibold uppercase tracking-widest"
      : "text-[10px] font-bold text-slate-500 uppercase tracking-widest"}>{title}</div>
    <span class={variant === 'advanced' ? "text-[10px]" : "text-[10px] text-slate-500"}>{open ? "▲" : "▼"}</span>
  </button>
  {#if open}
    {@render children()}
  {/if}
</section>
