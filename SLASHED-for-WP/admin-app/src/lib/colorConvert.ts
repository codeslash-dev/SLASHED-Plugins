/**
 * colorConvert — paste any CSS colour, store it in the token's canonical space.
 *
 * The configurator's colour tokens are authored in OKLCH (a few gradient
 * interpolations use OKLAB). Designers, though, usually have a brand colour as
 * a hex/rgb/hsl string. Rather than force them to pre-convert, these helpers
 * take whatever CSS colour they paste and normalise it into the field's target
 * space using the browser's own colour engine — via relative-colour syntax
 * (`oklch(from <input> l c h)`) resolved against the live preview iframe. That
 * means every format CSS understands (hex 3/4/6/8, rgb(a), hsl(a), named,
 * hwb, lab/lch, color(), even oklab) is supported for free, with no colour-math
 * library and no drift from what the browser will actually paint.
 */

import { resolveColor, resolveRgb } from './previewResolver.svelte';
import { rgbToHex } from './colorUtils';

export type ColorSpace = 'oklch' | 'oklab';

const SPACE_PREFIX: Record<ColorSpace, string> = {
  oklch: 'oklch(',
  oklab: 'oklab(',
};

/**
 * Classify a concrete value's colour space. Returns the space when it's already
 * OKLCH/OKLAB, `'other'` for any other concrete colour literal (hex, rgb, hsl,
 * named, …) that we can convert, or `null` for things we must not touch — an
 * empty string, a `var(--…)` reference, or any expression containing one.
 */
export function colorSpaceOf(value: string): ColorSpace | 'other' | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (v.startsWith('--') || /\bvar\(/.test(v)) return null;
  if (v.startsWith('oklch(')) return 'oklch';
  if (v.startsWith('oklab(')) return 'oklab';
  return 'other';
}

/** Round to `dp` decimals without trailing zeros (12.300 → "12.3", 0.0 → "0"). */
function round(n: number, dp: number): string {
  return String(Number(n.toFixed(dp)));
}

/**
 * Reformat a browser-serialised `oklch(L C H[ / a])` / `oklab(L A B[ / a])`
 * string to the configurator's compact convention. Hue keeps one decimal; the
 * other channels keep three. Alpha is preserved only when below 1.
 */
function format(resolved: string, space: ColorSpace): string | null {
  // CSS Color 4 allows the `none` keyword for a missing/powerless channel
  // (e.g. an achromatic colour's hue). Accept it and treat it as 0 for storage.
  const CH = '(?:none|[-\\d.eE+]+)';
  const m = new RegExp(
    `^okl(?:ch|ab)\\(\\s*(${CH})\\s+(${CH})\\s+(${CH})\\s*(?:\\/\\s*(none|[-\\d.eE+%]+))?\\s*\\)$`,
    'i',
  ).exec(resolved.trim());
  if (!m) return null;
  const ch = (s: string) => (s.toLowerCase() === 'none' ? 0 : parseFloat(s));
  const c1 = ch(m[1]);
  const c2 = ch(m[2]);
  const c3 = ch(m[3]);
  if (!Number.isFinite(c1) || !Number.isFinite(c2) || !Number.isFinite(c3)) return null;
  // oklch: L C H (hue in degrees → 1dp). oklab: L A B (all → 3dp).
  const body =
    space === 'oklch'
      ? `${round(c1, 3)} ${round(c2, 3)} ${round(c3, 1)}`
      : `${round(c1, 3)} ${round(c2, 3)} ${round(c3, 3)}`;
  let alpha: number | null = null;
  if (m[4] !== undefined) {
    alpha = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  }
  return alpha !== null && Number.isFinite(alpha) && alpha < 1
    ? `${space}(${body} / ${round(alpha, 3)})`
    : `${space}(${body})`;
}

/**
 * Convert any CSS colour the browser can parse into `target` space, using the
 * live preview iframe's colour engine. Returns `null` when the input isn't a
 * valid colour (invalid relative-colour syntax leaves the probe on its
 * inherited colour, which serialises as `rgb(…)` rather than the target space)
 * or when the preview isn't ready — callers should then keep the raw text.
 */
export function convertColor(input: string, target: ColorSpace): string | null {
  const src = input.trim();
  if (!src) return null;
  const channels = target === 'oklab' ? 'l a b' : 'l c h';
  const resolved = resolveColor(`${target}(from ${src} ${channels})`);
  if (!resolved || !resolved.toLowerCase().startsWith(SPACE_PREFIX[target])) return null;
  return format(resolved, target);
}

/**
 * Commit helper for a colour field: given raw user text and the field's target
 * space, return the value to store. A `var()`/reference or an already-in-space
 * value passes through untouched (so the user's exact text is respected); a
 * foreign but valid colour is converted; an unparseable string is kept as-is so
 * the user can fix it rather than lose their paste.
 */
export function normalizeColorInput(input: string, target: ColorSpace): string {
  const v = input.trim();
  const space = colorSpaceOf(v);
  // Leave references/expressions (null) and already-in-target values untouched;
  // convert everything else — foreign colours AND the other canonical space
  // (e.g. a pasted oklab() into an oklch field, which would otherwise be stored
  // verbatim and leave the desk's L/C/H sliders stuck on their defaults).
  if (space === null || space === target) return v;
  return convertColor(v, target) ?? v;
}

/**
 * The sRGB hex a colour actually paints as, for an always-visible reference
 * next to the canonical (OKLCH/OKLAB) value — so a designer who pasted a hex
 * still recognises their colour after it's normalised. Resolved through the
 * preview iframe and read back off a canvas, so it's the real gamut-mapped
 * pixel (out-of-sRGB colours are clamped, same as the browser paints them).
 * Accepts a `--token` / `var()` reference too. Returns null when unavailable.
 */
export function previewHex(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const expr = v.startsWith('--') && !v.startsWith('var(') ? `var(${v})` : v;
  const rgb = resolveRgb(expr);
  if (!rgb) return null;
  return rgbToHex(rgb[0], rgb[1], rgb[2]);
}
