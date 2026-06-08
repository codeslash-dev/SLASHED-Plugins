<script>
  /**
   * Single number input bound to a token field.
   *
   * Used for fields where a slider doesn't fit (open-ended scales like
   * `text_scale`, integer z-index values, ms-typed durations). The
   * input renders unbounded by default; pass `min` / `max` / `step` to
   * narrow it. Empty input drops the override via `writeField`.
   */
  import { tokens, writeField } from '../lib/stores.svelte.js';
  import FieldRow from './FieldRow.svelte';

  let {
    section,
    fieldKey,
    label,
    /** Optional bounds + step. */
    min = undefined,
    max = undefined,
    step = undefined,
    /** Factory default; used as placeholder. */
    default: defaultValue = '',
    cssVar = '',
    unit = '',
    description = '',
    /** Optional render width override; some fields are visually wider. */
    width = '120px',
  } = $props();

  const stringValue = $derived(
    tokens[section]?.[fieldKey] === undefined || tokens[section]?.[fieldKey] === null
      ? ''
      : String(tokens[section][fieldKey])
  );

  /** @param {Event & { currentTarget: HTMLInputElement }} e */
  function onInput(e) {
    writeField(section, fieldKey, e.currentTarget.value);
  }
</script>

<FieldRow {label} {cssVar} fieldId={fieldKey} {description}>
  <input
    id={fieldKey}
    type="number"
    class="number"
    style:width
    {min}
    {max}
    {step}
    value={stringValue}
    placeholder={String(defaultValue)}
    oninput={onInput}
  />
  {#if unit}
    <span class="unit">{unit}</span>
  {/if}
</FieldRow>

<style>
  .number { /* width set inline via style:width */ }
  .unit {
    color: #50575e;
    font-size: 12px;
  }
</style>
