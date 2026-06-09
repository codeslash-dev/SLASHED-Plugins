/**
 * Unit tests for the admin-app CSS export generator (node:test, no browser).
 *
 * Covers the configurator-inspired additions: value sanitization (CSS-injection
 * guard) and the generateExportCSS output options (@layer vs :root framing and
 * the generated-by banner).
 *
 * Run: node --test tests/export-css.test.js
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeValue,
  generateExportCSS,
} from '../SLASHED-for-WP/integrations/bricks/admin-app/src/lib/export.js';

describe('sanitizeValue', () => {
  test('passes through legitimate values untouched', () => {
    assert.equal(sanitizeValue('#3b5bdb'), '#3b5bdb');
    assert.equal(sanitizeValue('oklch(0.7 0.1 250)'), 'oklch(0.7 0.1 250)');
    assert.equal(
      sanitizeValue('"Inter", system-ui, sans-serif'),
      '"Inter", system-ui, sans-serif'
    );
  });

  test('strips structural characters that break out of a declaration', () => {
    assert.equal(sanitizeValue('red; } body { display:none }'), 'red body display:none');
  });

  test('drops comment blocks and stray comment delimiters', () => {
    assert.equal(sanitizeValue('red /* hi */ blue'), 'red blue');
    assert.equal(sanitizeValue('red ** blue'), 'red blue');
  });

  test('collapses whitespace and trims', () => {
    assert.equal(sanitizeValue('  a   b  '), 'a b');
  });

  test('handles null / undefined / numbers', () => {
    assert.equal(sanitizeValue(null), '');
    assert.equal(sanitizeValue(undefined), '');
    assert.equal(sanitizeValue(1.25), '1.25');
  });
});

describe('generateExportCSS — framing', () => {
  const tokens = { colors: { brand_primary: '#3b5bdb' } };

  test('defaults to @layer framing with no banner', () => {
    const css = generateExportCSS(tokens);
    assert.match(css, /^@layer slashed\.overrides \{/);
    assert.match(css, /--sf-color-primary-light: #3b5bdb;/);
    assert.ok(!css.includes('/*'), 'no banner by default');
  });

  test('mode "root" emits a bare :root rule without @layer', () => {
    const css = generateExportCSS(tokens, { mode: 'root' });
    assert.match(css, /^:root \{/);
    assert.ok(!css.includes('@layer'), 'no @layer wrapper in root mode');
    assert.match(css, /--sf-color-primary-light: #3b5bdb;/);
  });

  test('returns empty string when there are no overrides', () => {
    assert.equal(generateExportCSS({}), '');
    assert.equal(generateExportCSS({ colors: {} }, { banner: true }), '');
  });
});

describe('generateExportCSS — banner', () => {
  const tokens = { colors: { brand_primary: '#3b5bdb' } };

  test('banner adds a generated-by header with version', () => {
    const css = generateExportCSS(tokens, { banner: true, version: '2.1.0' });
    assert.match(css, /^\/\* SLASHED override tokens v2\.1\.0/);
    assert.match(css, /@layer slashed\.overrides/);
  });

  test('banner without a version omits the version stamp', () => {
    const css = generateExportCSS(tokens, { banner: true });
    assert.match(css, /^\/\* SLASHED override tokens —/);
  });

  test('banner declaration count is singular/plural aware', () => {
    const one = generateExportCSS({ colors: { brand_primary: '#fff' } }, { banner: true });
    assert.match(one, /1 declaration\./);
    const many = generateExportCSS(
      { colors: { brand_primary: '#fff', brand_secondary: '#000' } },
      { banner: true }
    );
    assert.match(many, /2 declarations\./);
  });
});

describe('generateExportCSS — injection guard', () => {
  test('a malicious color value cannot escape the declaration block', () => {
    const css = generateExportCSS({
      colors: { brand_primary: 'red; } body { display:none } /*' },
    });
    // The output must remain a single well-formed @layer{ :root{ } } block:
    // exactly one '}' for :root and one for @layer, none injected by the value.
    assert.equal((css.match(/\}/g) || []).length, 2);
    assert.ok(!css.includes('display:none }'), 'structural chars stripped');
    assert.match(css, /--sf-color-primary-light: red body display:none/);
  });
});

describe('generateExportCSS — section coverage', () => {
  test('emits light and dark color declarations', () => {
    const css = generateExportCSS({
      colors: { brand_primary: '#111', brand_dark_primary: '#eee' },
    });
    assert.match(css, /--sf-color-primary-light: #111;/);
    assert.match(css, /--sf-color-primary-dark: #eee;/);
  });

  test('dark declarations are skipped when dark_overrides_enabled is "0"', () => {
    const css = generateExportCSS({
      colors: { brand_primary: '#111', brand_dark_primary: '#eee', dark_overrides_enabled: '0' },
    });
    assert.match(css, /--sf-color-primary-light: #111;/);
    assert.ok(!css.includes('-dark:'), 'dark overrides omitted when disabled');
  });

  test('font stacks and scales are emitted and sanitized', () => {
    const css = generateExportCSS({
      typography: { font_body: '"Inter", sans-serif', text_scale: '1.25' },
    });
    assert.match(css, /--sf-font-body: "Inter", sans-serif;/);
    assert.match(css, /--sf-text-scale: 1\.25;/);
  });
});
