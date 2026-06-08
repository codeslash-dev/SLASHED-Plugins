/**
 * Thin REST client for the admin SPA.
 *
 * The PHP side exposes:
 *   POST  /wp-json/slashed/v1/tokens   - save a section
 *   POST  /wp-json/slashed/v1/tokens/reset - reset a section or all
 *
 * Auth uses the WP REST nonce (X-WP-Nonce header). The nonce is generated
 * server-side and passed through window.slashedApp.rest.nonce, so
 * every request is automatically scoped to the logged-in admin.
 *
 * In the Vite dev harness rest.url is empty; we just log the payload and
 * resolve so component code can be exercised without a backend.
 */
import { meta } from './stores.svelte.js';

/**
 * Internal POST helper used by `saveSection` / `resetSection`.
 *
 * Stamps the WP REST nonce on every request so WordPress' standard
 * cookie+nonce auth applies — no plugin-specific token plumbing.
 *
 * In the Vite dev harness `meta.rest.url` is empty; we log the payload
 * and resolve a stub result so component code (dirty flag, "Saved" pill)
 * can be exercised end-to-end without a real backend.
 *
 * @param {string} path - REST route relative to `meta.rest.url`.
 * @param {Object} body - JSON payload sent as the request body.
 * @returns {Promise<Object>} Parsed JSON response from the REST controller.
 * @throws {Error} On non-2xx responses; the response body is used as the message.
 */
async function call(path, body) {
  const { url, nonce } = meta.rest;
  if (!url) {
    console.info('[slashed-admin] (dev) would POST', path, body);
    return { ok: true, dev: true };
  }
  const res = await fetch(url + path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': nonce,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Persist a single section's token map. PHP runs the same sanitizer the
 * legacy form uses, so whatever keys we send here are normalized server
 * side - no need to mirror the sanitization in JS.
 */
export function saveSection(section, values) {
  return call('/tokens', { section, values });
}

/**
 * Reset a single section ('' for all sections). PHP deletes the slice
 * from the wp_option and returns the new effective state.
 */
export function resetSection(section) {
  return call('/tokens/reset', { section });
}

/**
 * Persist plugin-level settings (e.g. html_font_size). PHP validates
 * values against an allow-list and stores them in their own wp_option.
 */
export function saveSettings(settings) {
  return call('/settings', settings);
}

/**
 * Fetch the live Bricks font list from the REST endpoint.
 *
 * Falls back to the bootstrap snapshot in the Vite dev harness (no real
 * backend). On a real WP install this always returns the current state,
 * so newly-added fonts appear without a page reload.
 */
export async function fetchBricksFonts() {
  const { url, nonce } = meta.rest;
  if (!url) {
    console.info('[slashed-admin] (dev) would GET /bricks-fonts');
    return Array.isArray(meta.bricksFonts) ? meta.bricksFonts : [];
  }
  const res = await fetch(url + '/bricks-fonts', {
    credentials: 'same-origin',
    headers: { 'X-WP-Nonce': nonce },
  });
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.fonts) ? data.fonts : [];
}

/**
 * Fetch all current token overrides as a portable export envelope.
 *
 * Uses GET so it's safe to call without CSRF concerns; the WP REST nonce
 * is still sent so the permission_callback can enforce manage_options.
 */
export async function exportTokens() {
  const { url, nonce } = meta.rest;
  if (!url) {
    console.info('[slashed-admin] (dev) would GET /tokens/export');
    return { schema_version: '1', tokens: {}, plugin_settings: {}, dev: true };
  }
  const res = await fetch(url + '/tokens/export', {
    credentials: 'same-origin',
    headers: { 'X-WP-Nonce': nonce },
  });
  if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
  return res.json();
}

/**
 * Send an export envelope back to the server to restore token overrides.
 * The server runs each section through its sanitizer before persisting.
 */
export function importTokens(data) {
  return call('/tokens/import', data);
}
