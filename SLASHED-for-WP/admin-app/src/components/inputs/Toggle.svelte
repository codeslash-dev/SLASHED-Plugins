<script lang="ts">
  /**
   * Toggle — the shared pill switch used across panels (shadow glow, disable
   * motion, boolean state flags…). Previously hand-rolled inline in three
   * panels with slightly different markup; this unifies them. Two sizes:
   * `md` (default) and `sm`.
   */
  let { checked, onToggle, size = "md", ariaLabel, title }: {
    checked: boolean;
    onToggle: () => void;
    size?: "sm" | "md";
    ariaLabel?: string;
    title?: string;
  } = $props();

  let track = $derived(size === "sm" ? "w-8 h-4" : "w-9 h-5");
  let thumb = $derived(size === "sm" ? "w-3 h-3" : "w-4 h-4");
</script>

<button
  type="button"
  aria-label={ariaLabel}
  aria-pressed={checked}
  {title}
  onclick={onToggle}
  class={`${track} rounded-full transition-colors relative cursor-pointer shrink-0 ${checked ? "bg-indigo-600" : "bg-black/10 dark:bg-white/10"}`}
>
  <div class={`absolute top-0.5 ${thumb} bg-white rounded-full shadow transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`}></div>
</button>
