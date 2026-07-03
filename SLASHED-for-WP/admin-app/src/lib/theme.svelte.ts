/**
 * Studio chrome theme (light/dark) — independent of `previewTheme`, which
 * only controls which mode the live preview iframe renders in.
 *
 * Defaults to the OS preference (prefers-color-scheme) and keeps following
 * it live until the user explicitly toggles, at which point the choice is
 * persisted and the OS is no longer consulted.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "slashed-studio-theme";

function readStored(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const stored = readStored();
let followSystem = stored === null;

export const themeState = $state<{ value: Theme }>({ value: stored ?? systemTheme() });

let root: HTMLElement | null = null;

function applyToRoot() {
  root?.classList.toggle("dark", themeState.value === "dark");
}

/** Register the element whose descendants Tailwind's `dark:` variant keys off. */
export function bindThemeRoot(el: HTMLElement) {
  root = el;
  applyToRoot();
}

export function setTheme(t: Theme) {
  followSystem = false;
  try {
    localStorage.setItem(STORAGE_KEY, t);
  } catch {
    // ignore (private browsing / storage disabled)
  }
  themeState.value = t;
  applyToRoot();
}

export function toggleTheme() {
  setTheme(themeState.value === "dark" ? "light" : "dark");
}

/**
 * Pin the theme in-memory without persisting to storage or the user's saved
 * preference — for embeddings that force a fixed appearance (e.g. a host
 * page with its own hardcoded dark shell) independent of the Studio's own
 * theme setting. Also stops following the OS preference, so a later
 * prefers-color-scheme change can't undo the pin.
 */
export function forceTheme(t: Theme) {
  followSystem = false;
  themeState.value = t;
  applyToRoot();
}

if (typeof matchMedia !== "undefined") {
  const mql = matchMedia("(prefers-color-scheme: dark)");
  const onChange = (e: MediaQueryListEvent) => {
    if (!followSystem) return;
    themeState.value = e.matches ? "dark" : "light";
    applyToRoot();
  };
  // Safari < 14 only exposes the older addListener/removeListener pair.
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
  } else if (typeof mql.addListener === "function") {
    mql.addListener(onChange);
  }
}
