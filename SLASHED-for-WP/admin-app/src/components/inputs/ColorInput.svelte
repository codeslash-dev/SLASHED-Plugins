<script lang="ts">
  import { tick } from 'svelte';
  import { resolveColor, previewVersion } from '../../lib/previewResolver.svelte';
  import { colorSpaceOf, normalizeColorInput, previewHex, type ColorSpace } from '../../lib/colorConvert';

  let {
    token,
    value,
    placeholder,
    isOverridden,
    onSet,
    onReset,
  }: {
    token: string;
    value: string;
    placeholder?: string;
    isOverridden: boolean;
    onSet: (v: string) => void;
    onReset: () => void;
  } = $props();

  let editing = $state(false);
  let cancelBlur = $state(false);
  let editInput = $state<HTMLInputElement | null>(null);

  $effect(() => {
    if (editing) {
      tick().then(() => editInput?.focus());
    }
  });

  // Bare "--token" is a UI shorthand; normalize to "var(--token)" before resolving or storing.
  function normalize(v: string): string {
    const t = v.trim();
    return t.startsWith("--") && !t.startsWith("var(") ? `var(${t})` : t;
  }

  // Target colour space for this field — match whatever the current value is
  // authored in (oklch/oklab), else default to oklch. A pasted hex/rgb/hsl/named
  // colour is converted into this space so the stored token stays canonical.
  let targetSpace = $derived<ColorSpace>(colorSpaceOf(value) === 'oklab' ? 'oklab' : 'oklch');

  // Commit a value: expand the var() shorthand, then convert a foreign concrete
  // colour into the target space (var() refs and same-space values pass through).
  function commit(raw: string): void {
    const norm = normalize(raw);
    if (!norm) { onReset(); return; }
    onSet(normalizeColorInput(norm, targetSpace));
  }

  function paint(expr: string): string {
    void previewVersion.value;
    const norm = normalize(expr);
    return resolveColor(norm) || norm || "transparent";
  }

  let swatchColor = $derived(paint(value || `var(${token})`));
  // Always-visible hex reference so a pasted hex stays recognisable after it is
  // normalised to the token's canonical space.
  let hex = $derived.by(() => { void previewVersion.value; return previewHex(value || `var(${token})`); });

  // Detect if the current value is a CSS variable reference (can't use native picker)
  let isVar = $derived(value.trim().startsWith("var(") || value.trim().startsWith("--"));

  // Convert a resolved rgb(...) or a raw hex string to a #RRGGBB seed for the native picker.
  function toHex(color: string): string {
    // Pass through hex colors directly (3- or 6-digit)
    const hex6 = color.match(/^#([0-9a-fA-F]{6})$/);
    if (hex6) return color.toLowerCase();
    const hex3 = color.match(/^#([0-9a-fA-F]{3})$/);
    if (hex3) return "#" + hex3[1].split("").map(c => c + c).join("");
    // Parse computed rgb()/rgba() strings from resolveColor
    const m = color.match(/rgb\w*\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (m) return "#" + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, "0")).join("");
    return "#6366f1";
  }
</script>

<div class="flex items-center gap-2">
  <!-- Swatch / native picker trigger -->
  <div class="relative shrink-0 w-7 h-7 rounded border border-black/10 dark:border-white/10 overflow-hidden cursor-pointer">
    <div class="absolute inset-0" style:background={swatchColor}></div>
    {#if !isVar}
      <input
        type="color"
        value={toHex(swatchColor)}
        oninput={(e) => onSet((e.target as HTMLInputElement).value)}
        onchange={(e) => commit((e.target as HTMLInputElement).value)}
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        tabindex="-1"
      />
    {/if}
  </div>

  <!-- Text display / editable input -->
  {#if editing}
    <input
      bind:this={editInput}
      value={value}
      onblur={(e) => {
        if (cancelBlur) { cancelBlur = false; editing = false; return; }
        commit((e.target as HTMLInputElement).value);
        editing = false;
      }}
      onkeydown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") { cancelBlur = true; editing = false; }
      }}
      placeholder={placeholder ?? "default"}
      class="flex-1 bg-black/8 dark:bg-white/8 border border-indigo-500/50 rounded px-1.5 py-0.5 text-[10px] font-mono text-slate-800 dark:text-slate-200 focus:outline-none"
    />
  {:else}
    <button
      onclick={() => { editing = true; }}
      class="flex-1 text-left text-[9px] font-mono text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 truncate cursor-pointer transition-colors"
    >
      {#if isOverridden}
        <span class="text-indigo-700 dark:text-indigo-300">{value}</span>
      {:else}
        {placeholder ?? "default"}
      {/if}
      {#if hex && !isVar}<span class="text-slate-400 dark:text-slate-600"> · {hex}</span>{/if}
    </button>
  {/if}

  {#if isOverridden}
    <button onclick={onReset} class="text-[8px] text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer shrink-0">reset</button>
  {/if}
</div>
