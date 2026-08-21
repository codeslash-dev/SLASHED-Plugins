<script lang="ts">
  import type { SlashedToken } from '../../types';
  import type { VarOption } from '../../lib/variableScales';
  import { detectMode, type ValueMode } from '../../lib/valueField';

  let { token, overrideValue, onSet, onReset, scaleOptions = [] }: {
    token: SlashedToken;
    overrideValue?: string;
    onSet: (value: string) => void;
    onReset: () => void;
    /** Sibling scale steps offered as quick "relink" targets in Inherit mode. */
    scaleOptions?: VarOption[];
  } = $props();

  // Auto-detect the mode from the current value; a user tab-click overrides it
  // until the value changes underneath (mirrors SliderRow's manualView idea).
  // Crucially, an expression override always resolves to 'expression' mode, so
  // a var()/calc() is shown verbatim and never silently parsed to a number.
  let manualMode = $state<ValueMode | null>(null);
  let mode = $derived<ValueMode>(manualMode ?? detectMode(overrideValue));

  let draft = $state("");
  let editing = $state(false);
  let cancelling = $state(false);
  // Switching back to Inherit throws away the override. The tab sits right next
  // to Value/Expression and reads like a harmless view switch, so a stray click
  // used to silently wipe an edit. When there's an actual override to lose we
  // arm this confirm step instead of resetting immediately.
  let confirmingInherit = $state(false);
  // Reset a user-selected tab (and any pending confirm) when another surface
  // changes this token.
  $effect(() => {
    overrideValue;
    manualMode = null;
    confirmingInherit = false;
  });
  // Seed the text field from the live value whenever we're not mid-edit.
  $effect(() => {
    if (!editing) draft = overrideValue ?? token.value ?? "";
  });

  const RELINK = "__sf_relink__";

  function commit(raw: string) {
    const v = raw.trim();
    if (!v || v === token.value) onReset();
    else onSet(v);
  }

  function setMode(m: ValueMode) {
    if (m === "inherit") {
      // Nothing overridden → already inheriting, so this is a no-op, not a
      // destructive reset; just settle on auto-detect.
      if (overrideValue === undefined) { manualMode = null; confirmingInherit = false; return; }
      // Otherwise require an explicit confirmation before discarding the value.
      confirmingInherit = true;
      return;
    }
    confirmingInherit = false;
    manualMode = m;
  }

  function confirmInherit() {
    confirmingInherit = false;
    manualMode = null;
    onReset();
  }

  const TABS: { id: ValueMode; label: string }[] = [
    { id: "inherit", label: "Inherit" },
    { id: "value", label: "Value" },
    { id: "expression", label: "Expression" },
  ];
</script>

<div class="space-y-1">
  <!-- Mode tabs -->
  <div class="flex items-center gap-0.5 p-0.5 rounded-md bg-black/5 dark:bg-white/5 w-fit">
    {#each TABS as t (t.id)}
      {@const active = confirmingInherit ? t.id === "inherit" : mode === t.id}
      <button
        onclick={() => setMode(t.id)}
        aria-pressed={active}
        class={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
          active
            ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-sm"
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        }`}
      >{t.label}</button>
    {/each}
  </div>

  <!-- Confirm step for a destructive "back to Inherit" — arms on the first
       click, discards the override only on the explicit Reset here. -->
  {#if confirmingInherit}
    <div class="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-rose-500/10 border border-rose-500/20">
      <span class="text-[9px] text-rose-700 dark:text-rose-300 leading-snug flex-1 min-w-0">
        Discard this override and inherit <span class="font-mono">{token.value}</span>?
      </span>
      <button
        onclick={() => { confirmingInherit = false; }}
        class="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-600 dark:text-slate-300 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer"
      >Cancel</button>
      <button
        onclick={confirmInherit}
        class="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer"
      >Reset</button>
    </div>
  {/if}

  {#if mode === "inherit"}
    <div class="text-[10px] font-mono text-slate-500 dark:text-slate-500">
      default: <span class="text-slate-600 dark:text-slate-400">{token.value}</span>
    </div>
    {#if scaleOptions.length > 0}
      <select
        value={RELINK}
        aria-label={`Relink ${token.name}`}
        onchange={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          if (v !== RELINK) onSet(v);
          (e.target as HTMLSelectElement).value = RELINK;
        }}
        class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[10px] font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
      >
        <option value={RELINK}>Relink to a scale step…</option>
        {#each scaleOptions as o (o.value)}
          <option value={o.value}>{o.label}</option>
        {/each}
      </select>
    {/if}
  {:else}
    <!-- Value and Expression share a text field. The distinction is intent:
         Value is a literal you type; Expression is a var()/calc() shown as-is.
         Neither ever rewrites the other silently — switching is a tab click. -->
    <input
      type="text"
      value={draft}
      spellcheck="false"
      placeholder={mode === "expression" ? "var(--sf-…) / calc(…)" : token.value}
      onfocus={() => { editing = true; }}
      oninput={(e) => { draft = (e.target as HTMLInputElement).value; }}
      onblur={(e) => {
        editing = false;
        if (cancelling) { cancelling = false; return; }
        commit((e.target as HTMLInputElement).value);
      }}
      onkeydown={(e) => {
        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
        if (e.key === "Escape") {
          cancelling = true;
          editing = false;
          draft = overrideValue ?? token.value ?? "";
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      class="w-full bg-black/8 dark:bg-white/8 border border-black/10 dark:border-white/10 rounded px-1.5 py-1 text-[10px] font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
    />
  {/if}
</div>
