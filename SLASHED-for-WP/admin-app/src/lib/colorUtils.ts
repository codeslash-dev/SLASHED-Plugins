/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converts mathematically precise OKLCH to sRGB [0-255].
 * Formula from Björn Ottosson (creator of OKLCH/Oklab).
 */
export function oklchToRgb(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  const l_ = l;
  const a_ = c * Math.cos(hRad);
  const b_ = c * Math.sin(hRad);

  // Oklab to LMS
  const L = l_ + 0.3963377774 * a_ + 0.2158037573 * b_;
  const M = l_ - 0.1055613458 * a_ - 0.0638541728 * b_;
  const S = l_ - 0.0894841775 * a_ - 1.291485548 * b_;

  // LMS to linear RGB
  const l3 = L * L * L;
  const m3 = M * M * M;
  const s3 = S * S * S;

  const rLin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const gLin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const bLin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

  // Linear to gamma sRGB
  const gamma = (x: number) =>
    x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;

  const r = Math.max(0, Math.min(255, Math.round(gamma(rLin) * 255)));
  const g = Math.max(0, Math.min(255, Math.round(gamma(gLin) * 255)));
  const b = Math.max(0, Math.min(255, Math.round(gamma(bLin) * 255)));

  return [r, g, b];
}

/**
 * Helper to convert RGB array to a hex string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const hex = (x: number) => x.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/**
 * Calculates relative luminance of an sRGB [0-255] color.
 * Standard WCAG formula.
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const norm = (x: number) => {
    const v = x / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * norm(r) + 0.7152 * norm(g) + 0.0722 * norm(b);
}

/**
 * Computes contrast ratio between two relative luminances.
 */
export function getContrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns WCAG AA or AAA compliance status.
 */
export function getContrastRating(ratio: number) {
  return {
    ratioText: `${ratio.toFixed(2)}:1`,
    aaNormal: ratio >= 4.5 ? "PASS" : "FAIL",
    aaLarge: ratio >= 3.0 ? "PASS" : "FAIL",
    aaaNormal: ratio >= 7.0 ? "PASS" : "FAIL",
    aaaLarge: ratio >= 4.5 ? "PASS" : "FAIL",
  };
}

/**
 * Parses OKLCH string into raw L, C, H components, with fallback.
 */
export function parseOklch(val: string) {
  const match = val.match(/oklch\(\s*([\d.%]+)\s+([\d.]+)\s+([\d.]+)/i);
  if (match) {
    const lVal = match[1];
    const l = lVal.endsWith("%") ? parseFloat(lVal) / 100 : parseFloat(lVal);
    const c = parseFloat(match[2]);
    const h = parseFloat(match[3]);
    return { l, c, h, valid: true };
  }
  return { l: 0.5, c: 0.15, h: 200, valid: false };
}

/**
 * Encodes L, C, H into an OKLCH CSS string.
 */
export function stringifyOklch(l: number, c: number, h: number): string {
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} ${Math.round(h)})`;
}
