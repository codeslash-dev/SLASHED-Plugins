<script lang="ts">
  import { KNOBS_BY_DOMAIN } from '../../lib/powerKnobs';
  import PowerKnobRow from '../inputs/PowerKnobRow.svelte';
  import SliderRow from '../inputs/SliderRow.svelte';
  import ColorInput from '../inputs/ColorInput.svelte';
  import Toggle from '../inputs/Toggle.svelte';
  import Section from '../inputs/Section.svelte';

  let { overrides, onSet, onReset }: {
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
  } = $props();

  const SHADOW_STEPS = ["xs", "s", "m", "l", "xl", "2xl"];

  const knobs = KNOBS_BY_DOMAIN["shadows"] ?? [];

  let lightness = $derived((() => { const v = parseFloat(overrides["--sf-shadow-lightness"] ?? "0.15"); return isFinite(v) ? v : 0.15; })());
  let shadowColor = $derived(overrides["--sf-shadow-color"] ?? "");
  let shadowGlowColor = $derived(overrides["--sf-shadow-glow-color"] ?? "");
  let glowDisabled = $derived(overrides["--sf-shadow-glow"] === "none");

  let showShadowColor = $state(false);
  let showGlow = $state(false);
  let showAdvanced = $state(false);
</script>

<div class="p-4 space-y-5">

  <!-- Elevation preview — category-wide, reflects strength, lightness, color & glow -->
  <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-4 flex gap-4 flex-wrap items-end justify-center">
    {#each SHADOW_STEPS as step, i (step)}
      <div class="flex flex-col items-center gap-2">
        <div
          class="bg-white dark:bg-[#1a1a2e] border border-black/8 dark:border-white/8 rounded-lg"
          style={`width: ${40 + i * 4}px; height: ${40 + i * 4}px; box-shadow: var(--sf-shadow-${step})`}
        ></div>
        <span class="text-[8px] font-mono text-slate-400 dark:text-slate-600">{step}</span>
      </div>
    {/each}
  </div>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- SHADOW LIGHTNESS -->
  <SliderRow
    label="Shadow lightness" value={lightness} min={0} max={0.5} step={0.01}
    help="--sf-shadow-lightness — OKLCH lightness of the shadow color. Lower = darker, more visible shadows."
    overridden={"--sf-shadow-lightness" in overrides}
    onChange={(v) => onSet("--sf-shadow-lightness", String(v))}
    onReset={() => onReset("--sf-shadow-lightness")}
  />

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- SHADOW COLOR -->
  <Section title="Shadow color" spacing="space-y-4" bind:open={showShadowColor}>
      <div>
        <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Shadow color</div>
        <ColorInput
          token="--sf-shadow-color"
          value={shadowColor}
          placeholder="auto (neutral hue)"
          isOverridden={"--sf-shadow-color" in overrides}
          onSet={(v) => onSet("--sf-shadow-color", v)}
          onReset={() => onReset("--sf-shadow-color")}
        />
        <p class="text-[9px] text-slate-400 dark:text-slate-600 mt-1">Warm, cool or brand-tinted shadows. Default uses neutral hue.</p>
      </div>
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- GLOW -->
  <Section title="Glow" bind:open={showGlow}>
      <!-- Glow toggle -->
      <div class="flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8">
        <div>
          <div class="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Shadow glow</div>
          <div class="text-[9px] text-slate-500 mt-0.5">Ambient glow on elevated surfaces</div>
        </div>
        <Toggle
          checked={!glowDisabled}
          ariaLabel={glowDisabled ? "Enable shadow glow" : "Disable shadow glow"}
          onToggle={() => glowDisabled ? onReset("--sf-shadow-glow") : onSet("--sf-shadow-glow", "none")}
        />
      </div>

      {#if !glowDisabled}
        <div>
          <div class="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Glow color</div>
          <ColorInput
            token="--sf-shadow-glow-color"
            value={shadowGlowColor}
            placeholder="default (primary color)"
            isOverridden={"--sf-shadow-glow-color" in overrides}
            onSet={(v) => onSet("--sf-shadow-glow-color", v)}
            onReset={() => onReset("--sf-shadow-glow-color")}
          />
          <p class="text-[9px] text-slate-400 dark:text-slate-600 mt-1">Which brand color radiates the glow. Defaults to primary.</p>
        </div>
      {/if}

      <!-- Glow preview — uses --sf-shadow-glow directly so colour/toggle changes show -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-6 flex items-center justify-center">
        <div
          class="w-16 h-16 bg-white dark:bg-[#1a1a2e] border border-black/8 dark:border-white/8 rounded-xl"
          style={`box-shadow: ${glowDisabled ? "none" : "var(--sf-shadow-glow)"}`}
        ></div>
      </div>
      {#if glowDisabled}
        <p class="text-[9px] text-slate-400 dark:text-slate-600 text-center">Glow disabled.</p>
      {/if}
  </Section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- ADVANCED (power knob, de-emphasised, at end) -->
  <Section title="Advanced" variant="advanced" bind:open={showAdvanced}>
      <div class="space-y-4">
        {#each knobs as k (k.name)}
          <PowerKnobRow
            knob={k}
            {overrides}
            onChange={(name, val) => val === null ? onReset(name) : onSet(name, val)}
          />
        {/each}
      </div>
  </Section>
</div>
