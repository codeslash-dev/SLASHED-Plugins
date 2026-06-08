<script>
  /**
   * The "BEM" badge injected per structure-panel item.
   *
   * Rendered as an inline <span role="button"> so it does not carry
   * button box-model defaults (min-height) that would resize Bricks'
   * structure-panel rows. Both click and keyboard activation route
   * through onActivate.
   */
  /** @type {{ elementId: string, label?: string, onActivate?: (id: string) => void }} */
  let { elementId, label, onActivate } = $props();

  function activate(event) {
    event.stopPropagation();
    event.preventDefault();
    onActivate?.(elementId);
  }
</script>

<span
  role="button"
  tabindex="0"
  class="rebemer-badge"
  title={label ? `Open reBEMer for ${label}` : 'Open reBEMer'}
  aria-label={label ? `Open reBEMer for ${label}` : 'Open reBEMer'}
  onclick={activate}
  onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && activate(e)}
>reBEM</span>
