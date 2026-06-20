<script>
  /**
   * reBEMer default-naming settings.
   *
   * Lets the user override the built-in Bricks-type → BEM-name map that
   * reBEMer uses to pre-fill the in-builder panel, and choose how layout
   * containers are named by default. Self-saving (POST /settings via
   * `saveSettings`) — the global SaveBar is hidden for this tab because it
   * writes plugin settings, not token sections.
   *
   * The built-in defaults are imported straight from the editor app's
   * `element-types.js` so there's a single source of truth: this tab only
   * ever persists a *sparse* override map (entries the user actually
   * changed), which the editor merges over the same built-ins at runtime.
   */
  import { meta } from '../lib/stores.svelte.js';
  import { saveSettings } from '../lib/api.js';
  import { ELEMENT_TYPE_LABEL_MAP } from '../../../editor-app/src/lib/element-types.js';

  // Built-in [bricksType, defaultName] pairs, alphabetised for scanning.
  const defaults = Object.entries(ELEMENT_TYPE_LABEL_MAP).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  // Mirror the BEM grammar the editor + PHP enforce (validate.js).
  const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  const RESERVED = new Set([
    'auto', 'inherit', 'initial', 'unset', 'revert', 'revert-layer', 'none',
  ]);

  const savedMap = (meta.pluginSettings && meta.pluginSettings.rebemer_element_map) || {};

  const CONTAINER_MODES = ['type', 'role', 'generic'];

  /** Sparse override map: bricksType → bemName (only entries that differ). */
  let overrides = $state({ ...savedMap });
  let containerMode = $state(
    CONTAINER_MODES.includes(meta.pluginSettings?.rebemer_container_mode)
      ? meta.pluginSettings.rebemer_container_mode
      : 'type',
  );

  let saving = $state(false);
  let status = $state('');
  let error = $state('');

  function effective(type, def) {
    return Object.prototype.hasOwnProperty.call(overrides, type) ? overrides[type] : def;
  }

  function isInvalid(name) {
    return !!name && (!NAME_RE.test(name) || RESERVED.has(name));
  }

  /** Update the sparse map: blank or back-to-default clears the override. */
  function onInput(type, def, raw) {
    const v = String(raw).trim().toLowerCase();
    const next = { ...overrides };
    if (v === '' || v === def) {
      delete next[type];
    } else {
      next[type] = v;
    }
    overrides = next;
  }

  const invalidCount = $derived(
    Object.values(overrides).filter(isInvalid).length,
  );
  const overrideCount = $derived(Object.keys(overrides).length);

  async function save() {
    if (invalidCount > 0) {
      error = 'Fix invalid names before saving (lowercase letters, digits, hyphens).';
      return;
    }
    saving = true;
    error = '';
    status = '';
    try {
      const res = await saveSettings({
        rebemer_element_map: overrides,
        rebemer_container_mode: containerMode,
      });
      // Reflect the server-sanitised result so dropped/normalised entries show.
      if (res && typeof res === 'object' && !res.dev) {
        if (res.rebemer_element_map && typeof res.rebemer_element_map === 'object') {
          overrides = { ...res.rebemer_element_map };
        }
        if (res.rebemer_container_mode) containerMode = res.rebemer_container_mode;
        meta.pluginSettings.rebemer_element_map = { ...overrides };
        meta.pluginSettings.rebemer_container_mode = containerMode;
      }
      status = 'Saved. New defaults apply next time you open the reBEMer panel.';
    } catch (e) {
      error = (e && e.message) || 'Save failed.';
    } finally {
      saving = false;
    }
  }

  function resetAll() {
    overrides = {};
    containerMode = 'type';
    status = 'Cleared — save to apply.';
    error = '';
  }
</script>

<div class="rebemer-tab">
  <header class="rebemer-tab__intro">
    <h2>reBEMer default names</h2>
    <p class="muted">
      reBEMer pre-fills the in-builder panel with a BEM name for each element.
      Names you set on an element in Bricks always win; these defaults only
      seed unnamed elements. Leave a field at its default to use the built-in
      suggestion — only your changes are saved.
    </p>
  </header>

  <section class="rebemer-tab__group">
    <label class="rebemer-tab__mode">
      <span class="rebemer-tab__mode-label">Layout containers (section / container / div / block)</span>
      <select bind:value={containerMode}>
        <option value="type">Element type (container, section, div…)</option>
        <option value="role">Smart role names (header, body, content, actions…)</option>
        <option value="generic">Generic (item, item-2…)</option>
      </select>
    </label>
    <p class="muted small">
      Element-type mode names each container after its own Bricks type; role
      mode infers a name from a container's children; generic mode names every
      container <code>item</code> and lets auto-numbering disambiguate.
    </p>
  </section>

  <section class="rebemer-tab__group">
    <div class="rebemer-tab__table" role="table" aria-label="Element type to BEM name map">
      <div class="rebemer-tab__row rebemer-tab__row--head" role="row">
        <span role="columnheader">Bricks element type</span>
        <span role="columnheader">BEM name</span>
      </div>
      {#each defaults as [type, def] (type)}
        <div class="rebemer-tab__row" role="row">
          <span role="cell"><code class="rebemer-tab__type">{type}</code></span>
          <span class="rebemer-tab__input" role="cell">
            <input
              type="text"
              value={effective(type, def)}
              placeholder={def}
              aria-label={`BEM name for ${type}`}
              class:invalid={isInvalid(effective(type, def))}
              oninput={(e) => onInput(type, def, e.currentTarget.value)}
            />
            {#if effective(type, def) !== def}
              <button
                type="button"
                class="rebemer-tab__revert"
                title="Reset to default"
                aria-label={`Reset ${type} to default (${def})`}
                onclick={() => onInput(type, def, def)}
              >↺</button>
            {/if}
          </span>
        </div>
      {/each}
    </div>
  </section>

  <footer class="rebemer-tab__footer">
    <div class="rebemer-tab__status" aria-live="polite">
      {#if error}
        <span class="rebemer-tab__msg rebemer-tab__msg--error">{error}</span>
      {:else if status}
        <span class="rebemer-tab__msg rebemer-tab__msg--ok">{status}</span>
      {:else if overrideCount > 0}
        <span class="muted small">{overrideCount} override{overrideCount === 1 ? '' : 's'}</span>
      {/if}
    </div>
    <div class="rebemer-tab__actions">
      <button type="button" class="button" onclick={resetAll} disabled={saving}>Reset all</button>
      <button type="button" class="button button-primary" onclick={save} disabled={saving || invalidCount > 0}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  </footer>
</div>

<style>
  .rebemer-tab__intro h2 { margin: 0 0 4px; }
  .muted { color: #50575e; }
  .small { font-size: 12px; }
  .rebemer-tab__group { margin-top: 18px; }

  .rebemer-tab__mode {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 520px;
  }
  .rebemer-tab__mode-label { font-weight: 600; }
  .rebemer-tab__mode select { max-width: 100%; }

  .rebemer-tab__table {
    display: flex;
    flex-direction: column;
    border: 1px solid #dcdcde;
    border-radius: 5px;
    overflow: hidden;
    max-width: 520px;
  }
  .rebemer-tab__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 12px;
    padding: 6px 12px;
    border-top: 1px solid #f0f0f1;
  }
  .rebemer-tab__row:first-child { border-top: none; }
  .rebemer-tab__row--head {
    background: #f6f7f7;
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: #50575e;
  }
  .rebemer-tab__type {
    font-family: ui-monospace, monospace;
    font-size: 12px;
    color: #1d2327;
  }
  .rebemer-tab__input {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .rebemer-tab__input input {
    width: 100%;
    font-family: ui-monospace, monospace;
  }
  .rebemer-tab__input input.invalid {
    border-color: #d63638;
    box-shadow: 0 0 0 1px #d63638;
  }
  .rebemer-tab__revert {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
    color: #2271b1;
    padding: 2px 4px;
  }

  .rebemer-tab__footer {
    margin-top: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .rebemer-tab__actions { display: flex; gap: 8px; }
  .rebemer-tab__msg--error { color: #d63638; }
  .rebemer-tab__msg--ok { color: #2271b1; }
</style>
