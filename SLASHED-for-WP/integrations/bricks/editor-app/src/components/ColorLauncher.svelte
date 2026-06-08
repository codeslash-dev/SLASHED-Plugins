<script>
  /**
   * Floating launcher for the Color System panel.
   *
   * A small pill pinned to the bottom-right of the builder viewport. Kept
   * deliberately unobtrusive (out of the way of Bricks' own toolbars) and
   * toggles the panel open/closed. Reflects open state via aria-pressed.
   */
  /** @type {{ open: boolean, onToggle: () => void }} */
  let { open, onToggle } = $props();
</script>

<button
  type="button"
  class="slashed-cp-launch"
  class:slashed-cp-launch--on={open}
  aria-pressed={open}
  aria-label="Toggle SLASHED Color System"
  title="SLASHED Color System"
  onclick={onToggle}
>
  <span class="slashed-cp-launch__dot" aria-hidden="true"></span>
  <span class="slashed-cp-launch__txt">Colors</span>
</button>
