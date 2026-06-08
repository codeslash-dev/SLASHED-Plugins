<script>
  /**
   * Two-column row used by every token field component.
   *
   * Visual + structural twin of the row layout inside ColorRow.svelte:
   * a fixed-width label column on the left (with optional --css-var
   * pill underneath) and a flexible input column on the right (with
   * optional description). Centralising the layout here keeps every
   * field component (RangeField / NumberField / TextField / SelectField)
   * a thin wrapper around its actual input markup — no per-field CSS
   * duplication, no per-tab table-style overrides leaking in.
   *
   * The input markup is provided by the caller via `children`, mirroring
   * the legacy `<th>label</th><td>...</td>` pattern but in flex/grid CSS
   * instead of nested tables.
   */

  let {
    /** Display label, e.g. "Contrast bias". */
    label,
    /** Optional CSS custom property name shown beneath the label as a hint. */
    cssVar = '',
    /** Optional id used both as the label's `for` and the input's `id`. */
    fieldId = '',
    /** Optional help text rendered beneath the input. */
    description = '',
    /** Render-prop: the actual input markup. */
    children,
  } = $props();
</script>

<div class="row">
  <div class="row__label">
    {#if fieldId}
      <label for={fieldId}>{label}</label>
    {:else}
      <span class="row__label-text">{label}</span>
    {/if}
    {#if cssVar}
      <code class="row__var">{cssVar}</code>
    {/if}
  </div>

  <div class="row__inputs">
    {@render children?.()}
    {#if description}
      <p class="row__desc">{description}</p>
    {/if}
  </div>
</div>

<style>
  .row {
    display: grid;
    grid-template-columns: 220px 1fr;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f1;
  }
  .row:last-child { border-bottom: none; }

  .row__label label,
  .row__label-text {
    font-weight: 500;
    display: block;
    color: #1d2327;
  }
  .row__var {
    display: inline-block;
    margin-top: 4px;
    background: #f6f7f7;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 11px;
    color: #50575e;
  }

  .row__inputs {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .row__desc {
    flex-basis: 100%;
    margin: 4px 0 0;
    color: #50575e;
    font-size: 12px;
  }
</style>
