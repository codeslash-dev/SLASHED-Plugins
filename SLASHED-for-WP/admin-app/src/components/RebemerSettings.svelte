<script>
  /**
   * reBEMer default-naming settings (WP-specific).
   *
   * Lets the user override the built-in Bricks-type → BEM-name map that
   * reBEMer uses to pre-fill the in-builder panel, and choose how layout
   * containers are named by default. Persists via the shared /settings
   * REST endpoint (savePluginSettings) — the same option the Bricks editor
   * reads back through window.slashedBricksEditor.
   *
   * The built-in defaults are imported straight from the editor app's
   * element-types.js so there is a single source of truth; this tab only
   * ever stores a *sparse* override map (entries the user actually
   * changed), which the editor merges over the same built-ins at runtime.
   */
  import { wpSettings } from '../lib/store.svelte.js';
  import { savePluginSettings } from '../lib/wp-api.js';
  import { ELEMENT_TYPE_LABEL_MAP, LAYOUT_CONTAINER_TYPES } from '../../../integrations/bricks/editor-app/src/lib/element-types.js';
  import { slugify } from '../../../integrations/bricks/editor-app/src/lib/slugify.js';

  // Mirror the BEM grammar the editor + PHP enforce (validate.js).
  const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  const RESERVED = new Set([
    'auto', 'inherit', 'initial', 'unset', 'revert', 'revert-layer', 'none',
  ]);

  /**
   * Every editable element row: { type, label, def }.
   *
   * Sourced from Bricks' full server-side registry (window.slashedApp
   * .bricksElements, name → human label) so plugin / custom elements are
   * covered, unioned with reBEMer's built-in map so nothing the editor
   * knows about disappears when Bricks data is unavailable. Layout
   * containers are excluded — their naming is governed by the container
   * mode above, not the type map. Per-row default: the built-in BEM label
   * if any, else the slugified Bricks label, else 'item'.
   */
  const bricksElements = (typeof window !== 'undefined' && window.slashedApp?.bricksElements) || {};
  const defaults = (() => {
    const names = new Set([...Object.keys(bricksElements), ...Object.keys(ELEMENT_TYPE_LABEL_MAP)]);
    const rows = [];
    for (const type of names) {
      if (LAYOUT_CONTAINER_TYPES.has(type)) continue;
      const label = bricksElements[type] || '';
      const builtin = ELEMENT_TYPE_LABEL_MAP[type] || '';
      const fromLabel = slugify(label);
      const def = builtin || (NAME_RE.test(fromLabel) ? fromLabel : '') || 'item';
      rows.push({ type, label, def });
    }
    return rows.sort((a, b) => a.type.localeCompare(b.type));
  })();

  // wpSettings.rebemer_element_map is {} normally, but PHP serialises an
  // empty associative array as [] — spreading either yields a plain object.
  const savedMap = wpSettings.rebemer_element_map || {};

  const CONTAINER_MODES = ['type', 'role', 'generic'];

  /** Sparse override map: bricksType → bemName (only entries that differ). */
  let overrides = $state({ ...savedMap });
  let containerMode = $state(
    CONTAINER_MODES.includes(wpSettings.rebemer_container_mode)
      ? wpSettings.rebemer_container_mode
      : 'type',
  );

  let status = $state(/** @type {'idle'|'saving'|'saved'|'error'} */('idle'));
  let errorMsg = $state('');

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

  const invalidCount = $derived(Object.values(overrides).filter(isInvalid).length);
  const overrideCount = $derived(Object.keys(overrides).length);

  async function save() {
    if (invalidCount > 0) {
      status = 'error';
      errorMsg = 'Fix invalid names first (lowercase letters, digits, hyphens).';
      return;
    }
    status = 'saving';
    errorMsg = '';
    try {
      const res = await savePluginSettings({
        rebemer_element_map: overrides,
        rebemer_container_mode: containerMode,
      });
      // Reflect the server-sanitised result so dropped/normalised entries show.
      if (res && typeof res === 'object') {
        if (res.rebemer_element_map && typeof res.rebemer_element_map === 'object') {
          overrides = { ...res.rebemer_element_map };
        }
        if (res.rebemer_container_mode) containerMode = res.rebemer_container_mode;
      }
      wpSettings.rebemer_element_map = { ...overrides };
      wpSettings.rebemer_container_mode = containerMode;
      status = 'saved';
      setTimeout(() => { if (status === 'saved') status = 'idle'; }, 2500);
    } catch (e) {
      status = 'error';
      errorMsg = e?.message ?? 'Save failed';
    }
  }

  function resetAll() {
    overrides = {};
    containerMode = 'type';
  }
</script>

<section class="rebemer">
  <h2 class="rebemer__title">reBEMer default names</h2>
  <p class="rebemer__hint">
    reBEMer pre-fills the in-builder panel with a BEM name for each element.
    Names you set on an element in Bricks always win — these defaults only seed
    unnamed elements. Leave a field at its default to keep the built-in
    suggestion; only your changes are saved.
  </p>

  <div class="field">
    <label class="field__label" for="rebemer-container-mode">Layout container naming</label>
    <p class="field__hint">
      How <code>section</code> / <code>container</code> / <code>div</code> /
      <code>block</code> elements are named. Element type uses the container's
      own type (most predictable); role mode infers a name from a container's
      children; generic names every container <code>item</code> and lets
      auto-numbering disambiguate.
    </p>
    <select id="rebemer-container-mode" class="field__input" bind:value={containerMode}>
      <option value="type">Element type (container, section, div…)</option>
      <option value="role">Smart role names (header, body, content, actions…)</option>
      <option value="generic">Generic (item, item-2…)</option>
    </select>
  </div>

  <p class="field__hint">Showing {defaults.length} elements registered in Bricks (including those added by plugins or custom code).</p>

  <div class="rebemer__table" role="table" aria-label="Element type to BEM name map">
    <div class="rebemer__row rebemer__row--head" role="row">
      <span role="columnheader">Bricks element type</span>
      <span role="columnheader">BEM name</span>
    </div>
    {#each defaults as { type, label, def } (type)}
      <div class="rebemer__row" role="row">
        <span role="cell">
          <code class="rebemer__type">{type}</code>
          {#if label}<span class="rebemer__label">{label}</span>{/if}
        </span>
        <span class="rebemer__inputcell" role="cell">
          <input
            class="field__input rebemer__input"
            class:invalid={isInvalid(effective(type, def))}
            type="text"
            value={effective(type, def)}
            placeholder={def}
            aria-label={`BEM name for ${type}`}
            oninput={(e) => onInput(type, def, e.currentTarget.value)}
          />
          {#if effective(type, def) !== def}
            <button
              type="button"
              class="rebemer__revert"
              title="Reset to default"
              aria-label={`Reset ${type} to default (${def})`}
              onclick={() => onInput(type, def, def)}
            >↺</button>
          {/if}
        </span>
      </div>
    {/each}
  </div>

  <div class="rebemer__actions">
    <button type="button" class="btn" onclick={resetAll} disabled={status === 'saving'}>Reset all</button>
    <button
      type="button"
      class="btn btn--primary"
      onclick={save}
      disabled={status === 'saving' || invalidCount > 0}
    >
      {status === 'saving' ? 'Saving…' : status === 'saved' ? '✓ Saved' : 'Save changes'}
    </button>
    {#if status === 'error'}
      <span class="error-msg">{errorMsg}</span>
    {:else if overrideCount > 0}
      <span class="rebemer__count">{overrideCount} override{overrideCount === 1 ? '' : 's'}</span>
    {/if}
  </div>
</section>

<style>
  .rebemer {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--cfg-border, #ddd);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .rebemer__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--cfg-text, #111);
  }
  .rebemer__hint,
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
  }
  .field__input:focus {
    outline: none;
    border-color: var(--cfg-accent, oklch(0.6 0.18 250));
    box-shadow: 0 0 0 2px color-mix(in oklch, var(--cfg-accent, oklch(0.6 0.18 250)) 20%, transparent);
  }

  .rebemer__table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--cfg-border, #ddd);
    border-radius: 6px;
    overflow: hidden;
  }
  .rebemer__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 0.75rem;
    padding: 0.3125rem 0.75rem;
    border-top: 1px solid var(--cfg-border, #eee);
  }
  .rebemer__row:first-child { border-top: none; }
  .rebemer__row--head {
    background: var(--cfg-surface-2, #f5f5f5);
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--cfg-text-muted, #666);
  }
  .rebemer__type {
    font-family: ui-monospace, monospace;
    font-size: 0.8125rem;
    color: var(--cfg-text, #111);
  }
  .rebemer__label {
    display: block;
    font-size: 0.6875rem;
    color: var(--cfg-text-muted, #666);
  }
  .rebemer__inputcell {
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }
  .rebemer__input {
    width: 100%;
    font-family: ui-monospace, monospace;
  }
  .rebemer__input.invalid {
    border-color: oklch(0.55 0.2 25);
    box-shadow: 0 0 0 1px oklch(0.55 0.2 25);
  }
  .rebemer__revert {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.95rem;
    line-height: 1;
    color: var(--cfg-accent, oklch(0.6 0.18 250));
    padding: 2px 4px;
  }

  .rebemer__actions {
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
    border: 1px solid var(--cfg-border, #ddd);
    background: var(--cfg-surface, #fafafa);
    color: var(--cfg-text, #111);
    transition: background 0.15s, opacity 0.15s;
  }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn--primary {
    background: var(--cfg-accent, oklch(0.6 0.18 250));
    color: #fff;
    border-color: transparent;
  }
  .btn--primary:not(:disabled):hover {
    background: color-mix(in oklch, var(--cfg-accent, oklch(0.6 0.18 250)) 85%, black);
  }
  .error-msg {
    font-size: 0.85rem;
    color: oklch(0.5 0.22 25);
  }
  .rebemer__count {
    font-size: 0.8125rem;
    color: var(--cfg-text-muted, #666);
  }
</style>
