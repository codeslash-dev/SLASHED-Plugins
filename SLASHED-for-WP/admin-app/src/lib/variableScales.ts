/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sibling-scale option lists for SliderRow's variable picker.
 *
 * Many dimension tokens default to *another* token (e.g. `--sf-gap: var(--sf-space-m)`).
 * When a knob's default is itself a variable, the configurator should offer the
 * sibling steps of that scale as a dropdown instead of silently resolving to a
 * bare number — see SliderRow.svelte's `variableOptions` prop.
 */

export interface VarOption {
  label: string;
  value: string;
}

function scale(prefix: string, steps: string[]): VarOption[] {
  return steps.map((s) => ({ label: `${prefix}-${s}`, value: `var(--sf-${prefix}-${s})` }));
}

export const SPACE_SCALE: VarOption[] = scale("space", [
  "2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl",
]);

export const RADIUS_SCALE: VarOption[] = scale("radius", [
  "2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl", "full",
]);

export const BORDER_WIDTH_SCALE: VarOption[] = scale("border-width", ["1", "2", "3", "4"]);

export const CONTAINER_SCALE: VarOption[] = scale("container", [
  "narrow", "prose", "default", "wide", "full",
]);

export const SIZE_SCALE: VarOption[] = scale("size", ["xs", "s", "m", "l", "xl"]);

export const SHADOW_SCALE: VarOption[] = scale("shadow", ["xs", "s", "m", "l", "xl"]);

/**
 * Map a token's default value (e.g. `var(--sf-space-m)`) to the sibling scale
 * it draws from, so generic editors can offer that scale as a dropdown by
 * default. Returns null when the value doesn't reference a known scale.
 */
export function scaleForValue(value: string | null | undefined): VarOption[] | null {
  if (!value) return null;
  // Only a *pure* single-token reference qualifies — not a compound value like
  // a border shorthand (`var(--sf-border-width-2) solid …`), which the dropdown
  // would clobber down to just the width.
  const m = value.trim().match(/^var\(\s*--sf-(space|radius|border-width|container|size|shadow)-[a-z0-9]+\s*\)$/);
  if (!m) return null;
  switch (m[1]) {
    case "space":        return SPACE_SCALE;
    case "radius":       return RADIUS_SCALE;
    case "border-width": return BORDER_WIDTH_SCALE;
    case "container":    return CONTAINER_SCALE;
    case "size":         return SIZE_SCALE;
    case "shadow":       return SHADOW_SCALE;
    default:             return null;
  }
}
