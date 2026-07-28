/**
 * Detects overrides that shadow a generative scale.
 *
 * The space and text scales are generated: the framework computes every step
 * (--sf-space-m, --sf-text-l, …) from a handful of source knobs (base, ratio,
 * scale, fluid viewport) via clamp()/pow() at :root. The scale panels edit those
 * knobs, never the steps.
 *
 * A concrete value stored for a STEP wins over the generated one — deliberately:
 * a fine-tuned rung should survive the knob that would otherwise produce it, and
 * both the live preview and the WordPress plugin's PHP emitter implement that
 * same precedence. But when a whole ladder of steps is stored (an older settings
 * page, an imported theme, or hand edits in the All-tokens tab), the knobs go
 * completely inert while still reading back their own values everywhere — the
 * panel shows them, the page reports them at :root, and nothing moves. There is
 * no way to tell from the scale card that this is happening.
 *
 * These helpers let the scale cards say so, and offer to clear the shadowing
 * entries.
 */

/** Steps of the fluid space scale, in ladder order. Excludes the deliberately
 *  non-generative --sf-space-none / --sf-space-px. */
export const SPACE_STEP_TOKENS = [
  '--sf-space-2xs', '--sf-space-xs', '--sf-space-s', '--sf-space-m',
  '--sf-space-l', '--sf-space-xl', '--sf-space-2xl', '--sf-space-3xl',
  '--sf-space-4xl',
] as const;

/** Steps of the fluid text scale. */
export const TEXT_STEP_TOKENS = [
  '--sf-text-2xs', '--sf-text-xs', '--sf-text-s', '--sf-text-m',
  '--sf-text-l', '--sf-text-xl', '--sf-text-2xl', '--sf-text-3xl',
  '--sf-text-4xl',
] as const;

/** Steps of the display scale, generated from the display base + the shared
 *  text ratio. */
export const DISPLAY_STEP_TOKENS = [
  '--sf-text-display-s', '--sf-text-display-m', '--sf-text-display-l',
] as const;

/**
 * Which of `steps` are present in the override map — i.e. stored as concrete
 * values that shadow the generated ones. Order follows `steps`, so the result
 * reads as a ladder rather than in insertion order.
 */
export function shadowingSteps(
  overrides: Record<string, string>,
  steps: readonly string[],
): string[] {
  return steps.filter((token) => token in overrides);
}
