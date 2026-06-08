<script>
  /**
   * Labeled select bound to a token field.
   *
   * Options can be plain strings (used as both value + label) or
   * `{ value, label }` objects when the display string differs from
   * the stored value. The default option is auto-prepended with the
   * label "Default (<defaultValue>)" — same wording the legacy PHP
   * `<option>` row used so users see exactly what the framework would
   * fall back to.
   */
  import { tokens, writeField } from '../lib/stores.svelte.js';
  import FieldRow from './FieldRow.svelte';

  let {
    section,
    fieldKey,
    label,
    /** Array of strings or {value, label} objects. */
    options = [],
    /** Factory default value (also used as the empty-option hint). */
    default: defaultValue = '',
    cssVar = '',
    description = '',
  } = $props();

  /** Normalise options to a uniform `{value, label}` shape for the loop. */
  const normalized = $derived(
    options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  );

  const stringValue = $derived(
    tokens[section]?.[fieldKey] === undefined || tokens[section]?.[fieldKey] === null
      ? ''
      : String(tokens[section][fieldKey])
  );

  /** @param {Event & { currentTarget: HTMLSelectElement }} e */
  function onChange(e) {
    writeField(section, fieldKey, e.currentTarget.value);
  }
</script>

<FieldRow {label} {cssVar} fieldId={fieldKey} {description}>
  <select id={fieldKey} class="select" value={stringValue} onchange={onChange}>
    <option value="">Default ({defaultValue})</option>
    {#each normalized as opt (opt.value)}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
</FieldRow>

<style>
  .select { min-width: 160px; }
</style>
