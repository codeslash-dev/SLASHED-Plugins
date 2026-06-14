<script>
  /**
   * Quick Knobs — the headline DX win.
   *
   * Each "knob" is a single framework token whose value cascades through a
   * large number of derived tokens (e.g. `--sf-space-scale=1.2` shifts 45
   * spacing variables at once). Surfacing them as slider+number combos at
   * the top of the relevant domain means the most powerful adjustment is
   * always one drag away — no scrolling through the catalogue.
   *
   * Behaviour:
   *  • slider drags update the override live, but a single history checkpoint
   *    is taken on `change` (drag end), not on every `input` tick — so undo
   *    rewinds the whole drag, not 200 micro-edits;
   *  • a "Reset" affordance per knob restores the framework default;
   *  • a "Reset all" button clears every knob in this panel in one history
   *    step (via patchOverrides);
   *  • the framework-default value is always shown next to the live value,
   *    so users always know what they're moving away from.
   *
   * @prop {Array<{
   *   name: string,
   *   label: string,
   *   help?: string,
   *   default: number|string,
   *   min: number,
   *   max: number,
   *   step: number,
   *   unit?: string,
   *   driving?: number, // optional 'this knob drives N tokens' hint
   * }>} knobs
   */
  import { overrides, setOverride, patchOverrides, dragSetOverride, endDrag } from '../lib/store.svelte.js';
  import { tokenByName } from '../lib/model.js';

  let { knobs = [], title = 'Quick knobs', blurb = '' } = $props();

  // Filter to knobs whose token is actually in the catalogue (defensive).
  const activeKnobs = $derived(knobs.filter((k) => tokenByName.has(k.name)));

  /** Live numeric value for a knob, falling back to the framework default. */
  function liveValue(knob) {
    const raw = overrides[knob.name];
    if (raw == null) return knob.default;
    // Use a knob-specific decoder when available (e.g. extracting the base
    // number from a calc() expression that wraps it with dark-mode logic).
    if (knob.decode) {
      const decoded = knob.decode(raw);
      if (Number.isFinite(decoded)) return decoded;
    }
    // The override may be a calc()/clamp() expression a user typed by hand —
    // fall back to a numeric parse, otherwise show the default for the slider
    // (the slider can't represent arbitrary expressions, so a hand-edited
    // value gracefully reads as the default position).
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : knob.default;
  }

  /** Whether the live value differs from the framework default. */
  function isModified(knob) {
    return overrides[knob.name] != null;
  }

  /** Format a value for display next to the slider. */
  function fmt(v, unit = '') {
    if (typeof v !== 'number' || !Number.isFinite(v)) return String(v ?? '');
    const out = parseFloat(v.toFixed(4));
    return unit ? `${out}${unit}` : String(out);
  }

  /**
   * Slider-tick handler. Uses `dragSetOverride` so the preview / contrast
   * badges / slider track update live, but no history entry is pushed and
   * no localStorage write happens — both are flushed once on `change` (drag
   * end) via `endDrag`. So a 200-tick drag becomes one undo step + one
   * persist instead of 200 of each.
   *
   * When a knob has an `encode` function the raw number is wrapped into its
   * CSS expression (e.g. preserving a calc() dark-mode adaptation) before
   * being stored.
   */
  function dragCommit(knob, val) {
    if (Number.isFinite(val)) {
      const css = knob.encode ? knob.encode(val) : String(val);
      dragSetOverride(knob.name, css);
    }
  }

  /** Drag-end (mouse release / keyboard commit): record the history entry. */
  function flush() { endDrag(); }

  function resetKnob(knob) {
    if (!isModified(knob)) return;
    setOverride(knob.name, '');
  }

  /** One-click reset for every knob in this panel. */
  function resetAll() {
    const patch = {};
    for (const k of activeKnobs) if (isModified(k)) patch[k.name] = null;
    if (Object.keys(patch).length) patchOverrides(patch);
  }

  // ── slider step / decimals helper for the displayed value ────────────────
  function decimalsFor(step) {
    const s = String(step);
    const dot = s.indexOf('.');
    return dot === -1 ? 0 : s.length - dot - 1;
  }

  /** Filled-track percentage used by the CSS background gradient. */
  function sliderPercent(knob, val) {
    const range = knob.max - knob.min;
    if (!Number.isFinite(range) || range <= 0) return 0;
    const pct = ((val - knob.min) / range) * 100;
    return Math.max(0, Math.min(100, pct));
  }
</script>

{#if activeKnobs.length}
  <section class="cfg-card knobs">
    <header class="knobs__head">
      <div class="knobs__title-wrap">
        <span class="knobs__title">{title}</span>
        {#if blurb}<span class="knobs__blurb">{blurb}</span>{/if}
      </div>
      <button
        type="button"
        class="cfg-btn cfg-btn--sm cfg-btn--ghost"
        onclick={resetAll}
        disabled={!activeKnobs.some(isModified)}
        title="Reset every knob in this panel to its framework default"
      >Reset all</button>
    </header>

    <div class="knobs__list">
      {#each activeKnobs as knob (knob.name)}
        {@const val = liveValue(knob)}
        {@const decimals = decimalsFor(knob.step)}
        <div class="knob" class:knob--mod={isModified(knob)}>
          <div class="knob__label">
            <code class="knob__name">{knob.label}</code>
            {#if knob.driving}
              <span class="knob__drives" title="{knob.driving} derived tokens follow this knob">
                drives {knob.driving}
              </span>
            {/if}
            {#if knob.help}
              <span class="knob__help" title={knob.help} aria-label={knob.help}>?</span>
            {/if}
          </div>

          <input
            class="knob__slider"
            type="range"
            min={knob.min}
            max={knob.max}
            step={knob.step}
            value={val}
            style:--p="{sliderPercent(knob, val)}%"
            aria-label="{knob.label} slider"
            oninput={(e) => dragCommit(knob, parseFloat(e.currentTarget.value))}
            onchange={flush}
          />

          <div class="knob__numeric">
            <input
              class="cfg-input cfg-input--mono knob__num"
              type="number"
              min={knob.min}
              max={knob.max}
              step={knob.step}
              value={Number.isFinite(val) ? Number(val).toFixed(decimals) : ''}
              aria-label="{knob.label} numeric value"
              oninput={(e) => dragCommit(knob, parseFloat(e.currentTarget.value))}
              onchange={flush}
              onblur={flush}
            />
            {#if knob.unit}<span class="knob__unit">{knob.unit}</span>{/if}
          </div>

          <div class="knob__meta">
            <span class="knob__default" title="Framework default">
              default <code>{fmt(knob.default, knob.unit ?? '')}</code>
            </span>
            <button
              type="button"
              class="cfg-btn cfg-btn--ghost cfg-btn--icon knob__reset"
              onclick={() => resetKnob(knob)}
              disabled={!isModified(knob)}
              title="Reset this knob"
              aria-label="Reset {knob.label}"
            >⟲</button>
          </div>
        </div>
      {/each}
    </div>
  </section>
{/if}

<style>
  .knobs { overflow: clip; }
  .knobs__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--cfg-border);
    background: linear-gradient(to right, rgba(79, 140, 255, 0.06), transparent 70%), var(--cfg-surface-2);
  }
  .knobs__title-wrap { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .knobs__title {
    font-size: 12.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--cfg-text);
  }
  .knobs__blurb { font-size: 12px; color: var(--cfg-text-muted); }

  .knobs__list {
    display: flex;
    flex-direction: column;
  }
  .knob {
    display: grid;
    grid-template-columns: minmax(160px, 220px) minmax(0, 1fr) minmax(110px, 150px) auto;
    gap: 12px;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid var(--cfg-border);
    transition: background 0.12s;
  }
  .knob:last-child { border-bottom: none; }
  .knob:hover { background: rgba(255, 255, 255, 0.02); }
  .knob--mod {
    background: linear-gradient(90deg, rgba(79, 140, 255, 0.08), transparent 60%);
    box-shadow: inset 3px 0 0 var(--cfg-accent-strong);
  }
  .knob--mod:hover { background: linear-gradient(90deg, rgba(79, 140, 255, 0.12), transparent 60%); }

  .knob__label {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    min-width: 0;
  }
  .knob__name {
    font-family: var(--cfg-mono);
    font-size: 12px;
    color: var(--cfg-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .knob__drives {
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--cfg-accent);
    background: var(--cfg-accent-soft);
    border-radius: 999px;
    padding: 1px 7px;
    line-height: 1.6;
    white-space: nowrap;
  }
  .knob__help {
    display: inline-grid;
    place-items: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--cfg-surface-3);
    border: 1px solid var(--cfg-border);
    color: var(--cfg-text-muted);
    font-size: 10px;
    font-weight: 700;
    cursor: help;
  }

  .knob__slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(to right, var(--cfg-accent-strong), var(--cfg-accent-strong)) 0/var(--p, 50%) no-repeat,
                var(--cfg-surface-3);
    cursor: pointer;
    border: none;
    outline: none;
  }
  .knob__slider:focus-visible { box-shadow: 0 0 0 3px var(--cfg-accent-soft); }
  .knob__slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid var(--cfg-accent-strong);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    cursor: pointer;
  }
  .knob__slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid var(--cfg-accent-strong);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    cursor: pointer;
  }

  .knob__numeric {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .knob__num { width: 100%; text-align: right; }
  .knob__unit {
    font-family: var(--cfg-mono);
    font-size: 11px;
    color: var(--cfg-text-faint);
    min-width: 18px;
  }

  .knob__meta {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .knob__default {
    font-size: 11px;
    color: var(--cfg-text-faint);
  }
  .knob__default code {
    font-family: var(--cfg-mono);
    color: var(--cfg-text-muted);
  }
  .knob__reset { font-size: 14px; line-height: 1; }

  @media (max-width: 900px) {
    .knob {
      grid-template-columns: 1fr;
      gap: 6px;
      padding: 12px 16px;
    }
    .knob__label { order: 1; }
    .knob__slider { order: 2; }
    .knob__numeric { order: 3; }
    .knob__meta { order: 4; justify-content: space-between; }
  }
</style>
