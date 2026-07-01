<script lang="ts">
  import RangeWithNumber from './RangeWithNumber.svelte';

  let {
    label, help, value, min, max, step, unit, overridden, onChange, onReset,
    rawDefault, currentRaw, onRawSet
  }: {
    label?: string;
    help?: string;
    value: number;
    min: number;
    max: number;
    step: number;
    unit?: string;
    overridden: boolean;
    onChange: (v: number) => void;
    onReset: () => void;
    rawDefault?: string;
    currentRaw?: string;
    onRawSet?: (v: string) => void;
  } = $props();

  let userRawMode = $state(false);

  // Local draft so typing is never interrupted by re-renders. Declared before
  // the derived below so `isEditing` is in scope where `showRaw` reads it.
  let rawDraft = $state('');
  let isEditing = $state(false);

  // Auto raw mode when override value is a CSS expression
  let isRawOverride = $derived(
    !!currentRaw && /^(var|calc|clamp|min|max|env)\(/.test(currentRaw.trim())
  );

  let showRaw = $derived(!!(rawDefault && onRawSet && (userRawMode || isRawOverride || isEditing)));

  // Sync draft from external currentRaw changes only when user is not actively editing
  $effect(() => {
    if (!isEditing) {
      rawDraft = currentRaw ?? '';
    }
  });
</script>

<div class="group">
  <div class="flex items-center justify-between mb-1.5">
    {#if label}
      <span class="text-[11px] font-semibold text-slate-200">{label}</span>
    {:else}
      <span></span>
    {/if}
    <div class="flex items-center gap-1.5">
      {#if rawDefault && onRawSet}
        <button
          onclick={() => { userRawMode = !userRawMode; }}
          title={showRaw ? "Switch to slider" : "Enter raw CSS value"}
          class={`text-[9px] font-mono cursor-pointer transition-all px-0.5 ${
            showRaw
              ? 'text-indigo-400'
              : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus:opacity-100 text-slate-500 hover:text-indigo-400'
          }`}
        >&lt;/&gt;</button>
      {/if}
      {#if overridden}
        <button
          onclick={onReset}
          class="text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 focus:opacity-100 transition-colors"
        >reset</button>
      {/if}
    </div>
  </div>

  {#if showRaw && rawDefault}
    <input
      type="text"
      value={rawDraft}
      placeholder={rawDefault}
      onfocus={() => { isEditing = true; }}
      onblur={() => {
        isEditing = false;
        if (!rawDraft.trim()) onReset();
      }}
      oninput={(e) => {
        rawDraft = (e.target as HTMLInputElement).value;
        const v = rawDraft.trim();
        if (v && onRawSet) onRawSet(v);
      }}
      class="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-slate-300 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
    />
  {:else}
    <RangeWithNumber {value} {min} {max} {step} {unit} {onChange} />
    {#if rawDefault && !overridden}
      <p class="text-[9px] font-mono text-slate-700 mt-0.5 leading-none">default: {rawDefault}</p>
    {/if}
  {/if}

  {#if help}
    <p class="text-[10px] text-slate-600 mt-1 leading-relaxed">{help}</p>
  {/if}
</div>
