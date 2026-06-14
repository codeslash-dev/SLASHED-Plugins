<script>
  import { parseCSS } from '../lib/css.js';
  import { overrides, ui, wpSettings, replaceOverrides } from '../lib/store.svelte.js';

  let cssText = $state(ui.manualCssText ?? '');
  let status = $state(/** @type {'idle'|'saving'|'saved'|'error'} */('idle'));
  let errorMsg = $state('');

  let parsedCount = $derived.by(() => {
    try {
      return Object.keys(parseCSS(cssText)).length;
    } catch {
      return 0;
    }
  });

  const currentCount = $derived(Object.keys(overrides).length);

  async function handleSave() {
    status = 'saving';
    errorMsg = '';
    try {
      const map = parseCSS(cssText);
      await replaceOverrides(map);
      ui.manualCssText = cssText;
      status = 'saved';
      setTimeout(() => { if (status === 'saved') status = 'idle'; }, 2500);
    } catch (e) {
      status = 'error';
      errorMsg = e?.message ?? 'Save failed';
    }
  }

  async function handleClear() {
    cssText = '';
    ui.manualCssText = '';
    status = 'saving';
    try {
      await replaceOverrides({});
      status = 'saved';
      setTimeout(() => { if (status === 'saved') status = 'idle'; }, 2500);
    } catch (e) {
      status = 'error';
      errorMsg = e?.message ?? 'Clear failed';
    }
  }
</script>

<section class="manual-css">
  <header class="manual-css__header">
    <h2>Manual CSS mode</h2>
    {#if currentCount > 0}
      <span class="badge">{currentCount} token{currentCount === 1 ? '' : 's'} stored</span>
    {/if}
  </header>

  <p class="manual-css__hint">
    Generate override CSS using the standalone configurator, then paste it here.
    {#if wpSettings.configurator_url}
      <a href={wpSettings.configurator_url} target="_blank" rel="noopener noreferrer">Open configurator →</a>
    {/if}
  </p>

  <div class="manual-css__editor">
    <textarea
      class="manual-css__textarea"
      spellcheck="false"
      autocorrect="off"
      autocapitalize="off"
      placeholder={`@layer slashed.overrides {\n  :root {\n    --sf-color-brand: oklch(0.65 0.2 220);\n    --sf-font-size-base: 1.125rem;\n  }\n}`}
      bind:value={cssText}
    ></textarea>
  </div>

  {#if parsedCount > 0 && cssText}
    <p class="manual-css__preview-count">
      {parsedCount} override{parsedCount === 1 ? '' : 's'} detected in pasted CSS
    </p>
  {/if}

  <div class="manual-css__actions">
    <button
      class="btn btn--primary"
      onclick={handleSave}
      disabled={status === 'saving' || !cssText.trim()}
    >
      {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : 'Validate & Save'}
    </button>
    <button
      class="btn btn--ghost"
      onclick={handleClear}
      disabled={status === 'saving'}
    >
      Clear
    </button>
  </div>

  {#if status === 'error'}
    <p class="manual-css__error">{errorMsg}</p>
  {/if}
</section>

<style>
  .manual-css {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    height: 100%;
    box-sizing: border-box;
  }

  .manual-css__header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .manual-css__header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--cfg-text, #111);
  }

  .badge {
    background: var(--cfg-accent, oklch(0.6 0.18 250));
    color: #fff;
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
  }

  .manual-css__hint {
    margin: 0;
    font-size: 0.85rem;
    color: var(--cfg-text-muted, #666);
  }

  .manual-css__hint a {
    color: var(--cfg-accent, oklch(0.6 0.18 250));
  }

  .manual-css__editor {
    flex: 1;
    min-height: 0;
  }

  .manual-css__textarea {
    width: 100%;
    height: 100%;
    min-height: 280px;
    font-family: ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
    font-size: 0.8125rem;
    line-height: 1.6;
    padding: 0.75rem;
    border: 1px solid var(--cfg-border, #ddd);
    border-radius: 6px;
    background: var(--cfg-surface, #fafafa);
    color: var(--cfg-text, #111);
    resize: vertical;
    box-sizing: border-box;
  }

  .manual-css__textarea:focus {
    outline: none;
    border-color: var(--cfg-accent, oklch(0.6 0.18 250));
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--cfg-accent, oklch(0.6 0.18 250)) 20%, transparent);
  }

  .manual-css__preview-count {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--cfg-text-muted, #666);
  }

  .manual-css__actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.5rem 1.25rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background 0.15s, opacity 0.15s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn--primary {
    background: var(--cfg-accent, oklch(0.6 0.18 250));
    color: #fff;
  }

  .btn--primary:not(:disabled):hover {
    background: color-mix(in oklch, var(--cfg-accent, oklch(0.6 0.18 250)) 85%, black);
  }

  .btn--ghost {
    background: transparent;
    color: var(--cfg-text, #111);
    border-color: var(--cfg-border, #ddd);
  }

  .btn--ghost:not(:disabled):hover {
    background: var(--cfg-hover, #f0f0f0);
  }

  .manual-css__error {
    margin: 0;
    color: oklch(0.5 0.22 25);
    font-size: 0.85rem;
  }
</style>
