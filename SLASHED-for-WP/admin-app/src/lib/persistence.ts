/**
 * Persistence seam for the configurator.
 *
 * Standalone (default): initial state from URL hash or localStorage; changes
 * are written to both on explicit save. A live `<style>` is injected on every
 * change for immediate preview regardless of save state.
 *
 * Embedded in WordPress: when `window.slashedApp` is present, initial state
 * comes from PHP hydration (`overrides`) and changes are saved via the REST API
 * on explicit save. There are no WP-specific imports here — only `fetch` +
 * `window` globals — so the configurator stays framework-agnostic.
 *
 * In every mode a live `<style id="sf-parent-overrides">` is injected so the
 * chrome + preview reflect the current overrides immediately.
 */
import { readShareFromHashIfPresent, encodeOverrides, generateCSS } from "./codec";
import { isStringRecord } from "./savedThemes";

const LS_KEY = "slashed-studio/overrides/v2";

// ---------------------------------------------------------------------------
// Modular-scale derived-token computation
//
// When source tokens (--sf-text-base-min etc.) are in the overrides map, we
// pre-compute all derived output tokens in JS using the same formula the CSS
// framework uses, then inject them as *unlayered* :root CSS alongside the
// source tokens. Unlayered CSS beats any @layer, so these computed values
// override hardcoded clamp declarations a legacy WP settings page may have
// emitted inside @layer slashed.overrides, giving accurate live preview.
// ---------------------------------------------------------------------------

const TEXT_SCALE_SRC = new Set([
  '--sf-text-base-min', '--sf-text-base-max',
  '--sf-text-ratio-min', '--sf-text-ratio-max',
  '--sf-text-scale', '--sf-text-display-base-min',
  '--sf-text-display-base-max', '--sf-text-display-scale',
  '--sf-fluid-min-vw', '--sf-fluid-max-vw',
]);
const SPACE_SCALE_SRC = new Set([
  '--sf-space-base-min', '--sf-space-base-max',
  '--sf-space-ratio-min', '--sf-space-ratio-max',
  '--sf-space-scale', '--sf-fluid-min-vw', '--sf-fluid-max-vw',
]);

const TEXT_STEPS: [string, number][] = [
  ['2xs', -3], ['xs', -2], ['s', -1], ['m', 0],
  ['l', 1], ['xl', 2], ['2xl', 3], ['3xl', 4], ['4xl', 5],
];
const DISPLAY_STEPS: [string, number][] = [
  ['display-s', 0], ['display-m', 1], ['display-l', 2],
];
const SPACE_STEPS: [string, number][] = [
  ['2xs', -3], ['xs', -2], ['s', -1], ['m', 0],
  ['l', 1], ['xl', 2], ['2xl', 3], ['3xl', 4], ['4xl', 5],
];
const RADIUS_STEPS: [string, number][] = [
  ['2xs', 1], ['xs', 2], ['s', 4], ['m', 8],
  ['l', 12], ['xl', 16], ['2xl', 24], ['3xl', 32], ['4xl', 48],
];
const BORDER_WIDTH_STEPS: [string, number][] = [
  ['1', 1], ['2', 2], ['3', 3], ['4', 4],
];
const DURATION_STEPS: [string, number][] = [
  ['instant', 100], ['fast', 150], ['normal', 250], ['slow', 400], ['slower', 600],
];

function getNum(ov: Record<string, string>, key: string, def: number): number {
  const v = ov[key];
  if (v === undefined) return def;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : def;
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const s = n.toFixed(6);
  const trimmed = s.replace(/\.?0+$/, '');
  return trimmed === '' || trimmed === '-' ? '0' : trimmed;
}

// Mirrors the framework CSS formula: scale distributes linearly so
// calc(clamp(sMin rem, ..., sMax rem) * scale) == clamp(sMin*scale rem, ..., sMax*scale rem).
function fluidClamp(
  baseMin: number, baseMax: number, ratioMin: number, ratioMax: number,
  vwMin: number, vwMax: number, step: number, scale: number,
): string {
  const sMin = baseMin * Math.pow(ratioMin, step) * scale;
  const sMax = baseMax * Math.pow(ratioMax, step) * scale;
  if (vwMax <= vwMin || Math.abs(sMin - sMax) < 1e-9) return `${fmt(sMin)}rem`;
  const slope = (sMax - sMin) / (vwMax - vwMin);
  return `clamp(${fmt(sMin)}rem, calc(${fmt(slope)} * (100vw - ${fmt(vwMin)}rem) + ${fmt(sMin)}rem), ${fmt(sMax)}rem)`;
}

export function computeDerivedOverrides(ov: Record<string, string>, { reduceMotion = false } = {}): Record<string, string> {
  const derived: Record<string, string> = {};
  const keys = Object.keys(ov);
  const hasText   = keys.some((k) => TEXT_SCALE_SRC.has(k));
  const hasSpace  = keys.some((k) => SPACE_SCALE_SRC.has(k));
  const hasRadius = '--sf-radius-scale' in ov;
  const hasBorder = '--sf-border-scale' in ov;
  const hasMotion = '--sf-motion-scale' in ov;
  if (!hasText && !hasSpace && !hasRadius && !hasBorder && !hasMotion) return derived;

  const vwMin = getNum(ov, '--sf-fluid-min-vw', 22.5);
  const vwMax = getNum(ov, '--sf-fluid-max-vw', 90);

  if (hasText) {
    const baseMin   = getNum(ov, '--sf-text-base-min', 1);
    const baseMax   = getNum(ov, '--sf-text-base-max', 1.25);
    const ratioMin  = getNum(ov, '--sf-text-ratio-min', 1.25);
    const ratioMax  = getNum(ov, '--sf-text-ratio-max', 1.333);
    const scale     = getNum(ov, '--sf-text-scale', 1);
    for (const [name, step] of TEXT_STEPS) {
      derived[`--sf-text-${name}`] = fluidClamp(baseMin, baseMax, ratioMin, ratioMax, vwMin, vwMax, step, scale);
    }
    const dispMin   = getNum(ov, '--sf-text-display-base-min', 2.4);
    const dispMax   = getNum(ov, '--sf-text-display-base-max', 3);
    const dispScale = getNum(ov, '--sf-text-display-scale', 1);
    for (const [name, step] of DISPLAY_STEPS) {
      derived[`--sf-text-${name}`] = fluidClamp(dispMin, dispMax, ratioMin, ratioMax, vwMin, vwMax, step, dispScale);
    }
  }

  if (hasSpace) {
    const baseMin  = getNum(ov, '--sf-space-base-min', 1);
    const baseMax  = getNum(ov, '--sf-space-base-max', 2);
    const ratioMin = getNum(ov, '--sf-space-ratio-min', 1.25);
    const ratioMax = getNum(ov, '--sf-space-ratio-max', 1.333);
    const scale    = getNum(ov, '--sf-space-scale', 1);
    for (const [name, step] of SPACE_STEPS) {
      derived[`--sf-space-${name}`] = fluidClamp(baseMin, baseMax, ratioMin, ratioMax, vwMin, vwMax, step, scale);
    }
  }

  if (hasRadius) {
    const scale = getNum(ov, '--sf-radius-scale', 1);
    for (const [name, base] of RADIUS_STEPS) {
      derived[`--sf-radius-${name}`] = `${fmt(base * scale)}px`;
    }
    derived['--sf-radius-none']  = '0';
    derived['--sf-radius-full']  = '9999px';
    // Keep relationship-based — mirrors framework token graph so fine-tune
    // overrides on --sf-radius-full / --sf-radius-m still win.
    derived['--sf-radius-pill']  = 'var(--sf-radius-full)';
    derived['--sf-radius-outer'] = 'calc(var(--sf-radius-m) + var(--sf-component-pad))';
  }

  if (hasBorder) {
    const scale = getNum(ov, '--sf-border-scale', 1);
    for (const [name, base] of BORDER_WIDTH_STEPS) {
      derived[`--sf-border-width-${name}`] = `${fmt(base * scale)}px`;
    }
  }

  // Skip motion tokens when the OS prefers reduced motion — emitting them as
  // unlayered :root CSS would override the framework's @media
  // (prefers-reduced-motion: reduce) duration clamps that live inside @layer.
  if (hasMotion && !reduceMotion) {
    const scale = getNum(ov, '--sf-motion-scale', 1);
    for (const [name, base] of DURATION_STEPS) {
      derived[`--sf-duration-${name}`] = `${fmt(base * scale)}ms`;
    }
    derived['--sf-duration-none']             = '0ms';
    derived['--sf-theme-transition-duration'] = `${fmt(300 * scale)}ms`;
    for (let i = 1; i <= 5; i += 1) {
      derived[`--sf-animation-delay-${i}`] = `${fmt(75 * i * scale)}ms`;
    }
  }

  return derived;
}

interface SlashedAppBoot {
  rest?: { url?: string; nonce?: string };
  overrides?: Record<string, string>;
  pluginSettings?: { configurator_url?: string };
}

function wpBoot(): SlashedAppBoot | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { slashedApp?: SlashedAppBoot }).slashedApp ?? null;
}

/** Whether the configurator is running embedded in WordPress (REST persistence). */
export function isEmbedded(): boolean {
  return Boolean(wpBoot()?.rest?.url);
}

/**
 * Base URL share links should point at. Embedded hosts (e.g. the WP plugin)
 * persist overrides server-side rather than in the URL hash (see
 * saveStandalone() below, which the WP save path skips entirely), so the
 * current page's URL is a logged-in admin screen, not something worth
 * sharing — use the host's public standalone configurator URL instead.
 * Returns undefined in standalone mode, where buildShareUrl()'s own
 * window.location.href fallback is already correct.
 */
export function getShareBaseUrl(): string | undefined {
  const url = wpBoot()?.pluginSettings?.configurator_url;
  return url && url.trim() !== "" ? url : undefined;
}

/**
 * Whether a host (e.g. the WP admin page) mounted us into its own container,
 * regardless of whether REST persistence is configured. This is the same
 * boundary loadInitialOverrides() uses, and the one layout sizing needs —
 * a host can supply window.slashedApp without `rest` per its typing.
 */
export function hasWpBoot(): boolean {
  return Boolean(wpBoot());
}

export function loadInitialOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};

  // WordPress: authoritative DB state printed by PHP at render time.
  // The presence of `boot` is the embedded-mode boundary — if the host provided
  // window.slashedApp but omitted overrides (e.g. fresh install), start clean
  // rather than falling through to stale browser localStorage/hash state.
  const boot = wpBoot();
  if (boot) {
    if (boot.overrides && typeof boot.overrides === "object" && !Array.isArray(boot.overrides)) {
      return { ...boot.overrides };
    }
    return {};
  }

  // Standalone: URL hash (shareable config) takes priority over localStorage.
  const hash = window.location.hash;
  if (hash?.includes("c=")) {
    try { return readShareFromHashIfPresent(hash); } catch { /* fall through */ }
  }
  const local = localStorage.getItem(LS_KEY);
  if (local) {
    try {
      const parsed: unknown = JSON.parse(local);
      if (isStringRecord(parsed)) return parsed;
    } catch { /* fall through */ }
  }
  return {};
}

/** Inject live CSS preview — called on every overrides change, no side-effects. */
export function injectLivePreview(ov: Record<string, string>): void {
  if (typeof document === "undefined") return;
  let styleEl = document.getElementById("sf-parent-overrides");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "sf-parent-overrides";
    document.head.appendChild(styleEl);
  }
  // Include pre-computed derived tokens alongside source tokens so they win
  // as unlayered CSS over any hardcoded clamp values in @layer slashed.overrides.
  const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const derived = computeDerivedOverrides(ov, { reduceMotion });
  const preview = Object.keys(derived).length > 0 ? { ...derived, ...ov } : ov;
  styleEl.textContent = generateCSS(preview, { mode: "root", banner: false });
}

async function wpSave(rest: { url?: string; nonce?: string }, ov: Record<string, string>): Promise<void> {
  const base = (rest.url ?? "").replace(/\/$/, "");
  const parsed = new URL(base + "/tokens/overrides", window.location.href);
  if (parsed.origin !== window.location.origin) {
    throw new Error("slashed: REST URL must be same-origin");
  }
  const url = parsed.href;
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-WP-Nonce": rest.nonce ?? "",
    },
    body: JSON.stringify({ overrides: ov }),
  });
  if (!res.ok) throw new Error(`slashed: save failed ${res.status} ${res.statusText}`);
}

function saveStandalone(ov: Record<string, string>): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ov)); } catch { /* quota */ }
  const code = encodeOverrides(ov);
  const nextHash = code ? `c=${code}` : "";
  if (window.location.hash.replace("#", "") !== nextHash) {
    window.location.hash = nextHash;
  }
}

/** Explicitly persist overrides — REST in WP mode, localStorage+hash in standalone. */
export async function saveOverrides(ov: Record<string, string>): Promise<void> {
  if (typeof window === "undefined") return;
  const boot = wpBoot();
  if (boot?.rest?.url) {
    await wpSave(boot.rest!, { ...ov });
    return;
  }
  saveStandalone(ov);
}
