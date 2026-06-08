<script>
  /**
   * Non-blocking status toast. Auto-dismisses after `duration` ms
   * (default 3000) unless onDismiss is wired and the user clicks.
   * Uses role="status" for info/success and role="alert" for errors so
   * screen readers announce errors immediately.
   */
  /**
   * @type {{
   *   message: string,
   *   kind?: 'info'|'success'|'error',
   *   duration?: number,
   *   onDismiss?: () => void,
   * }}
   */
  let { message, kind = 'info', duration = 3000, onDismiss } = $props();

  let visible = $state(true);

  $effect(() => {
    if (!visible || duration <= 0) return undefined;
    const t = setTimeout(() => {
      visible = false;
      onDismiss?.();
    }, duration);
    return () => clearTimeout(t);
  });

  const role = $derived(kind === 'error' ? 'alert' : 'status');
</script>

{#if visible}
  <output
    class="rebemer-toast rebemer-toast--{kind}"
    role={role}
    aria-live={kind === 'error' ? 'assertive' : 'polite'}
    onclick={() => { visible = false; onDismiss?.(); }}
  >{message}</output>
{/if}
