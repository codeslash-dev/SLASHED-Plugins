<script>
  /**
   * Single text input bound to a token field.
   *
   * Used for free-form CSS values (font stacks, spacing aliases that
   * accept `var(--sf-space-l)` and friends). The placeholder is the
   * factory default so users see what the framework would emit if they
   * leave the field blank.
   */
  import { tokens, writeField } from '../lib/stores.svelte.js';
  import FieldRow from './FieldRow.svelte';

  let {
    section,
    fieldKey,
    label,
    default: defaultValue = '',
    cssVar = '',
    description = '',
    /** Render the input in a monospaced font for token-heavy values. */
    mono = false,
    /** Optional explicit width; defaults to a flexible regular-text size. */
    width = '320px',
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
    type="text"
    class="text"
    class:mono
    style:width
    spellcheck="false"
    value={stringValue}
    placeholder={String(defaultValue)}
    oninput={onInput}
  />
</FieldRow>

<style>
  .text.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  }
</style>
