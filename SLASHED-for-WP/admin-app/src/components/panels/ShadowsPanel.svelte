<script lang="ts">
  import { KNOBS_BY_DOMAIN } from '../../lib/powerKnobs';
  import { SHADOW_PRESETS } from '../../lib/stylePresets';
  import PowerKnobRow from '../inputs/PowerKnobRow.svelte';
  import StylePresetCards from '../inputs/StylePresetCards.svelte';
  import SliderRow from '../inputs/SliderRow.svelte';
  import ColorInput from '../inputs/ColorInput.svelte';

  let { overrides, onSet, onReset, onBulkChange }: {
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
    onBulkChange: (patch: Record<string, string | null>) => void;
  } = $props();

  const SHADOW_STEPS = ["xs", "s", "m", "l", "xl", "2xl"];

  const knobs = KNOBS_BY_DOMAIN["shadows"] ?? [];

  let lightness = $derived(parseFloat(overrides["--sf-shadow-lightness"] ?? "0.15"));
  let shadowColor = $derived(overrides["--sf-shadow-color"] ?? "");
  let shadowGlowColor = $derived(overrides["--sf-shadow-glow-color"] ?? "");
  let glowDisabled = $derived(overrides["--sf-shadow-glow"] === "none");

  let showShadowAppearance = $state(false);
  let showShadowColor = $state(false);
  let showGlow = $state(false);
  let showElevationPreview = $state(false);
</script>

<div class="p-4 space-y-5">

  <!-- Elevation presets -->
  <StylePresetCards
    label="Elevation preset"
    presets={SHADOW_PRESETS}
    {overrides}
    onApply={onBulkChange}
  />

  <div class="h-px bg-white/6"></div>

  <!-- SHADOW APPEARANCE -->
  <section class="space-y-4">
    <button
      onclick={() => { showShadowAppearance = !showShadowAppearance; }}
      aria-expanded={showShadowAppearance}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shadow appearance</div>
      <span class="text-[10px] text-slate-500">{showShadowAppearance ? "▲" : "▼"}</span>
    </button>
    {#if showShadowAppearance}
      <div class="space-y-4">
        {#each knobs as k (k.name)}
          <PowerKnobRow
            knob={k}
            {overrides}
            onChange={(name, val) => val === null ? onReset(name) : onSet(name, val)}
          />
        {/each}
      </div>

      <SliderRow
        label="Shadow lightness" value={lightness} min={0} max={0.5} step={0.01}
        help="OKLCH lightness of the shadow color. Lower = darker, more visible shadows."
        overridden={"--sf-shadow-lightness" in overrides}
        onChange={(v) => onSet("--sf-shadow-lightness", String(v))}
        onReset={() => onReset("--sf-shadow-lightness")}
      />
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- SHADOW COLOR -->
  <section class="space-y-4">
    <button
      onclick={() => { showShadowColor = !showShadowColor; }}
      aria-expanded={showShadowColor}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shadow color</div>
      <span class="text-[10px] text-slate-500">{showShadowColor ? "▲" : "▼"}</span>
    </button>
    {#if showShadowColor}
      <div>
        <div class="text-[10px] font-semibold text-slate-400 mb-1.5">Shadow color</div>
        <ColorInput
          token="--sf-shadow-color"
          value={shadowColor}
          placeholder="auto (neutral hue)"
          isOverridden={"--sf-shadow-color" in overrides}
          onSet={(v) => onSet("--sf-shadow-color", v)}
          onReset={() => onReset("--sf-shadow-color")}
        />
        <p class="text-[9px] text-slate-600 mt-1">Warm, cool or brand-tinted shadows. Default uses neutral hue.</p>
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- GLOW -->
  <section class="space-y-3">
    <button
      onclick={() => { showGlow = !showGlow; }}
      aria-expanded={showGlow}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Glow</div>
      <span class="text-[10px] text-slate-500">{showGlow ? "▲" : "▼"}</span>
    </button>
    {#if showGlow}
      <!-- Glow toggle -->
      <div class="flex items-center justify-between p-3 rounded-xl bg-white/4 border border-white/8">
        <div>
          <div class="text-[11px] font-semibold text-slate-200">Shadow glow</div>
          <div class="text-[9px] text-slate-500 mt-0.5">Ambient glow on elevated surfaces</div>
        </div>
        <button
          aria-label={glowDisabled ? "Enable shadow glow" : "Disable shadow glow"}
          onclick={() => {
            if (glowDisabled) onReset("--sf-shadow-glow");
            else onSet("--sf-shadow-glow", "none");
          }}
          class={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
            !glowDisabled ? "bg-indigo-600" : "bg-white/10"
          }`}
        >
          <div class={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            !glowDisabled ? "translate-x-4" : "translate-x-0.5"
          }`}></div>
        </button>
      </div>

      {#if !glowDisabled}
        <div>
          <div class="text-[10px] font-semibold text-slate-400 mb-1.5">Glow color</div>
          <ColorInput
            token="--sf-shadow-glow-color"
            value={shadowGlowColor}
            placeholder="default (primary color)"
            isOverridden={"--sf-shadow-glow-color" in overrides}
            onSet={(v) => onSet("--sf-shadow-glow-color", v)}
            onReset={() => onReset("--sf-shadow-glow-color")}
          />
          <p class="text-[9px] text-slate-600 mt-1">Which brand color radiates the glow. Defaults to primary.</p>
        </div>
      {/if}
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- Elevation preview -->
  <div>
    <button
      onclick={() => { showElevationPreview = !showElevationPreview; }}
      aria-expanded={showElevationPreview}
      class="w-full flex items-center justify-between cursor-pointer mb-2"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Elevation preview</div>
      <span class="text-[10px] text-slate-500">{showElevationPreview ? "▲" : "▼"}</span>
    </button>
    {#if showElevationPreview}
      <div class="bg-white/4 rounded-xl border border-white/8 p-4 flex gap-4 flex-wrap items-end justify-center">
        {#each SHADOW_STEPS as step, i (step)}
          <div class="flex flex-col items-center gap-2">
            <div
              class="bg-[#1a1a2e] border border-white/8 rounded-lg"
              style={`width: ${40 + i * 4}px; height: ${40 + i * 4}px; box-shadow: var(--sf-shadow-${step})`}
            ></div>
            <span class="text-[8px] font-mono text-slate-600">{step}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>
