/**
 * WP REST API client for the SLASHED admin SPA.
 * Bootstrapped from window.slashedApp.rest (populated by wp_localize_script).
 * In the Vite dev harness (no backend) every call logs and resolves a stub.
 */

const _rest = typeof window !== 'undefined' ? (window.slashedApp?.rest ?? {}) : {};
const REST_URL = _rest.url ?? '';
const REST_NONCE = _rest.nonce ?? '';

async function call(path, method = 'GET', body = null) {
  if (!REST_URL) {
    console.info('[slashed] (dev) %s %s', method, path, body ?? '');
    return { ok: true, dev: true };
  }
  /** @type {RequestInit} */
  const opts = {
    method,
    credentials: 'same-origin',
    headers: { 'X-WP-Nonce': REST_NONCE },
  };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(REST_URL + path, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

/** Fetch persisted flat overrides: { "--sf-color-brand": "oklch(...)" } */
export function fetchOverrides() {
  return call('/tokens/overrides');
}

/** Persist the full flat overrides map. Debounce on the caller side. */
export function saveOverrides(overrides) {
  return call('/tokens/overrides', 'POST', overrides);
}

/** Delete all persisted overrides (hard reset). */
export function clearOverrides() {
  return call('/tokens/overrides', 'DELETE');
}

/** Fetch plugin-level settings (bundle, html_font_size, manual_css_mode, ...). */
export function fetchPluginSettings() {
  return call('/settings');
}

/** Save plugin-level settings. */
export function savePluginSettings(settings) {
  return call('/settings', 'POST', settings);
}

/** Fetch available framework versions from the CDN / local index. */
export function fetchFrameworkVersions() {
  return call('/framework/versions');
}

/** Switch the active framework version. */
export function switchFrameworkVersion(version) {
  return call('/framework/version', 'POST', { version });
}
