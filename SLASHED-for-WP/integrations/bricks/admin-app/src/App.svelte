<script>
  /**
   * Top-level shell: header, tab nav, current tab body, live preview, save bar.
   *
   * Owns no state of its own — everything lives in stores.svelte.js so
   * any component can read or mutate it directly. The reactive graph
   * collapses dirty-tracking + DOM querying into a single $derived for
   * the active tab body.
   */
  import { ui, meta } from './lib/stores.svelte.js';
  import TabNav from './components/TabNav.svelte';
  import ColorTab from './components/ColorTab.svelte';
  import TypographyTab from './components/TypographyTab.svelte';
  import SpacingTab from './components/SpacingTab.svelte';
  import MiscTab from './components/MiscTab.svelte';
  import VariablesTab from './components/VariablesTab.svelte';
  import ClassesTab from './components/ClassesTab.svelte';
  import BundleTab from './components/BundleTab.svelte';
  import ExportImportTab from './components/ExportImportTab.svelte';
  import HooksTab from './components/HooksTab.svelte';
  import CheatsheetTab from './components/CheatsheetTab.svelte';
  import WcagTab from './components/WcagTab.svelte';
  import LayoutsTab from './components/LayoutsTab.svelte';
  import LivePreview from './components/LivePreview.svelte';
  import SaveBar from './components/SaveBar.svelte';

  /**
   * Tabs that are inventory / documentation views with no per-section
   * save semantics. The SaveBar (and the section reset button) only
   * make sense for tabs that mutate `tokens[section]`.
   */
  const readOnlyTabs = ['cheatsheet', 'hooks', 'variables', 'classes', 'bundle', 'export', 'wcag'];
  let isReadOnly = $derived(readOnlyTabs.includes(ui.activeTab));

  // Warn before unload when the form has unsaved changes.
  $effect(() => {
    /**
     * `beforeunload` listener that triggers the browser's native
     * "Leave site? Changes you made may not be saved." prompt when
     * the form is dirty. Returning a non-empty string from a beforeunload
     * handler is the legacy way to opt into the prompt; modern browsers
     * also accept `event.preventDefault()` + a non-empty `returnValue`,
     * which is what we use here for cross-engine support.
     *
     * @param {BeforeUnloadEvent} e
     */
    function onBeforeUnload(e) {
      if (ui.dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  });
</script>

<div class="slashed-svelte-admin">
  <header class="slashed-svelte-admin__header">
    <div class="slashed-svelte-admin__header-top">
      <h1>SLASHED Design Tokens</h1>
      <div class="slashed-svelte-admin__versions">
        {#if meta.versions.framework}
          <span class="version-pill">Framework {meta.versions.framework}</span>
        {/if}
        {#if meta.versions.plugin}
          <span class="version-pill">Plugin v{meta.versions.plugin}</span>
        {/if}
      </div>
    </div>
    <p class="muted">
      Adjust framework tokens, inspect generated variables, and manage the bundled CSS in one place.
    </p>
  </header>

  <TabNav />

  <section class="slashed-svelte-admin__body">
    {#if ui.activeTab === 'colors'}
      <ColorTab />
    {:else if ui.activeTab === 'typography'}
      <TypographyTab />
    {:else if ui.activeTab === 'spacing'}
      <SpacingTab />
    {:else if ui.activeTab === 'layouts'}
      <LayoutsTab />
    {:else if ui.activeTab === 'misc'}
      <MiscTab />
    {:else if ui.activeTab === 'variables'}
      <VariablesTab />
    {:else if ui.activeTab === 'classes'}
      <ClassesTab />
    {:else if ui.activeTab === 'bundle'}
      <BundleTab />
    {:else if ui.activeTab === 'export'}
      <ExportImportTab />
    {:else if ui.activeTab === 'hooks'}
      <HooksTab />
    {:else if ui.activeTab === 'cheatsheet'}
      <CheatsheetTab />
    {:else if ui.activeTab === 'wcag'}
      <WcagTab />
    {/if}
  </section>

  <LivePreview />

  {#if !isReadOnly}
    <SaveBar />
  {/if}
</div>

<style>
  .slashed-svelte-admin {
    --gap: 16px;
    display: flex;
    flex-direction: column;
    gap: var(--gap);
    max-width: 1100px;
    padding-bottom: 80px; /* room for fixed save bar */
  }

  .slashed-svelte-admin__header-top {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .slashed-svelte-admin__header h1 {
    margin: 0;
  }

  .slashed-svelte-admin__versions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .version-pill {
    background: #f0f0f1;
    border: 1px solid #c3c4c7;
    border-radius: 3px;
    padding: 2px 8px;
    font-size: 11px;
    color: #50575e;
    font-family: ui-monospace, monospace;
    white-space: nowrap;
  }

  .muted {
    color: #50575e;
    margin: 4px 0 0;
  }

  .slashed-svelte-admin__body {
    background: white;
    border: 1px solid #c3c4c7;
    border-radius: 4px;
    padding: 20px;
  }
</style>
