<script>
  import { wpSettings, overrides, replaceOverrides } from '../lib/store.svelte.js';
  import { savePluginSettings } from '../lib/wp-api.js';
  import { encode, decode } from '../lib/codec.js';
  import { sanitizeValue } from '../lib/css.js';
  import { tokenByName } from '../lib/model.js';
  import registry from '../data/token-registry.generated.json';

  // Fallback when no configurator URL is configured — the hosted instance.
  // Keep in sync with includes/class-token-page.php::CONFIGURATOR_URL.
  const CONFIGURATOR_URL = 'https://slashed.codeslash.dev/configurator/';

  let form = $state({
    configurator_url: wpSettings.configurator_url ?? '',
  });

  /** Tokens currently overridden on this site (hydrated from WP). */
  const overrideCount = $derived(Object.keys(overrides).length);

  // ── Import a shared config code/URL ─────────────────────────────────────────

  let importInput = $state('');
  let importResult = $state(/** @type {null | { ok: boolean, msg: string }} */(null));

  /**
   * Pull the raw config code out of a pasted string. Accepts either a bare code
   * or a full configurator URL — everything after the last `#c=` is the code.
   */
  function extractCode(raw) {
    const s = String(raw ?? '').trim();
    const i = s.lastIndexOf('#c=');
    return i === -1 ? s : s.slice(i + 3);
  }

  /**
   * Decode the pasted config code and replace the site's overrides with it.
   * Routes through the store's replaceOverrides (persists via REST, undoable
   * with Ctrl+Z). decode() never throws — garbage yields an empty map.
   */
  function handleImport() {
    const code = extractCode(importInput);
    if (!code) {
      importResult = { ok: false, msg: 'Paste a config code or configurator link first.' };
      return;
    }
    const had = Object.keys(overrides).length;
    const map = decode(code, registry, {
      sanitize: sanitizeValue,
      isKnown: (name) => tokenByName.has(name),
    });
    const n = Object.keys(map).length;
    if (n === 0) {
      importResult = { ok: false, msg: 'No valid tokens found in that code.' };
      return;
    }
    replaceOverrides(map);
    importInput = '';
    const replaced = had > 0 ? ` (replaced ${had} existing)` : '';
    importResult = {
      ok: true,
      msg: `Imported ${n} token${n === 1 ? '' : 's'}${replaced}. Undo with Ctrl+Z.`,
    };
  }

  /**
   * "Open in configurator" link target. The site's current token overrides are
   * packed into a config code (the same Guild-Wars-2-style codec the
   * configurator's own share links use — vendored at lib/codec.js +
   * data/token-registry.generated.json) and handed over in the URL fragment, so
   * the configurator opens pre-loaded with these exact tokens. With no
   * overrides it opens at its defaults. The fragment never reaches any server.
   */
  const configuratorHref = $derived.by(() => {
    const base = (form.configurator_url || CONFIGURATOR_URL).trim() || CONFIGURATOR_URL;
    const code = encode(overrides, registry);
    return code ? `${base}#c=${code}` : base;
  });

  let status = $state(/** @type {'idle'|'saving'|'saved'|'error'} */('idle'));
  let errorMsg = $state('');

  async function handleSubmit(e) {
    e.preventDefault();
    status = 'saving';
    errorMsg = '';
    try {
      await savePluginSettings({ ...form });
      Object.assign(wpSettings, form);
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
    <h2 class="settings-tab__title">Design settings</h2>

    <!-- Standalone configurator link -->
    <div class="field">
      <label class="field__label" for="configurator-url">Standalone configurator URL</label>
      <p class="field__hint">
        Link to the external configurator — shown in Manual CSS mode so users can open it directly.
      </p>
      <input
        id="configurator-url"
        class="field__input"
        type="url"
        placeholder="https://codeslash.net/configurator"
        bind:value={form.configurator_url}
      />
      <p class="field__open">
        <a class="open-link" href={configuratorHref} target="_blank" rel="noopener noreferrer">
          Open in configurator ↗
        </a>
        {#if overrideCount > 0}
          <span class="field__hint">— pre-loaded with your {overrideCount} saved
            token{overrideCount === 1 ? '' : 's'}</span>
        {/if}
      </p>
    </div>

    <!-- Import a shared config code/URL -->
    <div class="field">
      <span class="field__label">Import shared config</span>
      <p class="field__hint">
        Paste a config code or a configurator link (<code>…#c=…</code>) to load that
        design. This replaces the site's current token overrides.
      </p>
      <div class="import-row">
        <input
          class="field__input"
          type="text"
          placeholder="Paste config code or configurator link…"
          bind:value={importInput}
          onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleImport(); } }}
        />
        <button type="button" class="btn btn--secondary" onclick={handleImport} disabled={!importInput.trim()}>
          Import
        </button>
      </div>
      {#if importResult}
        <p class="import-result" class:import-result--ok={importResult.ok} class:import-result--err={!importResult.ok}>
          {importResult.msg}
        </p>
      {/if}
    </div>

    <!-- Other settings note -->
    <div class="settings-note">
      <p>
        CSS bundle, delivery source, builder integrations and site behaviour are configured in
        <a href={window.slashedApp?.settingsUrl ?? '#'} target="_self">Plugin Settings</a>.
      </p>
    </div>

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
    max-width: 560px;
    overflow-y: auto;
    height: 100%;
    box-sizing: border-box;
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

  .field__hint {
    margin: 0;
    font-size: 0.8125rem;
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

  .field__input {
    padding: 0.4375rem 0.625rem;
    border: 1px solid var(--cfg-border, #ddd);
    border-radius: 6px;
    background: var(--cfg-surface, #fafafa);
    color: var(--cfg-text, #111);
    font-size: 0.875rem;
    max-width: 380px;
  }

  .field__input:focus {
    outline: none;
    border-color: var(--cfg-accent, oklch(0.6 0.18 250));
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--cfg-accent, oklch(0.6 0.18 250)) 20%, transparent);
  }

  .field__open {
    margin: 0.125rem 0 0;
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    flex-wrap: wrap;
    font-size: 0.8125rem;
  }
  .open-link {
    color: var(--cfg-accent, oklch(0.6 0.18 250));
    font-weight: 500;
    text-decoration: none;
  }
  .open-link:hover { text-decoration: underline; }

  .import-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .import-row .field__input {
    flex: 1 1 240px;
    max-width: none;
  }

  .import-result {
    margin: 0.125rem 0 0;
    font-size: 0.8125rem;
  }
  .import-result--ok  { color: oklch(0.52 0.13 150); }
  .import-result--err { color: oklch(0.5 0.22 25); }

  .settings-note {
    padding: 0.75rem 1rem;
    border: 1px solid var(--cfg-border, #ddd);
    border-radius: 6px;
    background: var(--cfg-surface-2, #f5f5f5);
  }
  .settings-note p {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--cfg-text-muted, #666);
  }
  .settings-note a {
    color: var(--cfg-accent, oklch(0.6 0.18 250));
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

  .btn--secondary {
    background: var(--cfg-surface, #fafafa);
    color: var(--cfg-text, #111);
    border-color: var(--cfg-border, #ddd);
    padding: 0.4375rem 0.875rem;
  }
  .btn--secondary:not(:disabled):hover {
    background: var(--cfg-surface-2, #f0f0f0);
  }

  .btn--primary:not(:disabled):hover {
    background: color-mix(in oklch, var(--cfg-accent, oklch(0.6 0.18 250)) 85%, black);
  }

  .error-msg {
    font-size: 0.85rem;
    color: oklch(0.5 0.22 25);
  }
</style>
