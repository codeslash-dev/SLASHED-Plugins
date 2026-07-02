/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * previewResolver — resolves real, browser-computed colors from the live
 * preview iframe.
 *
 * The preview iframe already has the full framework CSS *and* the current
 * token overrides applied, so `getComputedStyle` against a probe element inside
 * it returns exactly what the user sees — including `color-mix()` derived
 * palette steps, `oklch(from …)` gradients, and `light-dark()` theme switches.
 * This is far more faithful than re-deriving the math in JS.
 *
 * Usage:
 *   - PreviewPanel registers its live document via `registerPreviewDoc(doc)`
 *     on every iframe load, and calls `bumpPreviewVersion()` whenever the
 *     overrides change (so consumers recompute).
 *   - Panels read `previewVersion.value` inside a `$derived`/`$effect` to make
 *     their resolved swatches reactive, and call `resolveColor(expr)`.
 */

let activeDoc: Document | null = null;
let probe: HTMLElement | null = null;
let normCtx: CanvasRenderingContext2D | null = null;
let probeLightWrapper: HTMLElement | null = null;
let probeDarkWrapper: HTMLElement | null = null;
let probeLightEl: HTMLElement | null = null;
let probeDarkEl: HTMLElement | null = null;

// Per-version cache: keyed by cssExpr (resolveColor) or "light\0expr"/"dark\0expr"
// (resolveColorForTheme). Cleared on every bumpPreviewVersion() — safe because that
// function is a pure write with no reactive read, so clearing here can't cause loops.
const resolveCache = new Map<string, string>();

// SL-025: deliberately module-level (not created inside a component/store
// factory). Every panel across the whole tree resolves colors against the
// *same* single preview iframe registered via registerPreviewDoc(), so there
// is exactly one meaningful "preview version" for the app to share — scoping
// this to a component would just mean re-deriving/passing it down everywhere
// for no benefit. Wrapped in an object (`.value`) because `$state` on a bare
// module-level primitive isn't itself reactive outside a component context;
// consumers read `previewVersion.value`, never reassign `previewVersion`.
/** Reactive version counter — Svelte runes pick this up via `.value`. */
export const previewVersion = $state({ value: 0 });

// Plain (non-reactive) counter used to produce monotonic version numbers.
// IMPORTANT: bumping must be a *pure write* to previewVersion.value — never
// `+= 1`, which would also READ the signal. Because the preview effects call
// bumpPreviewVersion, reading the signal there would make those effects depend
// on the state they write, causing an infinite effect_update_depth loop.
let counter = 0;

/** Register (or replace) the document the resolver reads from. */
export function registerPreviewDoc(doc: Document | null): void {
  if (activeDoc === doc) {
    bumpPreviewVersion();
    return;
  }
  if (probe) probe.remove();
  if (probeLightWrapper) probeLightWrapper.remove();
  if (probeDarkWrapper) probeDarkWrapper.remove();
  activeDoc = doc;
  probe = null;
  normCtx = null;
  probeLightWrapper = null;
  probeDarkWrapper = null;
  probeLightEl = null;
  probeDarkEl = null;
  bumpPreviewVersion();
}

/** Return the theme currently active in the registered preview document. */
export function getActiveTheme(): "light" | "dark" {
  return activeDoc?.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** Signal consumers that resolved values may have changed. */
export function bumpPreviewVersion(): void {
  counter += 1;
  previewVersion.value = counter;
  resolveCache.clear();
}

/** Return (or lazily create) the hidden probe element inside the active preview doc. */
function getProbe(): HTMLElement | null {
  if (!activeDoc || !activeDoc.body) return null;
  if (probe && probe.ownerDocument === activeDoc && probe.isConnected) return probe;
  const el = activeDoc.createElement("div");
  el.setAttribute("data-sf-probe", "");
  el.style.cssText =
    "position:absolute;width:0;height:0;pointer-events:none;visibility:hidden;";
  activeDoc.body.appendChild(el);
  probe = el;
  return el;
}

/**
 * Resolve a CSS color expression (e.g. `var(--sf-color-primary-50)` or a raw
 * `oklch(...)`) to a concrete `rgb()/rgba()` string as painted by the preview.
 * Returns "" when no preview document is available yet — callers should fall
 * back to rendering the raw `var()` expression directly.
 */
export function resolveColor(cssExpr: string): string {
  const cached = resolveCache.get(cssExpr);
  if (cached !== undefined) return cached;
  const el = getProbe();
  if (!el || !activeDoc) return "";
  el.style.color = "";
  el.style.color = cssExpr;
  // An invalid expression leaves color unchanged (inherited) — treat the
  // framework's default text color as "couldn't resolve" only if empty.
  const resolved = activeDoc.defaultView?.getComputedStyle(el).color ?? "";
  resolveCache.set(cssExpr, resolved);
  return resolved;
}

/** Return (or lazily create) a hidden probe element scoped to a specific theme via a [data-theme] wrapper. */
function getThemedProbe(theme: "light" | "dark"): HTMLElement | null {
  if (!activeDoc || !activeDoc.body) return null;
  if (theme === "light") {
    if (probeLightEl && probeLightEl.isConnected) return probeLightEl;
    if (probeLightWrapper) probeLightWrapper.remove();
    probeLightWrapper = activeDoc.createElement("div");
    probeLightWrapper.setAttribute("data-theme", "light");
    probeLightWrapper.style.cssText = "position:absolute;width:0;height:0;pointer-events:none;visibility:hidden;";
    probeLightEl = activeDoc.createElement("div");
    probeLightWrapper.appendChild(probeLightEl);
    activeDoc.body.appendChild(probeLightWrapper);
    return probeLightEl;
  } else {
    if (probeDarkEl && probeDarkEl.isConnected) return probeDarkEl;
    if (probeDarkWrapper) probeDarkWrapper.remove();
    probeDarkWrapper = activeDoc.createElement("div");
    probeDarkWrapper.setAttribute("data-theme", "dark");
    probeDarkWrapper.style.cssText = "position:absolute;width:0;height:0;pointer-events:none;visibility:hidden;";
    probeDarkEl = activeDoc.createElement("div");
    probeDarkWrapper.appendChild(probeDarkEl);
    activeDoc.body.appendChild(probeDarkWrapper);
    return probeDarkEl;
  }
}

/**
 * Resolve a CSS color expression for a specific theme regardless of the
 * preview's current active theme. Uses a hidden probe element inside a
 * [data-theme] wrapper so section-level theming applies correctly.
 */
export function resolveColorForTheme(cssExpr: string, theme: "light" | "dark"): string {
  const key = `${theme}\0${cssExpr}`;
  const cached = resolveCache.get(key);
  if (cached !== undefined) return cached;
  const el = getThemedProbe(theme);
  if (!el || !activeDoc) return "";
  el.style.color = "";
  el.style.color = cssExpr;
  const resolved = activeDoc.defaultView?.getComputedStyle(el).color ?? "";
  resolveCache.set(key, resolved);
  return resolved;
}

/** Return (or lazily create) a 1×1 canvas context inside the active preview doc for sRGB normalisation. */
function getCtx(): CanvasRenderingContext2D | null {
  if (!activeDoc) return null;
  if (normCtx && normCtx.canvas.ownerDocument === activeDoc) return normCtx;
  const canvas = activeDoc.createElement("canvas");
  canvas.width = 1; canvas.height = 1;
  normCtx = canvas.getContext("2d", { willReadFrequently: true });
  return normCtx;
}

/**
 * Resolve a CSS color expression to a concrete sRGB triple as painted by the
 * preview. Works regardless of the computed-value color space (rgb, oklab,
 * color(srgb …)) because it paints onto a canvas and reads back the pixel —
 * the same gamut-mapped color the user sees. Returns null when unavailable.
 */
export function resolveRgb(cssExpr: string): [number, number, number] | null {
  const css = resolveColor(cssExpr);
  if (!css) return null;
  const ctx = getCtx();
  if (!ctx) return null;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  try {
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  } catch {
    return null;
  }
}

/**
 * Resolve a CSS background/image expression (gradients) to its computed value.
 * Returns "" when unavailable.
 */
export function resolveBackground(cssExpr: string): string {
  const el = getProbe();
  if (!el || !activeDoc) return "";
  el.style.background = "";
  el.style.background = cssExpr;
  return activeDoc.defaultView?.getComputedStyle(el).backgroundImage ?? "";
}
