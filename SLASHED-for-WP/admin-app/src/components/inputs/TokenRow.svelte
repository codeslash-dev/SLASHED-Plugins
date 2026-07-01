<script lang="ts">
  import type { SlashedToken } from '../../types';
  import { resolveColor, previewVersion } from '../../lib/previewResolver.svelte';

  let { token, overrideValue, onSet, onReset }: {
    token: SlashedToken;
    overrideValue?: string;
    onSet: (value: string) => void;
    onReset: () => void;
  } = $props();

  let expanded = $state(false);

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

<div class={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors group ${isOverridden ? "bg-indigo-500/8 border border-indigo-500/15" : "hover:bg-white/4"}`}>
  <div class={`w-1.5 h-1.5 rounded-full shrink-0 ${isOverridden ? "bg-indigo-500" : "bg-transparent"}`}></div>

  {#if type === "color"}
    <div
      class="w-4 h-4 rounded-sm border border-white/10 shrink-0"
      style:background={swatchColor}
    ></div>
  {:else}
    <div class="w-4 h-4 shrink-0"></div>
  {/if}

  <div class="flex-1 min-w-0">
    <div class="text-[10px] font-mono text-slate-400 truncate" title={token.name}>
      {shortName}
    </div>
    {#if token.description}
      <div class="text-[9px] text-slate-600 truncate">{token.description}</div>
    {/if}
  </div>

  {#if expanded}
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
      class="w-28 bg-white/8 border border-indigo-500/50 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-200 focus:outline-none text-right"
    />
  {:else}
    <button
      onclick={() => { expanded = true; }}
      class="text-[10px] font-mono text-slate-500 hover:text-slate-200 truncate max-w-28 text-right cursor-pointer transition-colors"
      title={displayValue}
    >
      {#if isOverridden}
        <span class="text-indigo-300">{displayValue}</span>
      {:else}
        {displayValue}
      {/if}
    </button>
  {/if}

  {#if isOverridden}
    <button
      onclick={onReset}
      class="text-[9px] text-slate-600 hover:text-rose-400 transition-colors cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus:opacity-100 shrink-0"
    >
      ✕
    </button>
  {/if}
</div>
