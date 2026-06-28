/**
 * Persistence seam for the configurator.
 *
 * Standalone (default): initial state from URL hash or localStorage; changes
 * are written back to both, plus a live `<style>` is injected.
 *
 * Embedded in WordPress: when `window.slashedApp` is present, initial state
 * comes from PHP hydration (`overrides`) and changes are saved via the REST API
 * (`rest.url` + `rest.nonce`), debounced. There are no WP-specific imports here
 * — only `fetch` + `window` globals — so the configurator stays
 * framework-agnostic and gains embeddability without taking a host dependency.
 *
 * In every mode a live `<style id="sf-parent-overrides">` is injected so the
 * chrome + preview reflect the current overrides immediately.
 */
import { Ja, Ga, fa } from "./codec";

const LS_KEY = "slashed-studio/overrides/v2";
const SAVE_DEBOUNCE_MS = 400;

interface SlashedAppBoot {
  rest?: { url?: string; nonce?: string };
  overrides?: Record<string, string>;
}

function wpBoot(): SlashedAppBoot | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { slashedApp?: SlashedAppBoot }).slashedApp ?? null;
}

/** Whether the configurator is running embedded in WordPress (REST persistence). */
export function isEmbedded(): boolean {
  return Boolean(wpBoot()?.rest?.url);
}

export function loadInitialOverrides(): Record<string, string> {
  if (typeof window === "undefined") return {};

  // WordPress: authoritative DB state printed by PHP at render time.
  const boot = wpBoot();
  if (boot?.overrides && typeof boot.overrides === "object" && !Array.isArray(boot.overrides)) {
    return { ...boot.overrides };
  }

  // Standalone: URL hash (shareable config) takes priority over localStorage.
  const hash = window.location.hash;
  if (hash?.includes("c=")) {
    try { return Ja(hash); } catch { /* fall through */ }
  }
  const local = localStorage.getItem(LS_KEY);
  if (local) {
    try { return JSON.parse(local); } catch { /* fall through */ }
  }
  return {};
}

function injectStyle(ov: Record<string, string>): void {
  if (typeof document === "undefined") return;
  let styleEl = document.getElementById("sf-parent-overrides");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "sf-parent-overrides";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = fa(ov, { mode: "root", banner: false });
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

async function wpSave(rest: { url?: string; nonce?: string }, ov: Record<string, string>): Promise<void> {
  const url = (rest.url ?? "").replace(/\/$/, "") + "/tokens/overrides";
  await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-WP-Nonce": rest.nonce ?? "",
    },
    body: JSON.stringify({ overrides: ov }),
  });
}

function saveStandalone(ov: Record<string, string>): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ov)); } catch { /* quota */ }
  const code = Ga(ov);
  const nextHash = code ? `c=${code}` : "";
  if (window.location.hash.replace("#", "") !== nextHash) {
    window.location.hash = nextHash;
  }
}

/**
 * Persist the current overrides. The live `<style>` is injected synchronously
 * in all modes; the save itself is debounced in WP mode so rapid slider drags
 * don't flood the REST API.
 */
export function persistOverrides(ov: Record<string, string>): void {
  injectStyle(ov);
  if (typeof window === "undefined") return;

  const boot = wpBoot();
  if (boot?.rest?.url) {
    const snapshot = { ...ov };
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => { void wpSave(boot.rest!, snapshot); }, SAVE_DEBOUNCE_MS);
    return;
  }
  saveStandalone(ov);
}
