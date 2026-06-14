<script>
  /**
   * Inline WCAG-contrast pill for a color token.
   *
   * Resolves the token's effective value through a hidden probe element that
   * has the entire framework cascade in scope (see lib/probeHost.js — that's
   * how `light-dark()`, `oklch(from var(...) …)` and plain `var(--sf-bg)`
   * references all resolve to a real `rgb(…)`). Then it asks lib/contrast.js
   * which of pure-white or pure-black gives the higher WCAG 2.1 ratio against
   * that color, and renders the badge:
   *
   *   AAA   ratio ≥ 7    — green
   *   AA    ratio ≥ 4.5  — teal
   *   AA-L  ratio ≥ 3    — amber (large text only)
   *   fail  ratio < 3    — red
   *
   * Re-evaluates on every value/override/theme change. Cheap because each
   * read mounts and removes a single 1px probe, and the host's style block is
   * shared and updated only when the cascade actually changes.
   */
  import { contrastInfo } from '../lib/contrast.js';
  import { measureBackground } from '../lib/probeHost.js';
  import { overrides, ui } from '../lib/store.svelte.js';

  /** @type {{ value: string }} The CSS color expression to evaluate. */
  let { value } = $props();

  // Reactive trigger: any change to overrides / theme refreshes the probe
  // host, then we re-measure. We touch `overrides` and `ui.previewTheme`
  // explicitly so Svelte tracks them as dependencies.
  let info = $state(null);

  $effect(() => {
    void overrides;        // reactive dep
    void ui.previewTheme;  // reactive dep
    if (!value) { info = null; return; }
    // Defer to a microtask so the probe-host effect in App.svelte has a
    // chance to update the cascade before we read.
    queueMicrotask(() => {
      const rgb = measureBackground(value);
      info = rgb ? contrastInfo(rgb) : null;
    });
  });

  const lvlClass = $derived(
    info?.level === 'AAA'  ? 'cb--aaa'
    : info?.level === 'AA' ? 'cb--aa'
    : info?.level === 'AA-L' ? 'cb--aaL'
    : 'cb--fail'
  );
</script>

{#if info}
  <span
    class="cb {lvlClass}"
    title="WCAG contrast {info.ratio}:1 against {info.against} — {info.label}"
    aria-label="Contrast {info.ratio}:1, {info.label}"
  >
    {info.ratio}:1 · {info.label}
  </span>
{/if}

<style>
  .cb {
    display: inline-flex;
    align-items: center;
    font-family: var(--cfg-mono);
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: 0.02em;
    padding: 1px 6px;
    border-radius: 999px;
    border: 1px solid var(--cfg-border-strong);
    color: var(--cfg-text-muted);
    background: var(--cfg-surface-2);
    white-space: nowrap;
    line-height: 1.5;
  }
  .cb--aaa  { color: #87e8a4; border-color: rgba(135, 232, 164, 0.4); background: rgba(40, 138, 65, 0.18); }
  .cb--aa   { color: #6dd9c8; border-color: rgba(109, 217, 200, 0.4); background: rgba(40, 130, 130, 0.18); }
  .cb--aaL  { color: #ffd79a; border-color: rgba(255, 215, 154, 0.4); background: rgba(184, 130, 30, 0.18); }
  .cb--fail { color: #ff8c8c; border-color: rgba(255, 140, 140, 0.4); background: rgba(180, 50, 50, 0.18); }
</style>
