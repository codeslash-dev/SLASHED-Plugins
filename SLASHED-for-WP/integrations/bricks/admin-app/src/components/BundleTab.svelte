<script>
  import { meta } from '../lib/stores.svelte.js';
  import { saveSettings } from '../lib/api.js';

  const BUNDLE_LABELS = {
    essential: 'Essential',
    optimal:   'Optimal',
    full:      'Full',
  };

  let fontSize        = $state(meta.pluginSettings?.html_font_size ?? '');
  let showClassHints  = $state(meta.pluginSettings?.show_class_hints ?? false);
  let saving = $state(false);
  let saved = $state(false);
  let error = $state('');
  let savedTimer = null;

  const bricksActive = $derived(meta.activeIntegrations?.bricks ?? true);
  const activeBundle = $derived(meta.pluginSettings?.css_bundle ?? 'optimal');
  const settingsUrl  = meta.settingsUrl || '';

  async function handleSave() {
    saving = true;
    saved = false;
    error = '';
    try {
      await saveSettings({ html_font_size: fontSize, show_class_hints: showClassHints });
      saved = true;
      if (savedTimer) clearTimeout(savedTimer);
      savedTimer = setTimeout(() => { saved = false; savedTimer = null; }, 3000);
    } catch (e) {
      error = e.message || 'Save failed';
    } finally {
      saving = false;
    }
  }
</script>

<section>
  <h2>Bundle Info</h2>
  <p class="hint">
    The SLASHED CSS bundle is loaded automatically on the frontend and in the block editor canvas.
    The inventory is parsed from whichever bundle is active and drives the variable pickers,
    class autocomplete, and color palette in any active builder integration.
  </p>
  <dl class="info">
    <dt>Active bundle</dt>
    <dd>
      {BUNDLE_LABELS[activeBundle] ?? activeBundle}
      {#if settingsUrl}
        — <a href={settingsUrl}>change in SLASHED Settings →</a>
      {/if}
    </dd>
    <dt>Variables registered</dt>
    <dd>{meta.inventory?.variables?.length ?? 0}</dd>
    <dt>Classes registered</dt>
    <dd>{(meta.inventory?.sf_classes?.length ?? 0) + (meta.inventory?.is_classes?.length ?? 0)}</dd>
  </dl>

  <h2 class="settings-heading">Plugin Settings</h2>

  <div class="setting-row">
    <label for="html-font-size">HTML Font Size</label>
    <select id="html-font-size" bind:value={fontSize}>
      <option value="">Default (don't override)</option>
      <option value="100">Force 100%</option>
      <option value="62.5">Force 62.5%</option>
    </select>
    <p class="description">
      Override the HTML root font-size. Use this when your theme or builder forces a root font-size
      that conflicts with rem-based framework values.
    </p>
  </div>

  {#if bricksActive}
    <div class="field-row">
      <label class="toggle-label" for="show-class-hints">
        <input
          id="show-class-hints"
          type="checkbox"
          bind:checked={showClassHints}
        />
        Show class hints in Bricks editor
        <span class="badge badge--bricks">Bricks</span>
      </label>
      <p class="description">
        When enabled, hovering a SLASHED class in the Bricks class manager shows a short
        description of what it does. Powered by <code>data/classes-hints.json</code>.
      </p>
    </div>
  {:else}
    <div class="field-row field-row--muted">
      <span class="muted-label">Show class hints in Bricks editor <span class="badge badge--bricks">Bricks</span></span>
      <p class="description">Enable the Bricks integration in SLASHED Settings to use this feature.</p>
    </div>
  {/if}

  <div class="save-row">
    <button
      type="button"
      class="save-btn"
      onclick={handleSave}
      disabled={saving}
    >
      {saving ? 'Saving...' : 'Save Settings'}
    </button>
    {#if saved}
      <span class="status status--ok">Saved</span>
    {/if}
    {#if error}
      <span class="status status--err">{error}</span>
    {/if}
  </div>
</section>

<style>
  h2 { margin-top: 0; }
  .settings-heading { margin-top: 24px; }
  .hint { color: #50575e; margin-bottom: 16px; max-width: 720px; }

  .info {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 16px;
    margin-bottom: 24px;
    font-size: 14px;
  }
  .info dt { font-weight: 500; }
  .info dd { margin: 0; color: #50575e; }

  .setting-row {
    margin-bottom: 20px;
  }
  .setting-row label {
    display: block;
    font-weight: 500;
    margin-bottom: 6px;
  }
  .setting-row select {
    padding: 6px 10px;
    border: 1px solid #8c8f94;
    border-radius: 4px;
    font-size: 14px;
  }
  .description {
    color: #50575e;
    font-size: 13px;
    margin-top: 6px;
  }

  .field-row {
    margin-bottom: 20px;
  }
  .field-row--muted {
    opacity: 0.55;
  }
  .toggle-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
    cursor: pointer;
  }
  .muted-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 500;
  }

  .badge {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 7px;
    border-radius: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .badge--bricks {
    background: #f0f4ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }

  .save-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
  }
  .save-btn {
    background: #2271b1;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
  }
  .save-btn:hover { background: #135e96; }
  .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

  .status {
    font-size: 13px;
    font-weight: 500;
  }
  .status--ok { color: #00a32a; }
  .status--err { color: #d63638; }

  code { background: #f0f0f1; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
</style>
