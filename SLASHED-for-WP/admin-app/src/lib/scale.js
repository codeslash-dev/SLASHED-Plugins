/**
 * Shared modular-scale utilities.
 *
 * ⚠ PARITY MODULE — kept byte-for-byte identical between the framework
 * configurator and the WordPress plugin admin app, with an identical unit-test
 * suite in both repos. Pure maths, no Svelte / DOM.
 *
 * A modular scale sets every step to `base * ratio^n`, where `n` is the step's
 * index relative to the body size (`m`, index 0). Two ratios (mobile vs.
 * desktop) drive a fluid min/max pair per step.
 */

/** Named typographic ratios common in practice. */
export const RATIOS = [
  { label: 'Minor Second (1.067)', value: 1.067 },
  { label: 'Major Second (1.125)', value: 1.125 },
  { label: 'Minor Third (1.200)', value: 1.2 },
  { label: 'Major Third (1.250)', value: 1.25 },
  { label: 'Perfect Fourth (1.333)', value: 1.333 },
  { label: 'Augmented Fourth (1.414)', value: 1.414 },
  { label: 'Perfect Fifth (1.500)', value: 1.5 },
  { label: 'Golden Ratio (1.618)', value: 1.618 },
  { label: 'Major Sixth (1.667)', value: 1.667 },
  { label: 'Octave (2.000)', value: 2.0 },
];

/** Type steps and their index relative to `m` (the body size at index 0). */
export const TEXT_STEPS = [
  { name: '2xs', idx: -3 },
  { name: 'xs', idx: -2 },
  { name: 's', idx: -1 },
  { name: 'm', idx: 0 },
  { name: 'l', idx: 1 },
  { name: 'xl', idx: 2 },
  { name: '2xl', idx: 3 },
  { name: '3xl', idx: 4 },
  { name: '4xl', idx: 5 },
];

/** Space steps and their index relative to `m` (the base gap at index 0). */
export const SPACE_STEPS = [
  { name: '2xs', idx: -3 },
  { name: 'xs', idx: -2 },
  { name: 's', idx: -1 },
  { name: 'm', idx: 0 },
  { name: 'l', idx: 1 },
  { name: 'xl', idx: 2 },
  { name: '2xl', idx: 3 },
  { name: '3xl', idx: 4 },
  { name: '4xl', idx: 5 },
];

/**
 * One modular-scale value.
 * @param {number} base base size at index 0
 * @param {number} ratio scale ratio (> 1)
 * @param {number} step index relative to base
 * @returns {number}
 */
export function modularValue(base, ratio, step) {
  return base * Math.pow(ratio, step);
}

/**
 * Round to a fixed number of decimals, returning a Number (no trailing zeros).
 * @param {number} n
 * @param {number} [places=4]
 * @returns {number}
 */
export function round(n, places = 4) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/**
 * Compute min/max values for a set of steps from a modular scale.
 *
 * @param {Array<{name:string, idx:number}>} steps
 * @param {object} opts
 * @param {number} opts.baseMin base size (rem) at the mobile end
 * @param {number} opts.baseMax base size (rem) at the desktop end
 * @param {number} opts.ratioMin ratio applied at the mobile end
 * @param {number} opts.ratioMax ratio applied at the desktop end
 * @returns {Array<{name:string, min:number, max:number}>}
 */
export function computeScale(steps, { baseMin, baseMax, ratioMin, ratioMax }) {
  return steps.map(({ name, idx }) => ({
    name,
    min: round(modularValue(baseMin, ratioMin, idx)),
    max: round(modularValue(baseMax, ratioMax, idx)),
  }));
}

/**
 * Build a fluid `clamp()` expression that grows linearly from `minRem` at the
 * minimum viewport to `maxRem` at the maximum viewport — the same fluid curve
 * the framework's generated tokens use.
 *
 * Returns a bare `${min}rem` when min === max (no fluidity needed).
 *
 * @param {number} minRem value at the min viewport
 * @param {number} maxRem value at the max viewport
 * @param {number} vpMinRem viewport floor in rem (e.g. 22.5 = 360px)
 * @param {number} vpMaxRem viewport ceiling in rem (e.g. 90 = 1440px)
 * @returns {string} a CSS clamp() expression (or a plain rem value)
 */
export function buildClamp(minRem, maxRem, vpMinRem, vpMaxRem) {
  if (!(maxRem > minRem) || !(vpMaxRem > vpMinRem)) {
    return `${round(minRem, 4)}rem`;
  }
  // slope in rem per rem-of-viewport; *100 because 1vw = viewport/100.
  const slope = (maxRem - minRem) / (vpMaxRem - vpMinRem);
  const vw = round(slope * 100, 4);
  const intercept = round(minRem - slope * vpMinRem, 4);
  const preferred =
    intercept === 0 ? `${vw}vw` : `${intercept}rem + ${vw}vw`;
  return `clamp(${round(minRem, 4)}rem, ${preferred}, ${round(maxRem, 4)}rem)`;
}
