<script lang="ts">
  import { KNOBS_BY_DOMAIN } from '../../lib/powerKnobs';
  import PowerKnobRow from '../inputs/PowerKnobRow.svelte';
  import SliderRow from '../inputs/SliderRow.svelte';
  import ColorInput from '../inputs/ColorInput.svelte';

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
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

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
      <div class="flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-black/8 dark:border-white/8">
        <div>
          <div class="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Shadow glow</div>
          <div class="text-[9px] text-slate-500 mt-0.5">Ambient glow on elevated surfaces</div>
        </div>
        <button
          aria-label={glowDisabled ? "Enable shadow glow" : "Disable shadow glow"}
          onclick={() => {
            if (glowDisabled) onReset("--sf-shadow-glow");
            else onSet("--sf-shadow-glow", "none");
          }}
          class={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
            !glowDisabled ? "bg-indigo-600" : "bg-black/10 dark:bg-white/10"
          }`}
        >
          <div class={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            !glowDisabled ? "translate-x-4" : "translate-x-0.5"
          }`}></div>
        </button>
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
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- ADVANCED (power knob, de-emphasised, at end) -->
  <section class="space-y-3">
    <button
      onclick={() => { showAdvanced = !showAdvanced; }}
      aria-expanded={showAdvanced}
      class="w-full flex items-center justify-between text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 transition-colors cursor-pointer"
    >
      <div class="text-[10px] font-semibold uppercase tracking-widest">Advanced</div>
      <span class="text-[10px]">{showAdvanced ? "▲" : "▼"}</span>
    </button>
    {#if showAdvanced}
      <div class="space-y-4">
        {#each knobs as k (k.name)}
          <PowerKnobRow
            knob={k}
            {overrides}
            onChange={(name, val) => val === null ? onReset(name) : onSet(name, val)}
          />
        {/each}
      </div>
    {/if}
  </section>
</div>
