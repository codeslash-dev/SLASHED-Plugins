<script>
  import { ui, wpSettings } from '../lib/store.svelte.js';
  import { savePluginSettings } from '../lib/wp-api.js';

  // local form state — only committed on save
  let form = $state({
    css_bundle: wpSettings.css_bundle ?? 'optimal',
    html_font_size: wpSettings.html_font_size ?? '16',
    show_class_hints: wpSettings.show_class_hints ?? true,
    manual_css_mode: wpSettings.manual_css_mode ?? false,
    configurator_url: wpSettings.configurator_url ?? '',
  });

  let status = $state(/** @type {'idle'|'saving'|'saved'|'error'} */('idle'));
  let errorMsg = $state('');

  async function handleSubmit(e) {
    e.preventDefault();
    status = 'saving';
    errorMsg = '';
    try {
      await savePluginSettings({ ...form });
      // update reactive state so the rest of the app reacts immediately
      Object.assign(wpSettings, form);
      ui.useManualCss = form.manual_css_mode;
      status = 'saved';
      setTimeout(() => { if (status === 'saved') status = 'idle'; }, 2500);
    } catch (e) {
      status = 'error';
      errorMsg = e?.message ?? 'Save failed';
    }
  }
</script>

<section class="settings-tab">
  <form class="settings-form" onsubmit={handleSubmit}>
    <h2 class="settings-tab__title">Plugin settings</h2>

    <!-- CSS Bundle -->
    <fieldset class="field-group">
      <legend class="field-group__label">CSS bundle</legend>
      <p class="field-group__hint">Which framework bundle to load on the frontend.</p>
      <div class="radio-list">
        {#each [
          { value: 'essential', label: 'Essential', hint: 'Core tokens only — smallest file size' },
          { value: 'optimal', label: 'Optimal', hint: 'Core + components — recommended' },
          { value: 'full', label: 'Full', hint: 'All tokens including experimental' },
        ] as opt (opt.value)}
          <label class="radio-item">
            <input type="radio" name="css_bundle" value={opt.value} bind:group={form.css_bundle} />
            <span class="radio-item__label">{opt.label}</span>
            <span class="radio-item__hint">{opt.hint}</span>
          </label>
        {/each}
      </div>
    </fieldset>

    <!-- Base font size -->
    <div class="field">
      <label class="field__label" for="html-font-size">Root font size (html)</label>
      <p class="field__hint">Used to calculate rem-based tokens.</p>
      <select id="html-font-size" class="field__select" bind:value={form.html_font_size}>
        <option value="14">14px</option>
        <option value="15">15px</option>
        <option value="16">16px (browser default)</option>
        <option value="17">17px</option>
        <option value="18">18px</option>
      </select>
    </div>

    <!-- Class hints -->
    <div class="field field--toggle">
      <label class="toggle">
        <input type="checkbox" bind:checked={form.show_class_hints} />
        <span class="toggle__track"></span>
        <span class="toggle__label">Show utility class hints in editor</span>
      </label>
      <p class="field__hint">Displays Bricks/Gutenberg class names alongside token editors.</p>
    </div>

    <!-- Token input mode -->
    <fieldset class="field-group">
      <legend class="field-group__label">Token input mode</legend>
      <p class="field-group__hint">How design token overrides are configured for this site.</p>
      <div class="radio-list">
        <label class="radio-item">
          <input type="radio" name="manual_css_mode" value={false} bind:group={form.manual_css_mode} />
          <span class="radio-item__label">Built-in configurator</span>
          <span class="radio-item__hint">Full visual editor with live preview (recommended)</span>
        </label>
        <label class="radio-item">
          <input type="radio" name="manual_css_mode" value={true} bind:group={form.manual_css_mode} />
          <span class="radio-item__label">Manual CSS</span>
          <span class="radio-item__hint">Paste raw override CSS from the standalone configurator</span>
        </label>
      </div>
    </fieldset>

    <!-- Configurator URL (shown only when manual mode selected) -->
    {#if form.manual_css_mode}
      <div class="field">
        <label class="field__label" for="configurator-url">Standalone configurator URL</label>
        <p class="field__hint">Link shown in Manual CSS mode so users can open the configurator.</p>
        <input
          id="configurator-url"
          class="field__input"
          type="url"
          placeholder="https://codeslash.net/configurator"
          bind:value={form.configurator_url}
        />
      </div>
    {/if}

    <!-- Actions -->
    <div class="settings-form__actions">
      <button type="submit" class="btn btn--primary" disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : 'Save settings'}
      </button>
      {#if status === 'error'}
        <span class="error-msg">{errorMsg}</span>
      {/if}
    </div>
  </form>
</section>

<style>
  .settings-tab {
    padding: 1.5rem;
    max-width: 600px;
  }

  .settings-tab__title {
    margin: 0 0 1.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--cfg-text, #111);
  }

  .settings-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .field-group {
    border: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .field-group__label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--cfg-text, #111);
  }

  .field-group__hint,
  .field__hint {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--cfg-text-muted, #666);
  }

  .radio-list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .radio-item {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    column-gap: 0.5rem;
    align-items: start;
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    border: 1px solid var(--cfg-border, #ddd);
    background: var(--cfg-surface, #fafafa);
  }

  .radio-item:has(input:checked) {
    border-color: var(--cfg-accent, oklch(0.6 0.18 250));
    background: color-mix(in oklch, var(--cfg-accent, oklch(0.6 0.18 250)) 6%, white);
  }

  .radio-item input[type="radio"] {
    grid-row: 1 / 3;
    margin-top: 0.2rem;
  }

  .radio-item__label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--cfg-text, #111);
  }

  .radio-item__hint {
    font-size: 0.75rem;
    color: var(--cfg-text-muted, #666);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .field__label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--cfg-text, #111);
  }

  .field__select,
  .field__input {
    padding: 0.4375rem 0.625rem;
    border: 1px solid var(--cfg-border, #ddd);
    border-radius: 6px;
    background: var(--cfg-surface, #fafafa);
    color: var(--cfg-text, #111);
    font-size: 0.875rem;
    max-width: 320px;
  }

  .field__select:focus,
  .field__input:focus {
    outline: none;
    border-color: var(--cfg-accent, oklch(0.6 0.18 250));
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--cfg-accent, oklch(0.6 0.18 250)) 20%, transparent);
  }

  .field--toggle {
    gap: 0.25rem;
  }

  .toggle {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    cursor: pointer;
  }

  /* Visually hidden but focusable — keeps keyboard/screen-reader access intact. */
  .toggle input[type="checkbox"] {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .toggle__track {
    width: 2.25rem;
    height: 1.25rem;
    background: var(--cfg-border, #ccc);
    border-radius: 999px;
    position: relative;
    transition: background 0.2s;
    flex-shrink: 0;
  }

  .toggle__track::after {
    content: '';
    position: absolute;
    width: 1rem;
    height: 1rem;
    background: #fff;
    border-radius: 50%;
    top: 0.125rem;
    left: 0.125rem;
    transition: transform 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  .toggle input:checked ~ .toggle__track {
    background: var(--cfg-accent, oklch(0.6 0.18 250));
  }

  .toggle input:checked ~ .toggle__track::after {
    transform: translateX(1rem);
  }

  .toggle__label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--cfg-text, #111);
  }

  .settings-form__actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
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

  .error-msg {
    font-size: 0.85rem;
    color: oklch(0.5 0.22 25);
  }
</style>
