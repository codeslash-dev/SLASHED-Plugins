<script lang="ts">
  /**
   * Warns that concrete per-step values in the override map are shadowing the
   * scale knobs on this card, and offers to clear them. See lib/scaleShadow.ts
   * for why this state is otherwise invisible.
   */
  let { tokens, scaleLabel, onClear }: {
    /** The shadowing step tokens, in ladder order. */
    tokens: string[];
    /** e.g. "spacing" — reads as "…override the generated spacing scale". */
    scaleLabel: string;
    onClear: () => void;
  } = $props();

  let expanded = $state(false);
  let one = $derived(tokens.length === 1);
  // aria-controls needs a stable id, and two notices (spacing + type) can be
  // mounted at once, so it must be unique per instance rather than a constant.
  const listId = `sf-shadowed-tokens-${crypto.randomUUID()}`;
</script>

{#if tokens.length}
  <div class="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 space-y-2">
    <p class="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
      {tokens.length}
      {one ? 'token holds a fixed value that overrides' : 'tokens hold fixed values that override'}
      the generated {scaleLabel} scale, so the controls below
      {one ? 'do not affect that step' : 'do not affect those steps'}.
      Fixed values win over the scale that would generate them.
    </p>
    <div class="flex items-center gap-2">
      <button
        onclick={onClear}
        class="text-[10px] font-semibold text-amber-800 dark:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded px-2 py-1 cursor-pointer transition-colors"
      >
        Clear {one ? 'it' : 'them'} and use the scale
      </button>
      <button
        onclick={() => { expanded = !expanded; }}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-label={expanded ? `Hide the ${scaleLabel} tokens holding fixed values` : `Show the ${scaleLabel} tokens holding fixed values`}
        class="text-[10px] text-amber-700/80 dark:text-amber-300/80 hover:underline cursor-pointer"
      >
        {expanded ? 'hide' : 'show'}
      </button>
    </div>
    {#if expanded}
      <ul id={listId} class="space-y-0.5 pt-0.5">
        {#each tokens as token (token)}
          <li class="text-[9px] font-mono text-amber-700/80 dark:text-amber-300/80">{token}</li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}
