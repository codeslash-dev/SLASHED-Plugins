<script lang="ts">
  import { SlidersHorizontal, List } from '@lucide/svelte';
  import type { SlashedToken } from '../types';
  import { DOMAIN_PATTERNS, domainOf } from '../lib/domains';
  import HomePanel from './panels/HomePanel.svelte';
  import ColorsPanel from './panels/ColorsPanel.svelte';
  import TypographyPanel from './panels/TypographyPanel.svelte';
  import SpacingPanel from './panels/SpacingPanel.svelte';
  import LayoutPanel from './panels/LayoutPanel.svelte';
  import BordersPanel from './panels/BordersPanel.svelte';
  import ShadowsPanel from './panels/ShadowsPanel.svelte';
  import MotionPanel from './panels/MotionPanel.svelte';
  import EffectsPanel from './panels/EffectsPanel.svelte';
  import MacrosPanel from './panels/MacrosPanel.svelte';
  import MiscPanel from './panels/MiscPanel.svelte';
  import ThemesPanel from './panels/ThemesPanel.svelte';
  import ExportPanel from './panels/ExportPanel.svelte';
  import CheatsheetPanel from './panels/CheatsheetPanel.svelte';
  import GenericTokenPanel from './panels/GenericTokenPanel.svelte';
  import AllTokensTab from './panels/AllTokensTab.svelte';
  import WcagPanel from './panels/WcagPanel.svelte';

  let { domain, tokens, overrides, onSet, onReset, onBulkChange, onApplyTheme, onSelectDomain, onResetAll }: {
    domain: string;
    tokens: SlashedToken[];
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
    onBulkChange: (patch: Record<string, string | null>) => void;
    onApplyTheme: (overrides: Record<string, string>) => void;
    onSelectDomain: (d: string) => void;
    onResetAll: () => void;
  } = $props();


  // Domains that skip the two-tab treatment
  const NO_CONTROLS_TAB = new Set(["home", "themes", "wcag", "setup", "cheatsheet"]);

  let view = $state<"controls" | "tokens">("controls");

  // Reset view to controls when domain changes
  $effect(() => {
    const _ = domain;
    view = "controls";
  });

  let patterns = $derived(DOMAIN_PATTERNS[domain] ?? [domain]);

  // Uses domainOf() rather than the raw patterns list so this badge always
  // agrees with App.svelte's "Reset N" count — matching against a single
  // domain's patterns in isolation over-counts where patterns overlap (e.g.
  // layout's "-bg-" also appears in color tokens like --sf-color-bg--active).
  let domainOverridesInTokenTab = $derived(
    tokens.filter((t) => domainOf(t.name) === domain && t.name in overrides).length
  );
</script>

{#if NO_CONTROLS_TAB.has(domain)}
  {#if domain === "home"}
    <HomePanel {overrides} onSelect={onSelectDomain} {onApplyTheme} {onResetAll} />
  {:else if domain === "themes"}
    <ThemesPanel {overrides} {onApplyTheme} {onResetAll} />
  {:else if domain === "wcag"}
    <WcagPanel {tokens} {overrides} {onSet} {onBulkChange} />
  {:else if domain === "setup"}
    <ExportPanel {overrides} />
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
            <TypographyPanel {tokens} {overrides} {onSet} {onReset} {onBulkChange} />
          {:else if domain === "spacing"}
            <SpacingPanel {tokens} {overrides} {onSet} {onReset} />
          {:else if domain === "layout"}
            <LayoutPanel {overrides} {onSet} {onReset} {onBulkChange} />
          {:else if domain === "borders"}
            <BordersPanel {overrides} {onSet} {onReset} />
          {:else if domain === "shadows"}
            <ShadowsPanel {overrides} {onSet} {onReset} />
          {:else if domain === "motion"}
            <MotionPanel {overrides} {onSet} {onReset} {onBulkChange} />
          {:else if domain === "effects"}
            <EffectsPanel {overrides} {onSet} {onReset} />
          {:else if domain === "macros"}
            <MacrosPanel {overrides} {onSet} {onReset} />
          {:else if domain === "misc"}
            <MiscPanel {overrides} {onSet} {onReset} {onBulkChange} />
          {:else}
            <GenericTokenPanel {domain} {tokens} {overrides} {onSet} {onReset} />
          {/if}
        </div>
      {:else}
        <AllTokensTab
          {tokens}
          {overrides}
          {patterns}
          {onSet}
          {onReset}
        />
      {/if}
    </div>

    <!-- Bottom tab bar -->
    <div class="shrink-0 border-t border-white/8 bg-[#0a0a10] flex">
      <button
        onclick={() => { view = "controls"; }}
        class={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold transition-all cursor-pointer ${
          view === "controls"
            ? "text-indigo-300 bg-indigo-600/10 border-t-2 border-t-indigo-500 -mt-px"
            : "text-slate-500 hover:text-slate-300"
        }`}
      >
        <SlidersHorizontal class="w-3 h-3" />
        Controls
      </button>
      <div class="w-px bg-white/8"></div>
      <button
        onclick={() => { view = "tokens"; }}
        class={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-bold transition-all cursor-pointer ${
          view === "tokens"
            ? "text-indigo-300 bg-indigo-600/10 border-t-2 border-t-indigo-500 -mt-px"
            : "text-slate-500 hover:text-slate-300"
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
