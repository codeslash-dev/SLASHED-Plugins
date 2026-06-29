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
import { Ja, Ga, fa } from "./codec";

const LS_KEY = "slashed-studio/overrides/v2";

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
    try { return Ja(hash); } catch { /* fall through */ }
  }
  const local = localStorage.getItem(LS_KEY);
  if (local) {
    try { return JSON.parse(local); } catch { /* fall through */ }
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
  styleEl.textContent = fa(ov, { mode: "root", banner: false });
}

async function wpSave(rest: { url?: string; nonce?: string }, ov: Record<string, string>): Promise<void> {
  const url = (rest.url ?? "").replace(/\/$/, "") + "/tokens/overrides";
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
  const code = Ga(ov);
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
