<script lang="ts">
  import SliderRow from '../inputs/SliderRow.svelte';
  import { SPACE_SCALE, RADIUS_SCALE, BORDER_WIDTH_SCALE, SIZE_SCALE, type VarOption } from '../../lib/variableScales';
  import { themeState } from '../../lib/theme.svelte';

  let { overrides, onSet, onReset }: {
    overrides: Record<string, string>;
    onSet: (name: string, value: string) => void;
    onReset: (name: string) => void;
  } = $props();

  const TEXT_STEPS = ["2xs", "xs", "s", "m", "l", "xl", "2xl"];
  const SHADOW_STEPS = ["xs", "s", "m", "l", "xl", "2xl"];
  const RATIO_STEPS = ["square", "video", "cinema", "4-3", "3-2", "portrait", "golden"];
  const WEIGHT_OPTIONS = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];

  const BTN_VARIANTS = ["default", "primary", "secondary", "tertiary", "action", "base", "neutral", "success", "warning", "info", "danger"];
  const BTN_STYLES: { id: "fill" | "soft" | "outline"; label: string }[] = [
    { id: "fill",    label: "Fill" },
    { id: "soft",    label: "Soft" },
    { id: "outline", label: "Outline" },
  ];
  const BTN_SIZES = ["xs", "s", "m", "l", "xl"];
  // Families with a real --sf-gradient-* token (core-4 brand families; the
  // unmodified default resolves to action). Elsewhere --gradient is a
  // documented solid no-op, so the toggle is disabled there.
  const BTN_GRADIENT_FAMILIES = new Set(["default", "primary", "secondary", "tertiary", "action"]);

  const BG_PRESETS = [
    { step: "surface", label: "Surface" },
    { step: "base",    label: "Base" },
    { step: "inset",   label: "Inset" },
    { step: "raised",  label: "Raised" },
  ];
  const BORDER_PRESETS = [
    { step: "border",           label: "Default" },
    { step: "border--subtle",   label: "Subtle" },
    { step: "border--strong",   label: "Strong" },
  ];

  // Everyday, non-scale-shadowing button knobs — applied uniformly, they don't
  // flatten the .sf-btn--xs…xl size ladder, so they stay on the main surface.
  const BUTTON_TOKENS: Array<{ label: string; token: string; unit: string; min: number; max: number; step: number; default: number; rawDefault: string; variableOptions: VarOption[] }> = [
    { label: "Radius",         token: "--sf-btn-radius",         unit: "rem", min: 0, max: 2,   step: 0.05,   default: 0.5,   rawDefault: "var(--sf-radius-m)", variableOptions: RADIUS_SCALE },
    { label: "Gap (icon+label)", token: "--sf-btn-gap",          unit: "rem", min: 0, max: 1,   step: 0.0125, default: 0.25,  rawDefault: "var(--sf-space-2xs)", variableOptions: SPACE_SCALE },
    { label: "Border width",  token: "--sf-btn-border-width",   unit: "px",  min: 0, max: 4,   step: 0.5,    default: 1,     rawDefault: "var(--sf-border-width-1)", variableOptions: BORDER_WIDTH_SCALE },
  ];

  // Everyday label-size multiplier — scales every button's font-size by one
  // factor while KEEPING the xs…xl ladder intact (unlike the flatten-all
  // --sf-btn-font-size override, which now lives only in the All-tokens tab).
  const BTN_FONT_SCALE = { token: "--sf-btn-font-scale", default: 1, min: 0.75, max: 1.5, step: 0.05 };

  // Per-size editor — one PUBLIC knob per rung for each sizing property, the
  // button counterpart of the per-heading typography editor. Defaults mirror the
  // framework's --sf-btn-*--size tier; unset falls through to that scale default.
  const BTN_SIZE_RUNGS = ["xs", "s", "m", "l", "xl"];
  type RungSizing = {
    fontStep: string;
    pb: { raw: string; num: number };
    pi: { raw: string; num: number };
    mh: { raw: string; num: number };
  };
  const RUNG_SIZING: Record<string, RungSizing> = {
    xs: { fontStep: "xs", pb: { raw: "0.125rem",           num: 0.125 }, pi: { raw: "var(--sf-space-xs)",  num: 0.375 }, mh: { raw: "var(--sf-size-xs)", num: 2 } },
    s:  { fontStep: "s",  pb: { raw: "var(--sf-space-2xs)", num: 0.25  }, pi: { raw: "var(--sf-space-s)",   num: 0.5   }, mh: { raw: "var(--sf-size-s)",  num: 2.25 } },
    m:  { fontStep: "m",  pb: { raw: "var(--sf-space-xs)",  num: 0.375 }, pi: { raw: "var(--sf-space-m)",   num: 0.75  }, mh: { raw: "var(--sf-size-m)",  num: 2.5 } },
    l:  { fontStep: "l",  pb: { raw: "var(--sf-space-s)",   num: 0.5   }, pi: { raw: "var(--sf-space-l)",   num: 1     }, mh: { raw: "var(--sf-size-l)",  num: 3 } },
    xl: { fontStep: "xl", pb: { raw: "var(--sf-space-m)",   num: 0.75  }, pi: { raw: "var(--sf-space-xl)",  num: 1.5   }, mh: { raw: "var(--sf-size-xl)", num: 3.5 } },
  };
  // Per-rung SliderRow config for a padding / min-height property.
  function rungRow(rung: string, prop: "pb" | "pi" | "mh") {
    const d = RUNG_SIZING[rung][prop];
    const suffix = prop === "pb" ? "padding-block" : prop === "pi" ? "padding-inline" : "min-height";
    const isHeight = prop === "mh";
    return {
      token: `--sf-btn-${rung}-${suffix}`,
      rawDefault: d.raw,
      default: d.num,
      unit: "rem",
      min: 0,
      max: isHeight ? 4 : 2,
      step: isHeight ? 0.125 : 0.025,
      variableOptions: isHeight ? SIZE_SCALE : SPACE_SCALE,
      label: prop === "pb" ? "Padding block" : prop === "pi" ? "Padding inline" : "Min height",
    };
  }

  const CARD_TOKENS: Array<{ label: string; token: string; unit: string; min: number; max: number; step: number; default: number; rawDefault: string; variableOptions: VarOption[] }> = [
    { label: "Padding",       token: "--sf-card-padding",       unit: "rem", min: 0, max: 3, step: 0.05, default: 1.5, rawDefault: "var(--sf-space-l)", variableOptions: SPACE_SCALE },
    { label: "Gap (header/footer)", token: "--sf-card-gap",     unit: "rem", min: 0, max: 2, step: 0.05, default: 1,   rawDefault: "var(--sf-space-m)", variableOptions: SPACE_SCALE },
    { label: "Radius (inner)", token: "--sf-card-radius",       unit: "rem", min: 0, max: 2, step: 0.05, default: 0.5, rawDefault: "var(--sf-radius-m)", variableOptions: RADIUS_SCALE },
    { label: "Border width",  token: "--sf-card-border-width",  unit: "px",  min: 0, max: 4, step: 0.5,  default: 1,   rawDefault: "var(--sf-border-width-1)", variableOptions: BORDER_WIDTH_SCALE },
    { label: "Media radius",  token: "--sf-card-media-radius",  unit: "rem", min: 0, max: 2, step: 0.05, default: 0.5, rawDefault: "var(--sf-card-radius, var(--sf-radius-m))", variableOptions: RADIUS_SCALE },
  ];

  function resetButtonTokens() {
    for (const k of Object.keys(overrides)) {
      if (k.startsWith("--sf-btn-")) onReset(k);
    }
  }

  let showButton = $state(false);
  let activeBtnRung = $state("m");
  let activeFontToken = $derived(`--sf-btn-${activeBtnRung}-font-size`);
  let activeFontDef = $derived(RUNG_SIZING[activeBtnRung].fontStep);
  let showCard = $state(false);

  // Preview-only state — never touches overrides, just picks which real
  // .sf-btn/.sf-card classes to render in the live sample below.
  let btnVariant = $state<typeof BTN_VARIANTS[number]>("primary");
  let btnStyle = $state<typeof BTN_STYLES[number]["id"]>("fill");
  let btnGradient = $state(false);
  let btnSize = $state("m");
  let btnDisabled = $state(false);
  let btnLoading = $state(false);

  let cardBordered = $state(false);
  let cardElevated = $state(false);
  let cardInteractive = $state(false);

  function btnClass(): string {
    const classes = ["sf-btn"];
    if (btnVariant !== "default") classes.push(`sf-btn--${btnVariant}`);
    if (btnStyle !== "fill") classes.push(`sf-btn--${btnStyle}`);
    if (btnGradient && btnStyle !== "soft" && BTN_GRADIENT_FAMILIES.has(btnVariant)) classes.push("sf-btn--gradient");
    if (btnSize !== "m") classes.push(`sf-btn--${btnSize}`);
    return classes.join(" ");
  }

  function cardClass(): string {
    const classes = ["sf-card"];
    if (cardBordered) classes.push("sf-card--bordered");
    if (cardElevated) classes.push("sf-card--elevated");
    if (cardInteractive) classes.push("sf-card--interactive");
    return classes.join(" ");
  }

  function parseNum(val: string | undefined, fallback: number, strip?: string): number {
    if (!val) return fallback;
    const v = parseFloat(strip ? val.replace(strip, "") : val);
    return isNaN(v) ? fallback : v;
  }

  function getVal(t: { token: string; default: number }): number {
    const raw = overrides[t.token];
    if (!raw) return t.default;
    if (/^(var|calc|clamp)\(/.test(raw.trim())) return t.default;
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? t.default : parsed;
  }

  // Generic "which named scale step is this token currently set to" reader,
  // shared by font-size/shadow/ratio button-groups. Values are always stored
  // as var(--sf-{prefix}-{step}) so the reverse-lookup just regexes the step
  // back out; anything else (custom raw value, or no override) falls back
  // to the token's own documented default step.
  function currentStep(token: string, prefix: string, steps: string[], def: string): string {
    const raw = overrides[token];
    if (!raw) return def;
    const m = raw.match(new RegExp(`^var\\(--sf-${prefix}-([\\w-]+)\\)$`));
    return m && steps.includes(m[1]) ? m[1] : def;
  }

  function setStep(token: string, prefix: string, step: string, def: string) {
    if (step === def) onReset(token);
    else onSet(token, `var(--sf-${prefix}-${step})`);
  }

  function isVarShaped(raw: string | undefined): boolean {
    return !!raw && /^(var|calc|clamp)\(/.test(raw.trim());
  }

  const CARD_RADIUS_TOKEN = CARD_TOKENS.find((t) => t.token === "--sf-card-radius")!;
  const CARD_PADDING_TOKEN = CARD_TOKENS.find((t) => t.token === "--sf-card-padding")!;

  let cardRadius = $derived(getVal(CARD_RADIUS_TOKEN));
  let cardPadding = $derived(getVal(CARD_PADDING_TOKEN));
  // getVal() falls back to the token's documented default whenever the
  // override is a var()/calc()/clamp() raw (it can't resolve those to a
  // number), so the computed sum below would silently show a stale value
  // once either token is set via the variable-scale dropdown.
  let outerRadiusUnknown = $derived(
    isVarShaped(overrides[CARD_RADIUS_TOKEN.token]) || isVarShaped(overrides[CARD_PADDING_TOKEN.token])
  );
</script>

<div class="p-4 space-y-5">

  <!-- BUTTON -->
  <section class="space-y-3">
    <button
      onclick={() => { showButton = !showButton; }}
      aria-expanded={showButton}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Button (.sf-btn)</div>
      <span class="text-[10px] text-slate-500">{showButton ? "▲" : "▼"}</span>
    </button>
    {#if showButton}
      <!-- Preview pickers — local state only, not overrides -->
      <div class="space-y-2">
        <div class="text-[9px] text-slate-500">Variant (preview only)</div>
        <div class="flex flex-wrap gap-1">
          {#each BTN_VARIANTS as v (v)}
            <button
              onclick={() => { btnVariant = v; }}
              class={`px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer capitalize ${
                btnVariant === v
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                  : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >{v}</button>
          {/each}
        </div>
        <div class="text-[9px] text-slate-500">Style</div>
        <div class="flex flex-wrap gap-1">
          {#each BTN_STYLES as s (s.id)}
            <button
              onclick={() => { btnStyle = s.id; }}
              class={`px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                btnStyle === s.id
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                  : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >{s.label}</button>
          {/each}
        </div>
        <div class="text-[9px] text-slate-500">Size</div>
        <div class="flex flex-wrap gap-1">
          {#each BTN_SIZES as s (s)}
            <button
              onclick={() => { btnSize = s; activeBtnRung = s; }}
              class={`px-2.5 py-1 rounded-lg text-[10px] border transition-all cursor-pointer uppercase ${
                btnSize === s
                  ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                  : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
              }`}
            >{s}</button>
          {/each}
        </div>
        <div class="flex items-center gap-3 pt-0.5">
          <label
            class={`flex items-center gap-1.5 text-[9px] ${
              BTN_GRADIENT_FAMILIES.has(btnVariant) && btnStyle !== "soft"
                ? "text-slate-500 cursor-pointer"
                : "text-slate-400 dark:text-slate-600 cursor-not-allowed"
            }`}
            title={BTN_GRADIENT_FAMILIES.has(btnVariant) && btnStyle !== "soft"
              ? "Paint the fill (or the outline ring) with the family gradient"
              : "Gradient covers the core-4 brand families (primary/secondary/tertiary/action) and is ignored under Soft"}
          >
            <input
              type="checkbox"
              bind:checked={btnGradient}
              disabled={!BTN_GRADIENT_FAMILIES.has(btnVariant) || btnStyle === "soft"}
              class="cursor-pointer disabled:cursor-not-allowed"
            /> gradient
          </label>
          <label class="flex items-center gap-1.5 text-[9px] text-slate-500 cursor-pointer">
            <input type="checkbox" bind:checked={btnDisabled} class="cursor-pointer" /> disabled
          </label>
          <label class="flex items-center gap-1.5 text-[9px] text-slate-500 cursor-pointer">
            <input type="checkbox" bind:checked={btnLoading} class="cursor-pointer" /> loading
          </label>
        </div>
      </div>

      <!-- Live preview — real .sf-btn classes, driven by the same override
           mechanism as every other panel's inline preview. data-theme pins
           the framework's token resolution to the Studio's own chrome theme:
           without it, background tokens (--sf-card-bg/--sf-color-surface,
           registered via @property) and text tokens (--sf-color-text,
           unregistered) resolve dark mode through different mechanisms —
           the former freezes at :root's color-scheme, the latter
           re-evaluates light-dark() locally — so toggling just the Tailwind
           `dark` class on an ancestor (as the Studio chrome does) desyncs
           them into unreadable combinations. An explicit attribute forces
           both through the same deterministic [data-theme] CSS path. -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-4 flex items-center justify-center" data-theme={themeState.value}>
        <button class={btnClass()} class:sf-is-loading={btnLoading} disabled={btnDisabled}>
          {btnLoading ? "Loading" : "Button label"}
        </button>
      </div>

      <div class="mt-2 space-y-2">
        <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Base style</div>

        {#each BUTTON_TOKENS as t (t.token)}
          <SliderRow
            label={t.label} value={getVal(t)} min={t.min} max={t.max} step={t.step} unit={t.unit}
            help={t.token}
            overridden={t.token in overrides}
            onChange={(v) => onSet(t.token, `${v}${t.unit}`)}
            onReset={() => onReset(t.token)}
            rawDefault={t.rawDefault}
            variableOptions={t.variableOptions}
            currentRaw={overrides[t.token]}
            onRawSet={(v) => onSet(t.token, v)}
          />
        {/each}

        <!-- Label size — the everyday multiplier. Scales every rung together,
             keeping the xs…xl ladder intact (unlike the flatten-all override
             in Advanced). -->
        <SliderRow
          label="Label size (all sizes)" value={getVal(BTN_FONT_SCALE)}
          min={BTN_FONT_SCALE.min} max={BTN_FONT_SCALE.max} step={BTN_FONT_SCALE.step} unit="×"
          help="--sf-btn-font-scale — multiplies every button's label, keeping the size ladder"
          overridden={BTN_FONT_SCALE.token in overrides}
          onChange={(v) => v === BTN_FONT_SCALE.default ? onReset(BTN_FONT_SCALE.token) : onSet(BTN_FONT_SCALE.token, String(v))}
          onReset={() => onReset(BTN_FONT_SCALE.token)}
        />

        <div>
          <div class="text-[9px] text-slate-500 mb-1">Label weight — --sf-btn-font-weight</div>
          <div class="flex flex-wrap gap-1">
            {#each WEIGHT_OPTIONS as w (w)}
              {@const cur = overrides["--sf-btn-font-weight"] ?? "600"}
              <button
                onclick={() => w === "600" ? onReset("--sf-btn-font-weight") : onSet("--sf-btn-font-weight", w)}
                style={`font-weight:${parseInt(w)}`}
                class={`px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer font-mono ${
                  cur === w
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                    : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >{w}</button>
            {/each}
          </div>
        </div>

        <!-- Per-size editor — one rung at a time (parity with the per-heading
             typography editor). Retunes font-size / padding / min-height for a
             single rung; picking a rung also drives the live preview above. The
             flatten-all globals live in the All-tokens tab (Advanced group). -->
        <div>
          <div class="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Per-size ({activeBtnRung.toUpperCase()})</div>
          <div class="flex gap-0.5 mb-2 bg-black/5 dark:bg-white/5 rounded-lg p-0.5">
            {#each BTN_SIZE_RUNGS as rung (rung)}
              {@const touched = [`--sf-btn-${rung}-font-size`, `--sf-btn-${rung}-padding-block`, `--sf-btn-${rung}-padding-inline`, `--sf-btn-${rung}-min-height`].some((k) => k in overrides)}
              <button
                onclick={() => { activeBtnRung = rung; btnSize = rung; }}
                aria-pressed={activeBtnRung === rung}
                class={`relative flex-1 py-1 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer ${
                  activeBtnRung === rung
                    ? "bg-black/12 dark:bg-white/12 text-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {rung}
                {#if touched}<span class="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-indigo-400"></span>{/if}
              </button>
            {/each}
          </div>

          <!-- Label size for the active rung (text scale steps) -->
          <div class="mb-2">
            <div class="text-[9px] text-slate-500 mb-1">Label size — {activeFontToken}</div>
            <div class="flex flex-wrap gap-1">
              {#each TEXT_STEPS as step (step)}
                {@const cur = currentStep(activeFontToken, "text", TEXT_STEPS, activeFontDef)}
                <button
                  onclick={() => setStep(activeFontToken, "text", step, activeFontDef)}
                  aria-pressed={cur === step}
                  class={`px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                    cur === step
                      ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                      : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >{step}</button>
              {/each}
            </div>
          </div>

          <!-- Padding + min-height sliders for the active rung -->
          {#each (["pb", "pi", "mh"] as const) as prop (prop)}
            {@const r = rungRow(activeBtnRung, prop)}
            <SliderRow
              label={r.label} value={getVal(r)} min={r.min} max={r.max} step={r.step} unit={r.unit}
              help={r.token}
              overridden={r.token in overrides}
              onChange={(v) => onSet(r.token, `${v}${r.unit}`)}
              onReset={() => onReset(r.token)}
              rawDefault={r.rawDefault}
              variableOptions={r.variableOptions}
              currentRaw={overrides[r.token]}
              onRawSet={(v) => onSet(r.token, v)}
            />
          {/each}
        </div>

        {#if Object.keys(overrides).some((k) => k.startsWith("--sf-btn-"))}
          <button
            onclick={resetButtonTokens}
            class="text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline underline-offset-2 cursor-pointer"
          >Reset all button tokens</button>
        {/if}
      </div>
    {/if}
  </section>

  <div class="h-px bg-black/6 dark:bg-white/6"></div>

  <!-- CARD -->
  <section class="space-y-3">
    <button
      onclick={() => { showCard = !showCard; }}
      aria-expanded={showCard}
      class="w-full flex items-center justify-between cursor-pointer"
    >
      <div class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Card (.sf-card)</div>
      <span class="text-[10px] text-slate-500">{showCard ? "▲" : "▼"}</span>
    </button>
    {#if showCard}
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-1.5 text-[9px] text-slate-500 cursor-pointer">
          <input type="checkbox" bind:checked={cardBordered} class="cursor-pointer" /> bordered
        </label>
        <label class="flex items-center gap-1.5 text-[9px] text-slate-500 cursor-pointer">
          <input type="checkbox" bind:checked={cardElevated} class="cursor-pointer" /> elevated
        </label>
        <label class="flex items-center gap-1.5 text-[9px] text-slate-500 cursor-pointer">
          <input type="checkbox" bind:checked={cardInteractive} class="cursor-pointer" /> interactive
        </label>
      </div>

      <!-- Live preview — real .sf-card + subcomponents, realistic composition.
           data-theme: see the equivalent note on the button preview above —
           without it, this card's background and text tokens can resolve
           dark mode through different mechanisms and desync. -->
      <div class="bg-black/4 dark:bg-white/4 rounded-xl border border-black/8 dark:border-white/8 p-4 flex items-center justify-center" data-theme={themeState.value}>
        <article class={cardClass()} style="max-inline-size: 16rem;">
          <div class="sf-card__media" style="background: var(--sf-gradient-primary);"></div>
          <header class="sf-card__header">
            <h3 class="sf-card__title">Card title</h3>
          </header>
          <div class="sf-card__body">
            <p>Body copy showing padding, gap, and background live.</p>
          </div>
          <footer class="sf-card__footer">
            <button class="sf-btn sf-btn--primary">Action</button>
          </footer>
        </article>
      </div>

      <div class="mt-2 space-y-2">
        {#each CARD_TOKENS as t (t.token)}
          <SliderRow
            label={t.label} value={getVal(t)} min={t.min} max={t.max} step={t.step} unit={t.unit}
            help={t.token}
            overridden={t.token in overrides}
            onChange={(v) => onSet(t.token, `${v}${t.unit}`)}
            onReset={() => onReset(t.token)}
            rawDefault={t.rawDefault}
            variableOptions={t.variableOptions}
            currentRaw={overrides[t.token]}
            onRawSet={(v) => onSet(t.token, v)}
          />
        {/each}

        <div class="flex items-center gap-2 text-[10px] text-slate-500">
          <span class="font-semibold">Radius (outer, computed)</span>
          <span class="font-mono">{outerRadiusUnknown ? "depends on variable" : `${(cardRadius + cardPadding).toFixed(2)}rem`}</span>
        </div>
        <p class="text-[9px] text-slate-400 dark:text-slate-600 leading-relaxed">
          --sf-card-radius-outer = radius + padding (concentric math) — not independently overridable, always computed from the two sliders above.
        </p>

        <div>
          <div class="text-[9px] text-slate-500 mb-1">Background — --sf-card-bg</div>
          <div class="flex flex-wrap gap-1">
            {#each BG_PRESETS as p (p.step)}
              {@const cur = currentStep("--sf-card-bg", "color", BG_PRESETS.map(x => x.step), "surface")}
              <button
                onclick={() => setStep("--sf-card-bg", "color", p.step, "surface")}
                class={`px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                  cur === p.step
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                    : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >{p.label}</button>
            {/each}
          </div>
        </div>

        <div>
          <div class="text-[9px] text-slate-500 mb-1">Border color — --sf-card-border-color</div>
          <div class="flex flex-wrap gap-1">
            {#each BORDER_PRESETS as p (p.step)}
              {@const cur = currentStep("--sf-card-border-color", "color", BORDER_PRESETS.map(x => x.step), "border")}
              <button
                onclick={() => setStep("--sf-card-border-color", "color", p.step, "border")}
                class={`px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                  cur === p.step
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                    : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >{p.label}</button>
            {/each}
          </div>
        </div>

        <div>
          <div class="text-[9px] text-slate-500 mb-1">Shadow — --sf-card-shadow</div>
          <div class="flex flex-wrap gap-1">
            {#each SHADOW_STEPS as step (step)}
              {@const cur = currentStep("--sf-card-shadow", "shadow", SHADOW_STEPS, "s")}
              <button
                onclick={() => setStep("--sf-card-shadow", "shadow", step, "s")}
                class={`px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                  cur === step
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                    : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >{step}</button>
            {/each}
          </div>
        </div>

        <div>
          <div class="text-[9px] text-slate-500 mb-1">Elevated shadow — --sf-card-shadow--elevated</div>
          <div class="flex flex-wrap gap-1">
            {#each SHADOW_STEPS as step (step)}
              {@const cur = currentStep("--sf-card-shadow--elevated", "shadow", SHADOW_STEPS, "l")}
              <button
                onclick={() => setStep("--sf-card-shadow--elevated", "shadow", step, "l")}
                class={`px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                  cur === step
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                    : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >{step}</button>
            {/each}
          </div>
        </div>

        <div>
          <div class="text-[9px] text-slate-500 mb-1">Hover shadow (interactive) — --sf-card-shadow--hover</div>
          <div class="flex flex-wrap gap-1">
            {#each SHADOW_STEPS as step (step)}
              {@const cur = currentStep("--sf-card-shadow--hover", "shadow", SHADOW_STEPS, "l")}
              <button
                onclick={() => setStep("--sf-card-shadow--hover", "shadow", step, "l")}
                class={`px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                  cur === step
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                    : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >{step}</button>
            {/each}
          </div>
        </div>

        <div>
          <div class="text-[9px] text-slate-500 mb-1">Media aspect ratio — --sf-card-media-ratio</div>
          <div class="flex flex-wrap gap-1">
            {#each RATIO_STEPS as step (step)}
              {@const cur = currentStep("--sf-card-media-ratio", "ratio", RATIO_STEPS, "video")}
              <button
                onclick={() => setStep("--sf-card-media-ratio", "ratio", step, "video")}
                class={`px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                  cur === step
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                    : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >{step}</button>
            {/each}
          </div>
        </div>

        <div>
          <div class="text-[9px] text-slate-500 mb-1">Title size — --sf-card-heading-size</div>
          <div class="flex flex-wrap gap-1">
            {#each TEXT_STEPS as step (step)}
              {@const cur = currentStep("--sf-card-heading-size", "text", TEXT_STEPS, "xl")}
              <button
                onclick={() => setStep("--sf-card-heading-size", "text", step, "xl")}
                class={`px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                  cur === step
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                    : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >{step}</button>
            {/each}
          </div>
        </div>

        <div>
          <div class="text-[9px] text-slate-500 mb-1">Media object-fit — --sf-object-fit (global, affects all img/video)</div>
          <div class="flex flex-wrap gap-1">
            {#each ["cover", "contain"] as fit (fit)}
              {@const cur = overrides["--sf-object-fit"] ?? "cover"}
              <button
                onclick={() => fit === "cover" ? onReset("--sf-object-fit") : onSet("--sf-object-fit", fit)}
                class={`px-2 py-1 rounded-lg text-[10px] border transition-all cursor-pointer ${
                  cur === fit
                    ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-800 dark:text-indigo-200"
                    : "border-black/8 dark:border-white/8 text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >{fit}</button>
            {/each}
          </div>
        </div>
      </div>
    {/if}
  </section>
</div>
