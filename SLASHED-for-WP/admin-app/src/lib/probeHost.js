/**
 * Hidden probe host for live color resolution.
 *
 * The contrast badge needs to know the FINAL resolved RGB of an authored
 * token value — and that value can use `var(--sf-color-bg)`, `oklch(from
 * var(--sf-primary-light) …)`, or `light-dark(…, …)`. None of those resolve
 * without the framework's full custom-property cascade in scope, so we keep
 * a singleton hidden `<div>` mounted at the end of `<body>` whose inline
 * style block carries every framework default plus the user's overrides.
 *
 * `measureBackground(value)` appends a tiny throwaway probe, reads
 * `getComputedStyle().backgroundColor` (browsers normalise to `rgb(…)` /
 * `rgba(…)`), removes the probe, and returns the resolved string. The
 * caller (ContrastBadge) hands that to lib/contrast.js to compute the WCAG
 * ratio.
 *
 * The host is updated by `setProbeContext({ overrides, theme })`, which is
 * driven by a tiny Svelte effect in App.svelte — that way every override
 * change refreshes the contrast badges in O(1) DOM writes (the host's style
 * attribute), not O(rows).
 */
import { buildPreviewDeclarations } from './preview.js';

const HOST_ID = 'cfg-contrast-host';
let host = null;
let lastSig = '';

/**
 * Lazily create / fetch the singleton host element. Returns null in
 * non-browser environments (Node tests).
 */
function ensureHost() {
  if (host) return host;
  if (typeof document === 'undefined') return null;
  host = document.getElementById(HOST_ID);
  if (host) return host;
  host = document.createElement('div');
  host.id = HOST_ID;
  // Off-screen, invisible, untouchable. We KEEP the element in the layout
  // tree (vs. `display:none`) so getComputedStyle on its descendants returns
  // resolved values rather than the default "the element isn't rendered".
  host.setAttribute(
    'style',
    'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;' +
      'pointer-events:none;visibility:hidden;contain:strict;'
  );
  host.setAttribute('aria-hidden', 'true');
  document.body.appendChild(host);
  return host;
}

/**
 * Refresh the host's framework-variable cascade. Idempotent — does nothing
 * when the (overrides, theme) pair hasn't changed since the last call.
 *
 * @param {{ overrides: Record<string,string>, theme: 'light'|'dark' }} ctx
 */
export function setProbeContext({ overrides, theme }) {
  const el = ensureHost();
  if (!el) return;
  // Cheap signature so we only do the expensive 800-line style rebuild when
  // something the cascade actually depends on has flipped.
  const sig = theme + '|' + Object.keys(overrides).length + '|' +
    Object.keys(overrides).sort().map((k) => `${k}=${overrides[k]}`).join('|');
  if (sig === lastSig) return;
  lastSig = sig;
  const decls = buildPreviewDeclarations(overrides, theme);
  el.setAttribute(
    'style',
    'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;' +
      'pointer-events:none;visibility:hidden;contain:strict;' + decls
  );
}

/**
 * Resolve a CSS color expression against the current probe context, returning
 * the browser's normalised `rgb(…)` / `rgba(…)` string — or null when the
 * resolver isn't available (no DOM, host not mounted yet).
 *
 * @param {string} value any CSS <color>
 * @returns {string | null}
 */
export function measureBackground(value) {
  const el = ensureHost();
  if (!el || !value) return null;
  const probe = document.createElement('div');
  probe.style.background = value;
  el.appendChild(probe);
  const computed = getComputedStyle(probe).backgroundColor;
  el.removeChild(probe);
  return computed || null;
}
