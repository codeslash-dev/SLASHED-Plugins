<script lang="ts">
  import type { SlashedToken } from '../../types';
  import { resolveColor, previewVersion } from '../../lib/previewResolver.svelte';
  import { scaleForValue } from '../../lib/variableScales';
  import { roleOf, aliasTargetOf, tokenState, ROLE_LABEL, type TokenRole, type TokenState } from '../../lib/tokenModel';
  import ValueField from './ValueField.svelte';

  let { token, overrideValue, onSet, onReset, dependentsCount = 0 }: {
    token: SlashedToken;
    overrideValue?: string;
    onSet: (value: string) => void;
    onReset: () => void;
    /** How many other tokens reference this one (from the dependency graph). */
    dependentsCount?: number;
  } = $props();

  // --- Token model: role, alias target and override state -------------------
  // These make the row honest about *what kind of token* is being edited and
  // whether the current override quietly disconnects it from the system that
  // produces it (a generated output/alias/scale step). See lib/tokenModel.ts.
  let role = $derived<TokenRole>(roleOf(token));
  let aliasTarget = $derived(aliasTargetOf(token));
  let overrideState = $derived<TokenState>(
    overrideValue === undefined ? "default" : tokenState(token, { [token.name]: overrideValue })
  );
  const ROLE_STYLE: Record<TokenRole, string> = {
    source: "text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/8",
    alias:  "text-sky-700 dark:text-sky-300 bg-sky-500/10",
    output: "text-violet-700 dark:text-violet-300 bg-violet-500/10",
  };
  let aliasShort = $derived(aliasTarget ? aliasTarget.replace("--sf-", "") : "");

  // When a token's default is itself a scale variable (e.g. var(--sf-space-m)),
  // offer that scale's steps as quick "relink" targets in the value editor.
  let scaleOpts = $derived(scaleForValue(token.value) ?? []);

  function guessType(t: SlashedToken): "color" | "font" | "number" | "text" {
    const n = t.name;
    const syntax = t.syntax?.toLowerCase() ?? "";

    // Prefer the generated syntax metadata — it is authoritative and avoids the
    // name-substring guessing that used to misfire (border shorthands / length
    // scales / background shorthands wrongly getting a color picker).
    if (syntax.includes("<color>")) return "color";
    if (syntax.includes("number") || syntax.includes("length") || syntax.includes("integer") || syntax.includes("percentage")) return "number";

    // Name-based fallback for tokens without a registered syntax. Deliberately
    // narrow so compound / shorthand tokens are never treated as colors:
    //   • border shorthands (--sf-border, --sf-icon-box-border) and border-width
    //     length scales (--sf-border-width-*) must NOT get a color picker;
    //   • background shorthand parts (--sf-surface-bg-*, --sf-bg-layer-*) likewise.
    // Genuine border/bg colors either live under the --sf-color-* namespace
    // (matched by "color") or are single-value bg tokens ending in "-bg"
    // (e.g. --sf-card-bg, --sf-icon-box-bg).
    if (n.includes("color")) return "color";
    if (n.endsWith("-bg")) return "color";
    if (n.includes("font") || n.includes("family")) return "font";
    return "text";
  }

  let displayValue = $derived(overrideValue ?? token.value);
  let isOverridden = $derived(overrideValue !== undefined);
  let type = $derived(guessType(token));
  let shortName = $derived(token.name.replace("--sf-", ""));

  function paintSwatch(expr: string): string {
    void previewVersion.value;
    return resolveColor(expr) || resolveColor(`var(${token.name})`) || expr;
  }
  // Only subscribe to previewVersion for color tokens to avoid unnecessary recomputation.
  let swatchColor = $derived(type === "color" ? paintSwatch(displayValue) : "");
</script>

<!-- Stacked layout — name, description, then a full-width value control, so
     long values (clamp()/var() expressions) are never clipped by a narrow
     right-aligned field. -->
<div class={`px-3 py-2 rounded-lg transition-colors group ${isOverridden ? "bg-indigo-500/8 border border-indigo-500/15" : "hover:bg-black/4 dark:hover:bg-white/4"}`}>
  <div class="flex items-center gap-2">
    <div class={`w-1.5 h-1.5 rounded-full shrink-0 ${isOverridden ? "bg-indigo-500" : "bg-black/15 dark:bg-white/15"}`}></div>
    {#if type === "color"}
      <div
        class="w-4 h-4 rounded-sm border border-black/10 dark:border-white/10 shrink-0"
        style:background={swatchColor}
      ></div>
    {/if}
    <div class="text-[10px] font-mono text-slate-700 dark:text-slate-300 truncate min-w-0 flex-1" title={token.name}>
      {shortName}
    </div>
    <!-- Role badge: source (settable) · alias (re-export) · output (generated).
         Makes it obvious when you're about to edit something the system derives
         rather than a knob you own. -->
    <span
      class={`shrink-0 px-1 py-px rounded text-[7px] font-bold uppercase tracking-wider ${ROLE_STYLE[role]}`}
      title={role === "source"
        ? "Source — a value you set"
        : role === "alias"
          ? `Alias — re-exports ${aliasShort}`
          : "Output — generated from other tokens"}
    >
      {ROLE_LABEL[role]}
    </span>
    {#if isOverridden}
      <button
        onclick={onReset}
        aria-label={`Reset ${shortName}`}
        class="text-[9px] text-slate-400 dark:text-slate-600 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer shrink-0"
      >
        reset
      </button>
    {/if}
  </div>

  {#if token.description}
    <div class="text-[9px] text-slate-400 dark:text-slate-600 leading-snug mt-0.5 pl-3.5">{token.description}</div>
  {/if}

  <!-- Relationship context: where this token inherits from, and what depends on
       it. Turns the flat list into a navigable graph the audit found missing. -->
  {#if aliasTarget || dependentsCount > 0}
    <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 pl-3.5 text-[8px] text-slate-400 dark:text-slate-600">
      {#if aliasTarget}
        <span class="font-mono">↳ inherits <span class="text-sky-600 dark:text-sky-400">{aliasShort}</span></span>
      {/if}
      {#if dependentsCount > 0}
        <span title={`${dependentsCount} token${dependentsCount !== 1 ? "s" : ""} reference this token in the framework defaults`}>
          used by {dependentsCount} default{dependentsCount !== 1 ? "s" : ""}
        </span>
      {/if}
    </div>
  {/if}

  <!-- Detached / invalid warning: only when the override actually disconnects
       the token from its generator, or fails validation. -->
  {#if overrideState === "detached"}
    <div class="flex items-start gap-1 mt-1 ml-3.5 px-1.5 py-1 rounded bg-amber-500/10 text-[8px] text-amber-700 dark:text-amber-300 leading-snug">
      <span class="font-bold shrink-0">Detached</span>
      <span>
        {role === "alias"
          ? `frozen — no longer follows ${aliasShort}.`
          : role === "output"
            ? "frozen — no longer derived from its source tokens."
            : "a generated scale step is pinned; its source knob won't move it."}
        <button onclick={onReset} class="underline hover:text-amber-900 dark:hover:text-amber-100 cursor-pointer">Restore link</button>
      </span>
    </div>
  {:else if overrideState === "invalid"}
    <div class="flex items-start gap-1 mt-1 ml-3.5 px-1.5 py-1 rounded bg-rose-500/10 text-[8px] text-rose-700 dark:text-rose-300 leading-snug">
      <span class="font-bold shrink-0">Invalid</span>
      <span>
        this value can't be applied safely.
        <button onclick={onReset} class="underline hover:text-rose-900 dark:hover:text-rose-100 cursor-pointer">Reset</button>
      </span>
    </div>
  {/if}

  <!-- Unified value editor: explicit Inherit / Value / Expression modes. An
       expression override is always shown verbatim (never parsed to a fallback
       number), and switching to a fixed value is a deliberate tab click. -->
  <div class="mt-1 pl-3.5">
    <ValueField {token} {overrideValue} {onSet} {onReset} scaleOptions={scaleOpts} />
  </div>
</div>
