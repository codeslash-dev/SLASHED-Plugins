<script lang="ts">
  import { SlidersHorizontal, List } from '@lucide/svelte';
  import type { SlashedToken } from '../types';
  import { domainOf } from '../lib/domains';
  import HomePanel from './panels/HomePanel.svelte';
  import ColorsPanel from './panels/ColorsPanel.svelte';
  import TypographyPanel from './panels/TypographyPanel.svelte';
  import SpacingPanel from './panels/SpacingPanel.svelte';
  import LayoutPanel from './panels/LayoutPanel.svelte';
  import BordersPanel from './panels/BordersPanel.svelte';
  import DepthPanel from './panels/DepthPanel.svelte';
  import MotionPanel from './panels/MotionPanel.svelte';
  import MacrosPanel from './panels/MacrosPanel.svelte';
  import MiscPanel from './panels/MiscPanel.svelte';
  import ComponentsPanel from './panels/ComponentsPanel.svelte';
  import ThemesPanel from './panels/ThemesPanel.svelte';
  import ExportPanel from './panels/ExportPanel.svelte';
  import CheatsheetPanel from './panels/CheatsheetPanel.svelte';
  import ChangesPanel from './panels/ChangesPanel.svelte';
  import GenericTokenPanel from './panels/GenericTokenPanel.svelte';
  import AllTokensTab from './panels/AllTokensTab.svelte';
  import AccessibilityPanel from './panels/AccessibilityPanel.svelte';

  let { domain, tokens, overrides, focusToken = null, focusNonce = 0, onSet, onReset, onBulkChange, onApplyTheme, onSelectDomain, onResetAll }: {
    domain: string;
    tokens: SlashedToken[];
    overrides: Record<string, string>;
    /** Deep-link target token from search; opens the All-tokens list on it. */
    focusToken?: string | null;
    focusNonce?: number;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
    onBulkChange: (patch: Record<string, string | null>) => void;
    onApplyTheme: (overrides: Record<string, string>) => void;
    onSelectDomain: (d: string) => void;
    onResetAll: () => void;
  } = $props();


  // Domains that skip the two-tab treatment
  const NO_CONTROLS_TAB = new Set(["home", "changes", "themes", "setup", "cheatsheet"]);

  let view = $state<"controls" | "tokens">("controls");

  // A domain change resets to Controls — UNLESS it arrived with a fresh deep-link
  // focus request, which opens the All-tokens list on the target token. Both
  // signals are read in one effect so their order can't race.
  let lastFocusNonce = -1;
  $effect(() => {
    const _ = domain;
    const nonce = focusNonce;
    if (focusToken && nonce !== lastFocusNonce) {
      lastFocusNonce = nonce;
      view = "tokens";
    } else {
      view = "controls";
    }
  });

  // domainOf() is the single classifier shared with the sidebar badge and the
  // category Reset, so this count always agrees with them.
  let domainOverridesInTokenTab = $derived(
    tokens.filter((t) => domainOf(t.name) === domain && t.name in overrides).length
  );
</script>

{#if NO_CONTROLS_TAB.has(domain)}
  {#if domain === "home"}
    <HomePanel {overrides} onSelect={onSelectDomain} {onApplyTheme} {onResetAll} />
  {:else if domain === "changes"}
    <ChangesPanel {tokens} {overrides} {onSet} {onReset} {onBulkChange} {onResetAll} {onSelectDomain} />
  {:else if domain === "themes"}
    <ThemesPanel {overrides} {onApplyTheme} {onResetAll} />
  {:else if domain === "setup"}
    <ExportPanel {overrides} {tokens} {onApplyTheme} />
  {:else if domain === "cheatsheet"}
    <CheatsheetPanel />
  {/if}
{:else}
  <div class="flex flex-col h-full min-h-0">
    <!-- Scrollable content area -->
    <div class="flex-1 min-h-0 overflow-hidden">
      {#if view === "controls"}
        <div class="h-full overflow-y-auto">
          {#if domain === "colors"}
            <ColorsPanel {tokens} {overrides} {onSet} {onReset} {onBulkChange} {onSelectDomain} />
          {:else if domain === "typography"}
            <TypographyPanel {overrides} {onSet} {onReset} {onBulkChange} />
          {:else if domain === "spacing"}
            <SpacingPanel {tokens} {overrides} {onSet} {onReset} />
          {:else if domain === "layout"}
            <LayoutPanel {overrides} {onSet} {onReset} {onBulkChange} />
          {:else if domain === "borders"}
            <BordersPanel {overrides} {onSet} {onReset} />
          {:else if domain === "depth"}
            <DepthPanel {overrides} {onSet} {onReset} />
          {:else if domain === "motion"}
            <MotionPanel {overrides} {onSet} {onReset} />
          {:else if domain === "macros"}
            <MacrosPanel {overrides} {onSet} {onReset} />
          {:else if domain === "misc"}
            <MiscPanel {overrides} {onSet} {onReset} {onBulkChange} />
          {:else if domain === "components"}
            <ComponentsPanel {overrides} {onSet} {onReset} />
          {:else if domain === "wcag"}
            <AccessibilityPanel {tokens} {overrides} {onSet} {onReset} {onBulkChange} />
          {:else}
            <GenericTokenPanel {domain} {tokens} {overrides} {onSet} {onReset} />
          {/if}
        </div>
      {:else}
        <AllTokensTab
          {tokens}
          {overrides}
          {domain}
          {focusToken}
          {focusNonce}
          {onSet}
          {onReset}
        />
      {/if}
    </div>

    <!-- Bottom tab bar -->
    <div class="shrink-0 border-t border-black/8 dark:border-white/8 bg-slate-50 dark:bg-[#0a0a10] flex">
      <button
        onclick={() => { view = "controls"; }}
        class={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold transition-all cursor-pointer ${
          view === "controls"
            ? "text-indigo-700 dark:text-indigo-300 bg-indigo-600/10 border-t-2 border-t-indigo-500 -mt-px"
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        <SlidersHorizontal class="w-3 h-3" />
        Controls
      </button>
      <div class="w-px bg-black/8 dark:bg-white/8"></div>
      <button
        onclick={() => { view = "tokens"; }}
        class={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold transition-all cursor-pointer ${
          view === "tokens"
            ? "text-indigo-700 dark:text-indigo-300 bg-indigo-600/10 border-t-2 border-t-indigo-500 -mt-px"
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >
        <List class="w-3 h-3" />
        All tokens
        {#if domainOverridesInTokenTab > 0}
          <span class="ml-0.5 text-[8px] bg-indigo-600 text-white rounded-full px-1.5 py-0.5 leading-none font-black">
            {domainOverridesInTokenTab}
          </span>
        {/if}
      </button>
    </div>
  </div>
{/if}
