/**
 * Token liveness: every non-fallback token in the vendored configurator catalogue
 * must appear in the bundled CSS that ships with the plugin.
 *
 * The central drift risk: sync-core.mjs vendors the catalogue from framework
 * main, while update-framework.js pins the bundled CSS to a released tag. When
 * those two diverge, the configurator offers tokens the CSS doesn't define.
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ADMIN_DATA = path.join(ROOT, 'SLASHED-for-WP', 'admin-app', 'src', 'data');
const FULL_CSS = path.join(ROOT, 'SLASHED-for-WP', 'dist', 'slashed.full.css');

describe('admin-app catalogue ⇄ bundled CSS (token liveness)', () => {
  let apiIndex, tokenRegistry, cssText;

  before(() => {
    apiIndex = JSON.parse(fs.readFileSync(path.join(ADMIN_DATA, 'api-index.generated.json'), 'utf8'));
    tokenRegistry = JSON.parse(fs.readFileSync(path.join(ADMIN_DATA, 'token-registry.generated.json'), 'utf8'));
    cssText = fs.readFileSync(FULL_CSS, 'utf8');
  });

  test('every non-fallback catalogue token appears in slashed.full.css', () => {
    const liveTokens = apiIndex.tokens.filter(t => !t.fallbackOnly);
    const missing = liveTokens
      .map(t => t.name)
      .filter(name => !cssText.includes(name));
    assert.deepEqual(
      missing, [],
      `${missing.length} catalogue token(s) absent from slashed.full.css — ` +
      `the vendor copy may be ahead of the pinned CSS release:\n  ${missing.join('\n  ')}`
    );
  });

  test('every catalogue token has a token-registry id (codec compatibility)', () => {
    // The registry is the codec's id map. Any catalogue token missing from the
    // registry will serialize as an unknown id in shareable URLs.
    const registryNames = new Set(tokenRegistry.tokens.map(t => t.name));
    const missing = apiIndex.tokens
      .map(t => t.name)
      .filter(name => !registryNames.has(name));
    assert.deepEqual(
      missing, [],
      `${missing.length} catalogue token(s) have no registry id — ` +
      `they cannot round-trip through the codec's shareable URL format:\n  ${missing.join('\n  ')}`
    );
  });
});
