<script>
  /**
   * Typography tab: font families, fluid font-size scale, and
   * scale multipliers.
   *
   * Iteration over `meta.defaults.typography.font_families` /
   * `font_sizes` keeps the field list driven by PHP defaults so adding
   * a new family or step doesn't require touching this component.
   *
   * Basic: body + heading families and a live preview.
   * Advanced: additional families, the full fluid font-size scale
   *           (generator + per-step overrides), and scale multipliers.
   *
   * Storage convention (matches the legacy form):
   *   - font families:  font_<name>          (e.g. font_body)
   *   - font sizes:     size_<name>_min/max  (e.g. size_2xs_min)
   *   - scale knobs:    text_scale, text_display_scale
   */
  import { meta } from '../lib/stores.svelte.js';
  import TextField from './TextField.svelte';
  import FontFamilyField from './FontFamilyField.svelte';
  import NumberField from './NumberField.svelte';
  import TypographyPreview from './TypographyPreview.svelte';
  import AdvancedSection from './AdvancedSection.svelte';
  import ScaleGenerator from './ScaleGenerator.svelte';

  const SECTION = 'typography';
  const defaults = meta.defaults?.[SECTION] ?? {};
  const families = defaults.font_families ?? {};
  const sizes = defaults.font_sizes ?? {};

  /** ucfirst() helper, mirrors the legacy label munging. */
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  /** Basic families: body and heading only. */
  const basicFamilyKeys = ['body', 'heading'];
  const basicFamilies = Object.fromEntries(
    Object.entries(families).filter(([name]) => basicFamilyKeys.includes(name))
  );

  /** Advanced families: everything except body and heading. */
  const advancedFamilies = Object.fromEntries(
    Object.entries(families).filter(([name]) => !basicFamilyKeys.includes(name))
  );
</script>

<section>
  <h2>Font Families</h2>
  <div class="rows">
    {#each Object.entries(basicFamilies) as [name, defaultStack] (name)}
      <FontFamilyField
        section={SECTION}
        fieldKey={`font_${name}`}
        label={cap(name)}
        default={defaultStack}
        cssVar={`--sf-font-${name}`}
      />
    {/each}
  </div>

  <TypographyPreview />

  <AdvancedSection>
    <h2 class="group-heading">Additional Font Families</h2>
    <div class="rows">
      {#each Object.entries(advancedFamilies) as [name, defaultStack] (name)}
        <FontFamilyField
          section={SECTION}
          fieldKey={`font_${name}`}
          label={cap(name)}
          default={defaultStack}
          cssVar={`--sf-font-${name}`}
        />
      {/each}
    </div>

    <h2 class="group-heading">Font Size Scale</h2>
    <p class="hint">
      Min and max values in <code>rem</code> for fluid type scaling via <code>clamp()</code>.
      Leave both fields blank to use the framework defaults. The viewport range these
      sizes interpolate across (and the range the Live Scale Preview above scrubs) is the
      <strong>Fluid Scale Viewport Range</strong> set in the <strong>Spacing</strong> tab —
      it's the shared source for both spacing and typography.
    </p>
    <ScaleGenerator />
    <div class="rows">
      {#each Object.entries(sizes) as [name, sizeDefaults] (name)}
        <div class="size-row">
          <div class="size-row__label">
            <span class="size-row__name">{name}</span>
            <code class="size-row__var">--sf-text-{name}</code>
          </div>
          <div class="size-row__inputs">
            <NumberField
              section={SECTION}
              fieldKey={`size_${name}_min`}
              label="Min"
              min={0}
              step={0.01}
              default={sizeDefaults.min}
              width="80px"
            />
            <NumberField
              section={SECTION}
              fieldKey={`size_${name}_max`}
              label="Max"
              min={0}
              step={0.01}
              default={sizeDefaults.max}
              width="80px"
            />
          </div>
        </div>
      {/each}
    </div>

    <h2 class="group-heading">Scale Multipliers</h2>
    <div class="rows">
      <NumberField
        section={SECTION}
        fieldKey="text_scale"
        label="Text Scale"
        min={0}
        step={0.05}
        default={defaults.scale_multipliers?.text_scale ?? 1}
        cssVar="--sf-text-scale"
      />
      <NumberField
        section={SECTION}
        fieldKey="text_display_scale"
        label="Display Scale"
        min={0}
        step={0.05}
        default={defaults.scale_multipliers?.text_display_scale ?? 1}
        cssVar="--sf-text-display-scale"
      />
    </div>
  </AdvancedSection>
</section>

<style>
  h2 { margin-top: 0; }
  .group-heading { margin-top: 24px; }
  .hint { color: #50575e; margin-bottom: 16px; max-width: 720px; }
  .hint code {
    background: #f0f0f1;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 90%;
  }
  .rows {
    border: 1px solid #f0f0f1;
    border-radius: 4px;
    padding: 0 12px;
    background: #fcfcfd;
  }
  /* Compact paired layout for font-size rows so each scale step stays
     on a single line with two narrow numeric inputs. */
  .size-row {
    display: grid;
    grid-template-columns: 220px 1fr;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid #f0f0f1;
  }
  .size-row:last-child { border-bottom: none; }
  .size-row__name {
    font-weight: 500;
    color: #1d2327;
    display: block;
  }
  .size-row__var {
    display: inline-block;
    margin-top: 4px;
    background: #f6f7f7;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 11px;
    color: #50575e;
  }
  .size-row__inputs {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }
  /* The wrapped NumberFields each render their own FieldRow with a
     220px label column, which is overkill inside the size-row's
     right column. Override the inner grid so Min/Max sit inline. */
  .size-row__inputs :global(.row) {
    display: flex !important;
    grid-template-columns: none;
    gap: 6px;
    padding: 0;
    border: none;
    align-items: center;
  }
  .size-row__inputs :global(.row__label-text),
  .size-row__inputs :global(.row__label label) {
    font-weight: 400;
    color: #50575e;
    font-size: 12px;
  }
</style>
