<script lang="ts">
  // Accessibility = the cross-cutting "Quality" panel. It now OWNS the tokens
  // whose whole purpose is accessibility — the focus ring (moved out of Shape)
  // and the touch target (moved out of Misc) — alongside the contrast checker.
  // Previously these controls sat in unrelated panels while classification
  // routed them elsewhere, so the badge/Reset never matched where you edited
  // them. Here the control, the classification and the tools finally agree.
  import type { SlashedToken } from '../../types';
  import SliderRow from '../inputs/SliderRow.svelte';
  import ColorInput from '../inputs/ColorInput.svelte';
  import Section from '../inputs/Section.svelte';
  import WcagPanel from './WcagPanel.svelte';

  let { tokens, overrides, onSet, onReset, onBulkChange }: {
    tokens: SlashedToken[];
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
    onBulkChange: (patch: Record<string, string | null>) => void;
  } = $props();

  const BORDER_STYLES = ["solid", "dashed", "dotted"];

  function parseNum(val: string | undefined, fallback: number, strip?: string): number {
    if (!val) return fallback;
    const v = parseFloat(strip ? val.replace(strip, "") : val);
    return isNaN(v) ? fallback : v;
  }

  let focusWidth = $derived(parseNum(overrides["--sf-focus-ring-width"], 2, "px"));
  let focusOffset = $derived(parseNum(overrides["--sf-focus-ring-offset"], 2, "px"));
  let focusRingColor = $derived(overrides["--sf-focus-ring-color"] ?? "");
  let touchTarget = $derived(parseNum(overrides["--sf-touch-target"], 44, "px"));

  let showFocusRing = $state(true);
  let showTouchTarget = $state(false);
</script>

<div class="p-4 space-y-6">
  <!-- FOCUS RING -->
  <Section title="Focus ring" bind:open={showFocusRing}>
    <SliderRow
      label="Ring width" value={focusWidth} min={0} max={6} step={0.5} unit="px"
      help="Thickness of the keyboard focus indicator"
      overridden={"--sf-focus-ring-width" in overrides}
      onChange={(v) => onSet("--sf-focus-ring-width", `${v}px`)}
      onReset={() => onReset("--sf-focus-ring-width")}
    />
    <SliderRow
      label="Ring offset" value={focusOffset} min={0} max={8} step={0.5} unit="px"
      help="Gap between element edge and focus ring"
      overridden={"--sf-focus-ring-offset" in overrides}
      onChange={(v) => onSet("--sf-focus-ring-offset", `${v}px`)}
      onReset={() => onReset("--sf-focus-ring-offset")}
    />
    <div class="flex items-center gap-2">
      <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 w-24 shrink-0">Ring color</div>
      <ColorInput
        token="--sf-focus-ring-color"
        value={focusRingColor}
        placeholder="default (action)"
        isOverridden={"--sf-focus-ring-color" in overrides}
        onSet={(v) => onSet("--sf-focus-ring-color", v)}
        onReset={() => onReset("--sf-focus-ring-color")}
      />
    </div>
    <div>
      <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Ring style</div>
      <div class="flex gap-2">
        {#each BORDER_STYLES as style (style)}
          {@const current = overrides["--sf-focus-ring-style"] ?? "solid"}
          <button
            onclick={() => style === "solid" ? onReset("--sf-focus-ring-style") : onSet("--sf-focus-ring-style", style)}
            class={`flex-1 py-2 rounded-lg text-[10px] border transition-all cursor-pointer capitalize ${
              current === style
                ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {style}
          </button>
        {/each}
      </div>
    </div>
    <!-- Focus ring preview -->
    <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-4 flex items-center justify-center">
      <div
        class="px-4 py-2 bg-indigo-600/30 rounded-lg text-[11px] text-indigo-800 dark:text-indigo-200"
        style={`outline: var(--sf-focus-ring-width, 2px) var(--sf-focus-ring-style, solid) var(--sf-focus-ring-color, oklch(0.7 0.2 235)); outline-offset: var(--sf-focus-ring-offset, 2px)`}
      >
        Focus ring · {overrides["--sf-focus-ring-style"] ?? "solid"}
      </div>
    </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- TOUCH TARGET -->
  <Section title="Touch target" bind:open={showTouchTarget}>
    <SliderRow
      label="Min touch size" value={touchTarget} min={32} max={64} step={1} unit="px"
      help="--sf-touch-target — minimum tappable area for interactive elements (WCAG 2.5.5). Independent literal (2.75rem / 44px) — deliberately NOT an alias of the --sf-size-* scale, so retuning sizes never drops below the accessibility floor."
      overridden={"--sf-touch-target" in overrides}
      onChange={(v) => onSet("--sf-touch-target", `${v}px`)}
      onReset={() => onReset("--sf-touch-target")}
      rawDefault="2.75rem"
      currentRaw={overrides["--sf-touch-target"]}
      onRawSet={(v) => onSet("--sf-touch-target", v)}
    />
    <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-3 flex items-center gap-3">
      <div
        class="bg-indigo-500/30 border border-indigo-500/30 rounded flex items-center justify-center text-[9px] font-mono text-indigo-600/70 dark:text-indigo-400/70 shrink-0"
        style={`width: var(--sf-touch-target, 2.75rem); height: var(--sf-touch-target, 2.75rem)`}
      ></div>
      <p class="text-[9px] text-slate-400 dark:text-slate-600">Minimum interactive area — ensures accessibility on touch devices.</p>
    </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- CONTRAST TOOLS -->
  <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Colour contrast</div>
  <WcagPanel {tokens} {overrides} {onSet} {onBulkChange} />
</div>
