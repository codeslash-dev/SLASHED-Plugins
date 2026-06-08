<script>
  /**
   * Color System orchestrator.
   *
   * Owns the open/closed state, renders the always-present launcher pill, and
   * mounts the panel on demand. Mounted once by main.js (independent of the
   * reBEMer structure-panel pipeline) so the colour browser is reachable from
   * anywhere in the builder, not tied to a selected element.
   */
  import ColorLauncher from './ColorLauncher.svelte';
  import ColorPanel from './ColorPanel.svelte';

  /** @type {{ source: { variables: string[], light: object, dark: object } }} */
  let { source } = $props();

  let open = $state(false);
</script>

<ColorLauncher {open} onToggle={() => (open = !open)} />

{#if open}
  <ColorPanel {source} onClose={() => (open = false)} />
{/if}
