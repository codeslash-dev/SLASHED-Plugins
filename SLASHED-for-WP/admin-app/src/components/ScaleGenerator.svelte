<script>
  /**
   * Scales view: tune the fluid modular scale of the type, display or space
   * ramp. The framework derives every step LIVE from a handful of engine
   * scalars (base min/max, ratio min/max, shared viewport range — see
   * lib/fluidEngine.js), so Apply writes those scalars in one history step:
   * the export stays a few numbers instead of nine clamp() walls, and the
   * engine remains live for later tweaks.
   *
   * Fallback: if a scalar token is missing from the active catalogue (an
   * older framework sync), Apply falls back to writing per-step clamp()
   * expressions — the same fluid curve, just baked.
   *
   * The scale maths (modular steps + clamp curve) lives in the shared,
   * unit-tested ../lib/scale.js, identical to the WP plugin's generator. The
   * DISPLAY ramp (--sf-text-display-{s,m,l}) is defined locally here — exactly
   * as the plugin defines its display steps in-component — so the parity
   * scale.js stays byte-for-byte identical across both repos.
   *
   * @prop {Array<'type'|'display'|'space'>} [kinds] which ramps to expose
   *   (defaults to all three). Lets the Typography tab show type+display and the
   *   Spacing tab show only space.
   */
  import { overrides, setOverride, clearOverride, patchOverrides } from '../lib/store.svelte.js';
  import { tokenByName } from '../lib/model.js';
  import { RATIOS, TEXT_STEPS, SPACE_STEPS, computeScale, buildClamp } from '../lib/scale.js';
  import {
    ENGINES,
    VIEWPORT_SCALARS,
    engineTokens,
    buildEnginePatch,
    resetEnginePatch,
    resetViewportPatch,
  } from '../lib/fluidEngine.js';

  let { kinds = ['type', 'display', 'space'] } = $props();

  /**
   * The framework's display ramp: --sf-text-display-{s,m,l}, a separate modular
   * scale (base 2.4–3rem) sharing the text ratio, with display-s at index 0.
   * Mirrors core/tokens.css (`--sf-text-display-s|m|l`).
   */
  const DISPLAY_STEPS = [
    { name: 'display-s', idx: 0 },
    { name: 'display-m', idx: 1 },
    { name: 'display-l', idx: 2 },
  ];

  const KIND_LABELS = { type: 'Type', display: 'Display', space: 'Space' };

  /** Numeric seed for one engine scalar: active override if any, else the
   *  framework default — so the generator always opens on the LIVE scale. */
  function seedScalar(scalar) {
    const raw = overrides[scalar.token];
    const parsed = raw != null ? parseFloat(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : scalar.default;
  }

  /** All six knob seeds for a ramp (display borrows the type ratios). */
  function seedKnobs(k) {
    const e = ENGINES[k] || ENGINES.type;
    const ratios = e.sharedRatios ? ENGINES.type.scalars : e.scalars;
    return {
      baseMin: seedScalar(e.scalars.baseMin),
      baseMax: seedScalar(e.scalars.baseMax),
      ratioMin: seedScalar(ratios.ratioMin),
      ratioMax: seedScalar(ratios.ratioMax),
      vpMin: seedScalar(VIEWPORT_SCALARS.vpMin),
      vpMax: seedScalar(VIEWPORT_SCALARS.vpMax),
    };
  }

  // `kinds` is fixed for the lifetime of an instance (the panel re-mounts the
  // generator via {#key} when the domain changes), so capturing the first ramp
  // and its seeds as plain consts is correct — and keeps the $state
  // initializers from referencing reactive props.
  // svelte-ignore state_referenced_locally
  const FIRST = (kinds && kinds[0]) || 'type';
  const SEED = seedKnobs(FIRST);

  let kind = $state(FIRST);

  const steps = $derived(
    kind === 'type' ? TEXT_STEPS : kind === 'display' ? DISPLAY_STEPS : SPACE_STEPS
  );
  const prefix = $derived(
    kind === 'space' ? '--sf-space-' : '--sf-text-'
  );

  // The display ramp reuses the TYPE ratios — its ratio knobs are read-only.
  const sharedRatios = $derived(Boolean(ENGINES[kind]?.sharedRatios));

  // Scalar-writing only works when every engine token is in the catalogue.
  const engineLive = $derived(engineTokens(kind).every((t) => tokenByName.has(t)));

  // Knobs — seeded from the live overrides/defaults, reseeded per kind switch.
  let baseMin = $state(SEED.baseMin);
  let baseMax = $state(SEED.baseMax);
  let ratioMin = $state(SEED.ratioMin);
  let ratioMax = $state(SEED.ratioMax);
  let vpMin = $state(SEED.vpMin);
  let vpMax = $state(SEED.vpMax);

  function reseed(k) {
    const s = seedKnobs(k);
    baseMin = s.baseMin;
    baseMax = s.baseMax;
    ratioMin = s.ratioMin;
    ratioMax = s.ratioMax;
    vpMin = s.vpMin;
    vpMax = s.vpMax;
  }

  function switchKind(next) {
    if (next === kind) return;
    kind = next;
    reseed(next);
  }

  // The shared viewport range is currently customised (any ramp may have
  // set it) — surfaces the dedicated reset affordance.
  const viewportModified = $derived(
    overrides[VIEWPORT_SCALARS.vpMin.token] != null ||
    overrides[VIEWPORT_SCALARS.vpMax.token] != null
  );

  const computed = $derived(
    computeScale(steps, { baseMin, baseMax, ratioMin, ratioMax }).map((s) => ({
      ...s,
      token: `${prefix}${s.name}`,
      clamp: buildClamp(s.min, s.max, vpMin, vpMax),
    }))
  );

  // Only steps whose token actually exists in the catalogue can be applied.
  const applicable = $derived(computed.filter((s) => tokenByName.has(s.token)));
  const missing = $derived(computed.length - applicable.length);

  let applied = $state(false);
  function apply() {
    if (engineLive) {
      // One history step: write the engine scalars (default values are
      // cleared, not written) and null this ramp's per-step tokens so a
      // previously baked clamp() can't mask the live derivation.
      patchOverrides(buildEnginePatch(kind, { baseMin, baseMax, ratioMin, ratioMax, vpMin, vpMax }));
    } else {
      // Catalogue without the engine scalars — bake per-step clamp()s.
      for (const s of applicable) setOverride(s.token, s.clamp);
    }
    applied = true;
    setTimeout(() => (applied = false), 1800);
  }

  function reset() {
    if (engineLive) {
      patchOverrides(resetEnginePatch(kind));
    } else {
      for (const s of computed) if (overrides[s.token] != null) clearOverride(s.token);
    }
    reseed(kind);
  }

  function resetViewport() {
    patchOverrides(resetViewportPatch());
    reseed(kind);
  }
</script>

<section class="card">
  {#if kinds.length > 1}
    <div class="seg" role="group" aria-label="Scale kind">
      {#each kinds as k (k)}
        <button
          class="seg__btn"
          class:seg__btn--on={kind === k}
          aria-pressed={kind === k}
          onclick={() => switchKind(k)}
        >{KIND_LABELS[k] ?? k}</button>
      {/each}
    </div>
  {/if}

  <div class="controls">
    <label class="ctl"><span>Base min</span><span class="ctl__in"><input type="number" min="0.1" step="0.01" bind:value={baseMin} /><i>rem</i></span></label>
    <label class="ctl"><span>Base max</span><span class="ctl__in"><input type="number" min="0.1" step="0.01" bind:value={baseMax} /><i>rem</i></span></label>
    <label class="ctl"><span>Ratio (min)</span>
      <select bind:value={ratioMin} disabled={sharedRatios} title={sharedRatios ? 'Shared with the type scale — tune it on the Type tab' : undefined}>{#each RATIOS as r (r.value)}<option value={r.value}>{r.label}</option>{/each}</select>
    </label>
    <label class="ctl"><span>Ratio (max)</span>
      <select bind:value={ratioMax} disabled={sharedRatios} title={sharedRatios ? 'Shared with the type scale — tune it on the Type tab' : undefined}>{#each RATIOS as r (r.value)}<option value={r.value}>{r.label}</option>{/each}</select>
    </label>
    <label class="ctl"><span>Viewport min</span><span class="ctl__in"><input type="number" min="1" step="0.5" bind:value={vpMin} /><i>rem</i></span></label>
    <label class="ctl"><span>Viewport max</span><span class="ctl__in"><input type="number" min="1" step="0.5" bind:value={vpMax} /><i>rem</i></span></label>
  </div>

  {#if sharedRatios}
    <p class="scales__hint">The display ramp reuses the type scale's ratios — only its base sizes are written here.</p>
  {/if}
  {#if engineLive}
    <p class="scales__hint">Viewport range is <strong>shared by every fluid scale</strong> (type, display, space, header height) — change it once, everything follows.</p>
  {/if}

  <div class="preview">
    {#each computed as s (s.token)}
      <div class="preview__row" class:preview__row--missing={!tokenByName.has(s.token)}>
        <code class="preview__token">{s.token}</code>
        <span class="preview__sample" style="font-size: {kind === 'space' ? '1rem' : s.clamp}">
          {#if kind === 'space'}<span class="preview__bar" style="inline-size: {s.clamp}"></span>{:else}Ag{/if}
        </span>
        <code class="preview__clamp">{s.clamp}</code>
      </div>
    {/each}
  </div>

  <div class="scales__actions">
    <button class="cfg-btn cfg-btn--primary" onclick={apply} disabled={!engineLive && applicable.length === 0}>
      {#if applied}Applied ✓
      {:else if engineLive}Apply scale
      {:else}Apply {applicable.length} step{applicable.length === 1 ? '' : 's'}{/if}
    </button>
    <button class="cfg-btn cfg-btn--ghost" onclick={reset} title="Return this ramp to the framework default">Reset these</button>
    {#if viewportModified}
      <button class="cfg-btn cfg-btn--ghost" onclick={resetViewport} title="Clear the shared viewport range override (affects every fluid scale)">Reset viewport range</button>
    {/if}
    {#if engineLive}
      <span class="scales__note">Writes the live engine scalars — a few numbers in your export, never clamp() walls.</span>
    {:else if missing > 0}
      <span class="scales__note">{missing} step(s) not in this catalogue — skipped.</span>
    {/if}
  </div>
</section>

<style>
  .card { background: var(--cfg-surface); border: 1px solid var(--cfg-border); border-radius: var(--cfg-radius); padding: 16px; }

  .seg { display: inline-flex; border: 1px solid var(--cfg-border-strong); border-radius: var(--cfg-radius-s); overflow: hidden; margin-bottom: 16px; }
  .seg__btn { background: var(--cfg-surface-2); color: var(--cfg-text-muted); border: none; padding: 6px 16px; font-size: 13px; }
  .seg__btn--on { background: var(--cfg-accent-strong); color: #fff; }

  .controls { display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 16px; }
  .ctl { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: var(--cfg-text-muted); }
  .ctl__in { display: flex; align-items: center; gap: 5px; }
  .ctl__in i { font-style: normal; font-size: 11px; color: var(--cfg-text-faint); }
  .ctl input { width: 84px; background: var(--cfg-bg); color: var(--cfg-text); border: 1px solid var(--cfg-border-strong); border-radius: var(--cfg-radius-s); padding: 6px 8px; }
  .ctl select { background: var(--cfg-bg); color: var(--cfg-text); border: 1px solid var(--cfg-border-strong); border-radius: var(--cfg-radius-s); padding: 6px 8px; font-size: 12px; }

  .preview { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; border-top: 1px solid var(--cfg-border); padding-top: 12px; }
  .preview__row { display: grid; grid-template-columns: 16ch 1fr minmax(0, 32ch); gap: 12px; align-items: center; }
  .preview__row--missing { opacity: 0.4; }
  .preview__token { font-family: var(--cfg-mono); font-size: 11.5px; color: var(--cfg-text-muted); }
  .preview__sample { color: var(--cfg-text); line-height: 1; display: flex; align-items: center; overflow: hidden; max-block-size: 3rem; }
  .preview__bar { block-size: 12px; background: var(--cfg-accent-strong); border-radius: 3px; max-inline-size: 100%; }
  .preview__clamp { font-family: var(--cfg-mono); font-size: 11px; color: var(--cfg-text-faint); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  @media (max-width: 600px) {
    .preview__row { grid-template-columns: minmax(0, 15ch) minmax(0, 1fr); gap: 8px; }
    .preview__sample { display: none; }
    .preview__clamp { white-space: normal; overflow-wrap: break-word; text-overflow: clip; }
  }

  .scales__actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .scales__note { font-size: 12px; color: var(--cfg-text-faint); }
  .scales__hint { margin: 0 0 12px; font-size: 12px; line-height: 1.5; color: var(--cfg-text-muted); }
  .ctl select:disabled { opacity: 0.55; cursor: not-allowed; }
</style>
