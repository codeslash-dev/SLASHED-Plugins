<script>
  /**
   * Paired range slider + number input bound to a single token field.
   *
   * UX contract:
   *   - the number input is the canonical control (carries the value),
   *   - the range slider is a visual nudge with `aria-hidden`/`tabindex=-1`
   *     so it doesn't double up in the AT tree,
   *   - empty number = "no override"; the slider then snaps to the
   *     factory default so users see what they'd get without an override.
   *
   * All persistence goes through `writeField(section, fieldKey, value)`,
   * which lazily creates the section, deletes empty values to drop the
   * override, and marks the form dirty.
   */
  import { tokens, writeField } from '../lib/stores.svelte.js';
  import FieldRow from './FieldRow.svelte';

  let {
    /** Section slug (top-level key in `tokens`), e.g. "contrast". */
    section,
    /** Field key within the section, e.g. "contrast_bias". */
    fieldKey,
    /** Display label. */
    label,
    /** Min / max / step for both the slider and number input. */
    min,
    max,
    step,
    /** Factory default; used as placeholder + slider fallback when empty. */
    default: defaultValue,
    /** Underlying CSS custom property name shown as a hint. */
    cssVar = '',
    /** Optional unit suffix rendered after the number input (e.g. "px", "ms"). */
    unit = '',
    /** Optional help text shown beneath the inputs. */
    description = '',
  } = $props();

  /**
   * Reactive view of the stored value as a string so it can drive both
   * the controlled number input and the placeholder logic. Empty when
   * no override is set; mirrors the legacy `<input value="">` behaviour.
   */
  const stringValue = $derived(
    tokens[section]?.[fieldKey] === undefined || tokens[section]?.[fieldKey] === null
      ? ''
      : String(tokens[section][fieldKey])
  );

  /**
   * Numeric value the slider should display. Falls back to the factory
   * default when the field is empty so the slider visually represents
   * what the framework would render.
   */
  const sliderValue = $derived(
    stringValue === '' || Number.isNaN(Number(stringValue))
      ? Number(defaultValue)
      : Number(stringValue)
  );

  /** @param {Event & { currentTarget: HTMLInputElement }} e */
  function onSliderInput(e) {
    writeField(section, fieldKey, e.currentTarget.value);
  }

  /** @param {Event & { currentTarget: HTMLInputElement }} e */
  function onNumberInput(e) {
    writeField(section, fieldKey, e.currentTarget.value);
  }
</script>

<FieldRow {label} {cssVar} fieldId={fieldKey} {description}>
  <input
    type="range"
    class="range"
    {min}
    {max}
    {step}
    value={sliderValue}
    oninput={onSliderInput}
    aria-hidden="true"
    tabindex="-1"
  />
  <input
    id={fieldKey}
    type="number"
    class="number"
    {min}
    {max}
    {step}
    value={stringValue}
    placeholder={String(defaultValue)}
    oninput={onNumberInput}
  />
  {#if unit}
    <span class="unit">{unit}</span>
  {/if}
</FieldRow>

<style>
  .range {
    flex: 1;
    min-width: 160px;
    max-width: 320px;
    accent-color: #2271b1;
  }
  .number {
    width: 90px;
  }
  .unit {
    color: #50575e;
    font-size: 12px;
  }
</style>
