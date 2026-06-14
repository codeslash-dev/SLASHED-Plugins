/**
 * Persisted UI preferences (mode / domain / output format).
 *
 * Pure, runes-free validation so it is unit-testable under node:test —
 * the same pattern as loadOverrides(): localStorage content is untrusted
 * (older app versions, hand edits, corruption), so everything is checked
 * against the live taxonomy before it reaches the ui store.
 */
import { BASIC_DOMAIN_IDS, DOMAIN_BY_ID } from './domains.js';

export const UI_STORAGE_KEY = 'slashed-configurator/ui/v1';

/**
 * Validate a raw localStorage payload into a partial ui-state patch.
 * Unknown / invalid fields are dropped; an invalid domain for the saved
 * mode is dropped too (the App-level guard would bounce it anyway, but a
 * clean restore avoids a visible redirect flash).
 *
 * @param {string|null} raw JSON string from localStorage (or null)
 * @returns {{ mode?: 'basic'|'advanced', domain?: string, outputMode?: 'layer'|'root' }}
 */
export function sanitiseUiState(raw) {
  const out = {};
  if (typeof raw !== 'string' || raw === '') return out;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!parsed || typeof parsed !== 'object') return out;

  if (parsed.mode === 'basic' || parsed.mode === 'advanced') out.mode = parsed.mode;

  const mode = out.mode ?? 'basic';
  const domain = parsed.domain;
  if (typeof domain === 'string') {
    const valid =
      mode === 'basic'
        ? domain === 'home' || BASIC_DOMAIN_IDS.includes(domain)
        : DOMAIN_BY_ID.has(domain);
    if (valid) out.domain = domain;
  }

  if (parsed.outputMode === 'layer' || parsed.outputMode === 'root') {
    out.outputMode = parsed.outputMode;
  }

  if (parsed.uiTheme === 'light' || parsed.uiTheme === 'dark') {
    out.uiTheme = parsed.uiTheme;
  }

  return out;
}
