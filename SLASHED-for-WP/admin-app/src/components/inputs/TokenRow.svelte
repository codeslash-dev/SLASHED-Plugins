<script lang="ts">
  import type { SlashedToken } from '../../types';
  import { resolveColor, previewVersion } from '../../lib/previewResolver.svelte';
  import { scaleForValue } from '../../lib/variableScales';

  let { token, overrideValue, onSet, onReset }: {
    token: SlashedToken;
    overrideValue?: string;
    onSet: (value: string) => void;
    onReset: () => void;
  } = $props();

  const CUSTOM = "__sf_custom__";
  let expanded = $state(false);

  // When a token's default is itself a scale variable (e.g. var(--sf-space-m)),
  // offer that scale's steps as a dropdown — variable-first, with the raw text
  // box available via "Custom…". Mirrors SliderRow's picker for the generic row.
  let scaleOpts = $derived(scaleForValue(token.value));
  let matchedScale = $derived(
    !!scaleOpts && (scaleOpts.some((o) => o.value === (overrideValue ?? token.value)))
  );
  let showScalePicker = $derived(
    !!scaleOpts && !expanded && (overrideValue === undefined || matchedScale)
  );

  function guessType(t: SlashedToken): "color" | "font" | "number" | "text" {
    const n = t.name;
    if (n.includes("color") || n.includes("source") || n.includes("-bg") || n.includes("-border")) return "color";
    if (n.includes("font") || n.includes("family")) return "font";
    const syntax = t.syntax?.toLowerCase() ?? "";
    if (syntax.includes("number") || syntax.includes("length") || syntax.includes("integer")) return "number";
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
    <div class="text-[10px] font-mono text-slate-700 dark:text-slate-300 truncate flex-1" title={token.name}>
      {shortName}
    </div>
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

  <div class="mt-1 pl-3.5">
    {#if showScalePicker && scaleOpts}
      <select
        value={displayValue}
        aria-label={`${shortName} value`}
        onchange={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          if (v === CUSTOM) { expanded = true; return; }
          if (v === token.value) onReset(); else onSet(v);
        }}
        class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[10px] font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
      >
        {#if !scaleOpts.some((o) => o.value === token.value)}
          <option value={token.value}>{token.value} (default)</option>
        {/if}
        {#each scaleOpts as o (o.value)}
          <option value={o.value}>{o.label}</option>
        {/each}
        <option value={CUSTOM}>Custom…</option>
      </select>
    {:else if expanded}
      <input
        value={displayValue}
        onblur={(e) => {
          const v = (e.target as HTMLInputElement).value.trim();
          if (v && v !== token.value) onSet(v);
          else if (!v || v === token.value) onReset();
          expanded = false;
        }}
        onkeydown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          if (e.key === "Escape") { expanded = false; }
        }}
        class="w-full bg-black/8 dark:bg-white/8 border border-indigo-500/50 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
      />
    {:else}
      <button
        onclick={() => { expanded = true; }}
        class="w-full text-left text-[10px] font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 truncate cursor-pointer transition-colors"
        title={displayValue}
      >
        {#if isOverridden}
          <span class="text-indigo-700 dark:text-indigo-300">{displayValue}</span>
        {:else}
          {displayValue}
        {/if}
      </button>
    {/if}
  </div>
</div>
