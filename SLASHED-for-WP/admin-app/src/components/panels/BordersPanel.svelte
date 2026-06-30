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

  const BORDER_STYLES = ["solid", "dashed", "dotted"];
  const RADIUS_STEPS = ["xs", "s", "m", "l", "xl", "2xl", "full"];
  const BASE_RADII: Record<string, number> = { xs: 2, s: 4, m: 8, l: 12, xl: 16, "2xl": 24, full: 9999 };

  const RADIUS_FINE: Array<{ step: string; name: string; default: number; max: number; step_size: number; rawDefault: string }> = [
    { step: "xs",  name: "--sf-radius-xs",  default: 2,  max: 16, step_size: 0.5, rawDefault: "calc(2px * var(--sf-radius-scale))"  },
    { step: "s",   name: "--sf-radius-s",   default: 4,  max: 24, step_size: 0.5, rawDefault: "calc(4px * var(--sf-radius-scale))"  },
    { step: "m",   name: "--sf-radius-m",   default: 8,  max: 32, step_size: 1,   rawDefault: "calc(8px * var(--sf-radius-scale))"  },
    { step: "l",   name: "--sf-radius-l",   default: 12, max: 48, step_size: 1,   rawDefault: "calc(12px * var(--sf-radius-scale))" },
    { step: "xl",  name: "--sf-radius-xl",  default: 16, max: 64, step_size: 1,   rawDefault: "calc(16px * var(--sf-radius-scale))" },
    { step: "2xl", name: "--sf-radius-2xl", default: 24, max: 80, step_size: 2,   rawDefault: "calc(24px * var(--sf-radius-scale))" },
  ];

  const COMPONENT_TOKENS = [
    { label: "Button radius",         token: "--sf-btn-radius",         unit: "rem", min: 0, max: 2,   step: 0.05,  default: 0.5,   rawDefault: "var(--sf-radius-m)",  help: "--sf-btn-radius" },
    { label: "Button padding block",  token: "--sf-btn-padding-block",  unit: "rem", min: 0, max: 1,   step: 0.025, default: 0.375, rawDefault: "var(--sf-space-xs)", help: "--sf-btn-padding-block" },
    { label: "Button padding inline", token: "--sf-btn-padding-inline", unit: "rem", min: 0, max: 2,   step: 0.025, default: 1,     rawDefault: "var(--sf-space-m)",  help: "--sf-btn-padding-inline" },
    { label: "Field radius",          token: "--sf-field-radius",       unit: "rem", min: 0, max: 2,   step: 0.05,  default: 0.5,   rawDefault: "var(--sf-radius-m)",  help: "--sf-field-radius" },
    { label: "Field padding block",   token: "--sf-field-padding-block",  unit: "rem", min: 0, max: 1, step: 0.025, default: 0.375, rawDefault: "var(--sf-space-xs)", help: "--sf-field-padding-block" },
    { label: "Field padding inline",  token: "--sf-field-padding-inline", unit: "rem", min: 0, max: 2, step: 0.025, default: 0.75,  rawDefault: "var(--sf-space-s)",  help: "--sf-field-padding-inline" },
  ];

  const knobs = KNOBS_BY_DOMAIN["borders"] ?? [];

  let showBorderColor = $state(false);
  let showBorderWidths = $state(false);
  let showLineStyles = $state(false);
  let showDividers = $state(false);
  let showFocusRing = $state(false);
  let showRadiusScale = $state(false);
  let showRadiusPreview = $state(false);
  let showFineTune = $state(false);
  let showComponents = $state(false);

  function parseNum(val: string | undefined, fallback: number, strip?: string): number {
    if (!val) return fallback;
    const v = parseFloat(strip ? val.replace(strip, "") : val);
    return isNaN(v) ? fallback : v;
  }

  let radiusScale  = $derived(parseNum(overrides["--sf-radius-scale"], 1));
  let borderScale  = $derived(parseNum(overrides["--sf-border-scale"], 1));
  let focusWidth   = $derived(parseNum(overrides["--sf-focus-ring-width"], 2, "px"));
  let focusOffset  = $derived(parseNum(overrides["--sf-focus-ring-offset"], 2, "px"));
  let dividerWidth = $derived(parseNum(overrides["--sf-divider-width"]?.replace("px",""), 1));
  let dividerGap   = $derived(parseNum(overrides["--sf-divider-gap"]?.replace("rem",""), 1));  // ~1rem ≈ var(--sf-space-m) at default scale
  let borderColor  = $derived(overrides["--sf-color-border"] ?? "");
  let borderStyle  = $derived(overrides["--sf-border-style"] ?? "solid");
  let focusRingColor = $derived(overrides["--sf-focus-ring-color"] ?? "");
  let dividerColor = $derived(overrides["--sf-divider-color"] ?? "");

  function getStyleCurrent(tokenName: string, defaultVal: string): string {
    return overrides[tokenName] ?? defaultVal;
  }

  function getRadiusValue(r: typeof RADIUS_FINE[0]): number {
    const raw = overrides[r.name];
    if (!raw) return r.default;
    if (/^(var|calc|clamp)\(/.test(raw.trim())) return r.default;
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? r.default : parsed;
  }

  function getComponentVal(t: typeof COMPONENT_TOKENS[0]): number {
    const raw = overrides[t.token];
    if (!raw) return t.default;
    if (/^(var|calc|clamp)\(/.test(raw.trim())) return t.default;
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? t.default : parsed;
  }
</script>

<div class="p-4 space-y-5">

  <!-- BORDER COLOR -->
  <section class="space-y-3">
    <button
      onclick={() => { showBorderColor = !showBorderColor; }}
      aria-expanded={showBorderColor}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Border color</div>
      <span class="text-[10px] text-slate-500">{showBorderColor ? "▲" : "▼"}</span>
    </button>
    {#if showBorderColor}
      <ColorInput
        token="--sf-color-border"
        value={borderColor}
        placeholder="auto-derived"
        isOverridden={"--sf-color-border" in overrides}
        onSet={(v) => onSet("--sf-color-border", v)}
        onReset={() => onReset("--sf-color-border")}
      />
      <p class="text-[9px] text-slate-600">
        Drives --sf-color-border--strong, --subtle, --translucent automatically.
      </p>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- BORDER SCALE -->
  <section class="space-y-3">
    <button
      onclick={() => { showBorderWidths = !showBorderWidths; }}
      aria-expanded={showBorderWidths}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Border widths</div>
      <span class="text-[10px] text-slate-500">{showBorderWidths ? "▲" : "▼"}</span>
    </button>
    {#if showBorderWidths}
      <SliderRow
        label="Border scale" value={borderScale} min={0} max={4} step={0.25}
        help="Multiplier applied to all border widths. 0 hides all borders."
        overridden={"--sf-border-scale" in overrides}
        onChange={(v) => onSet("--sf-border-scale", String(v))}
        onReset={() => onReset("--sf-border-scale")}
      />
      <SliderRow
        label="Hairline" value={parseNum(overrides["--sf-border-width-hairline"]?.replace("px",""), 0.5)} min={0} max={1} step={0.25} unit="px"
        help="--sf-border-width-hairline — ultra-thin border for retina displays"
        overridden={"--sf-border-width-hairline" in overrides}
        onChange={(v) => onSet("--sf-border-width-hairline", `${v}px`)}
        onReset={() => onReset("--sf-border-width-hairline")}
      />
      <SliderRow
        label="Box border" value={parseNum(overrides["--sf-box-border-width"]?.replace("px",""), 0)} min={0} max={4} step={0.5} unit="px"
        help="--sf-box-border-width — box-shadow border drawn without affecting layout"
        overridden={"--sf-box-border-width" in overrides}
        onChange={(v) => onSet("--sf-box-border-width", `${v}px`)}
        onReset={() => onReset("--sf-box-border-width")}
      />

      <!-- Width preview -->
      <div class="bg-white/4 rounded-xl border border-white/8 p-3 space-y-2">
        {#each [1, 2, 3, 4] as base (base)}
          <div class="flex items-center gap-3">
            <span class="text-[9px] font-mono text-slate-600 w-10">{base}px →</span>
            <div
              class="flex-1 bg-indigo-400/50 rounded"
              style={`height: ${Math.max(base * borderScale, 0.5)}px`}
            ></div>
            <span class="text-[9px] font-mono text-slate-500 w-10 text-right">
              {(base * borderScale).toFixed(1)}px
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- LINE STYLES -->
  <section class="space-y-4">
    <button
      onclick={() => { showLineStyles = !showLineStyles; }}
      aria-expanded={showLineStyles}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Line styles</div>
      <span class="text-[10px] text-slate-500">{showLineStyles ? "▲" : "▼"}</span>
    </button>
    {#if showLineStyles}
      <div class="grid grid-cols-2 gap-3">
        {#each [
          { label: "Border", token: "--sf-border-style", default: "solid" },
          { label: "Divider", token: "--sf-divider-style", default: "solid" },
        ] as row (row.token)}
          <div>
            <div class="text-[9px] text-slate-500 mb-1.5">{row.label}</div>
            <div class="flex flex-col gap-1">
              {#each BORDER_STYLES as s (s)}
                {@const current = getStyleCurrent(row.token, row.default)}
                <button
                  onclick={() => s === row.default ? onReset(row.token) : onSet(row.token, s)}
                  class={`px-2 py-1.5 rounded-lg text-[10px] border transition-all cursor-pointer text-center ${
                    current === s
                      ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-200"
                      : "border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <span class="block mx-auto mb-0.5" style={`width: 20px; height: 0; border-bottom: 2px ${s} currentColor; opacity: 0.7`}></span>
                  {s}
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>

      <!-- Combined border preview (width × style × color) -->
      <div class="bg-white/4 rounded-xl border border-white/8 p-4 flex items-center justify-center gap-3">
        <div
          class="px-4 py-2 rounded-lg text-[11px] text-slate-300 bg-white/4"
          style={`border: ${Math.max(borderScale, 0.5)}px ${borderStyle} ${borderColor || "var(--sf-color-border, #64748b)"}`}
        >
          Border sample
        </div>
        <span class="text-[9px] font-mono text-slate-600">{(1 * borderScale).toFixed(1)}px · {borderStyle}</span>
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- DIVIDERS -->
  <section class="space-y-3">
    <button
      onclick={() => { showDividers = !showDividers; }}
      aria-expanded={showDividers}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dividers</div>
      <span class="text-[10px] text-slate-500">{showDividers ? "▲" : "▼"}</span>
    </button>
    {#if showDividers}
      <div class="flex items-center gap-2">
        <div class="text-[10px] font-semibold text-slate-400 w-24 shrink-0">Color</div>
        <ColorInput
          token="--sf-divider-color"
          value={dividerColor}
          placeholder="inherits border"
          isOverridden={"--sf-divider-color" in overrides}
          onSet={(v) => onSet("--sf-divider-color", v)}
          onReset={() => onReset("--sf-divider-color")}
        />
      </div>
      <SliderRow
        label="Width" value={dividerWidth} min={0.5} max={4} step={0.5} unit="px"
        help="--sf-divider-width"
        overridden={"--sf-divider-width" in overrides}
        onChange={(v) => onSet("--sf-divider-width", `${v}px`)}
        onReset={() => onReset("--sf-divider-width")}
        rawDefault="var(--sf-border-width-1)"
        currentRaw={overrides["--sf-divider-width"]}
        onRawSet={(v) => onSet("--sf-divider-width", v)}
      />
      <SliderRow
        label="Gap" value={dividerGap} min={0} max={4} step={0.125} unit="rem"
        help="--sf-divider-gap — spacing around divider lines"
        overridden={"--sf-divider-gap" in overrides}
        onChange={(v) => onSet("--sf-divider-gap", `${v}rem`)}
        onReset={() => onReset("--sf-divider-gap")}
        rawDefault="var(--sf-space-m)"
        currentRaw={overrides["--sf-divider-gap"]}
        onRawSet={(v) => onSet("--sf-divider-gap", v)}
      />
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- FOCUS RING -->
  <section class="space-y-3">
    <button
      onclick={() => { showFocusRing = !showFocusRing; }}
      aria-expanded={showFocusRing}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Focus ring</div>
      <span class="text-[10px] text-slate-500">{showFocusRing ? "▲" : "▼"}</span>
    </button>
    {#if showFocusRing}
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
        <div class="text-[10px] font-semibold text-slate-400 w-24 shrink-0">Ring color</div>
        <ColorInput
          token="--sf-focus-ring-color"
          value={focusRingColor}
          placeholder="default (action)"
          isOverridden={"--sf-focus-ring-color" in overrides}
          onSet={(v) => onSet("--sf-focus-ring-color", v)}
          onReset={() => onReset("--sf-focus-ring-color")}
        />
      </div>
      <!-- Focus ring preview -->
      <div class="bg-white/4 rounded-xl border border-white/8 p-4 flex items-center justify-center">
        <div
          class="px-4 py-2 bg-indigo-600/30 rounded-lg text-[11px] text-indigo-200"
          style={`outline: ${focusWidth}px solid ${focusRingColor || "oklch(0.7 0.2 235)"}; outline-offset: ${focusOffset}px`}
        >
          Focus preview
        </div>
      </div>
    {/if}
  </section>

  <div class="h-px bg-white/6"></div>

  <!-- RADIUS -->
  <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Radius</div>

  <!-- Fine-tune radius steps collapsible -->
  <div>
    <button
      onclick={() => { showFineTune = !showFineTune; }}
      aria-expanded={showFineTune}
      class="w-full flex items-center justify-between text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-1"
    >
      <span>Fine-tune radius steps</span>
      <span class="text-[10px] text-slate-500">{showFineTune ? "▲" : "▼"}</span>
    </button>
    {#if showFineTune}
      <div class="mt-2 space-y-2 pl-2 border-l border-white/10">
        {#each RADIUS_FINE as r (r.name)}
          <SliderRow
            label={r.step}
            value={getRadiusValue(r)}
            min={0}
            max={r.max}
            step={r.step_size}
            unit="px"
            overridden={r.name in overrides}
            onChange={(v) => onSet(r.name, `${v}px`)}
            onReset={() => onReset(r.name)}
            rawDefault={r.rawDefault}
            currentRaw={overrides[r.name]}
            onRawSet={(v) => onSet(r.name, v)}
          />
        {/each}
      </div>
    {/if}
  </div>

  <!-- Radius preview -->
  <div>
    <button
      onclick={() => { showRadiusPreview = !showRadiusPreview; }}
      aria-expanded={showRadiusPreview}
      class="w-full flex items-center justify-between cursor-pointer mb-2"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Radius preview</div>
      <span class="text-[10px] text-slate-500">{showRadiusPreview ? "▲" : "▼"}</span>
    </button>
    {#if showRadiusPreview}
      <div class="bg-white/4 rounded-xl border border-white/8 p-4">
        <div class="flex gap-3 flex-wrap">
          {#each RADIUS_STEPS as step (step)}
            {@const base = BASE_RADII[step] ?? 6}
            {@const computed = step === "full" ? 9999 : base * radiusScale}
            <div class="flex flex-col items-center gap-1">
              <div
                class="w-10 h-10 bg-indigo-500/40 border border-indigo-500/30"
                style={`border-radius: ${Math.min(computed, 9999)}px`}
              ></div>
              <span class="text-[8px] font-mono text-slate-600">{step}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <div class="h-px bg-white/6"></div>

  <!-- COMPONENT SHAPE -->
  <div>
    <button
      onclick={() => { showComponents = !showComponents; }}
      aria-expanded={showComponents}
      class="w-full flex items-center justify-between text-[10px] font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer py-1"
    >
      <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Component shape</span>
      <span class="text-[10px] text-slate-500">{showComponents ? "▲" : "▼"}</span>
    </button>
    {#if showComponents}
      <div class="mt-2 space-y-2">
        {#each COMPONENT_TOKENS as t (t.token)}
          <SliderRow
            label={t.label} value={getComponentVal(t)} min={t.min} max={t.max} step={t.step} unit={t.unit}
            help={t.help}
            overridden={t.token in overrides}
            onChange={(v) => onSet(t.token, `${v}${t.unit}`)}
            onReset={() => onReset(t.token)}
            rawDefault={t.rawDefault}
            currentRaw={overrides[t.token]}
            onRawSet={(v) => onSet(t.token, v)}
          />
        {/each}
      </div>
    {/if}
  </div>

  <div class="h-px bg-white/6"></div>

  <!-- ADVANCED (power knob, de-emphasised, at end) -->
  <div>
    <button
      onclick={() => { showRadiusScale = !showRadiusScale; }}
      aria-expanded={showRadiusScale}
      class="w-full flex items-center justify-between text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
    >
      <div class="text-[10px] font-semibold uppercase tracking-widest">Advanced</div>
      <span class="text-[10px]">{showRadiusScale ? "▲" : "▼"}</span>
    </button>
    {#if showRadiusScale}
      <div class="mt-3 space-y-4">
        {#each knobs as k (k.name)}
          <PowerKnobRow
            knob={k}
            {overrides}
            onChange={(name, val) => val === null ? onReset(name) : onSet(name, val)}
          />
        {/each}
      </div>
    {/if}
  </div>
</div>
