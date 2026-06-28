/**
 * Integrity smoke tests for the vendored configurator data files.
 * Ported from SLASHED/configurator/tests/smoke.test.js — verifies the
 * plugin's admin-app copies instead of the framework originals.
 *
 * These catch a half-completed or hand-edited vendor: existence, non-empty
 * arrays, correct shapes, and uniqueness invariants.
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'SLASHED-for-WP', 'admin-app', 'src', 'data');

const FILES = [
  'api-index.generated.json',
  'token-registry.generated.json',
  'bundles.generated.json',
  'classes.generated.json',
];

describe('vendored admin-app data files', () => {
  test('all four generated files exist', () => {
    for (const f of FILES) {
      assert.ok(fs.existsSync(path.join(DATA, f)), `missing: ${f}`);
    }
  });

  describe('api-index.generated.json', () => {
    let apiIndex;
    before(() => {
      apiIndex = JSON.parse(fs.readFileSync(path.join(DATA, 'api-index.generated.json'), 'utf8'));
    });

    test('has a non-empty tokens array', () => {
      assert.ok(Array.isArray(apiIndex.tokens), 'tokens must be an array');
      assert.ok(apiIndex.tokens.length > 100, `expected >100 tokens, got ${apiIndex.tokens.length}`);
    });

    test('every token has a name, tier, and role', () => {
      for (const t of apiIndex.tokens) {
        assert.ok(typeof t.name === 'string', 'token missing name');
        assert.ok(t.name.startsWith('--sf-'), `token name not --sf-*: ${t.name}`);
        assert.ok(t.tier, `${t.name} missing tier`);
        assert.ok(t.role, `${t.name} missing role`);
      }
    });

    test('token names are unique', () => {
      const names = apiIndex.tokens.map(t => t.name);
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      assert.deepEqual(dupes, [], `duplicate token names: ${dupes.join(', ')}`);
    });

    test('has a _sync metadata block with tokensHash', () => {
      assert.ok(apiIndex._sync, 'missing _sync metadata');
      assert.ok(typeof apiIndex._sync.tokensHash === 'string', 'missing _sync.tokensHash');
      assert.ok(apiIndex._sync.tokensHash.length > 0, '_sync.tokensHash is empty');
    });
  });

  describe('token-registry.generated.json', () => {
    let registry;
    before(() => {
      registry = JSON.parse(fs.readFileSync(path.join(DATA, 'token-registry.generated.json'), 'utf8'));
    });

    test('has a non-empty tokens array', () => {
      assert.ok(Array.isArray(registry.tokens), 'tokens must be an array');
      assert.ok(registry.tokens.length > 100, `expected >100 tokens, got ${registry.tokens.length}`);
    });

    test('every entry has a numeric id and a name', () => {
      for (const t of registry.tokens) {
        assert.ok(typeof t.id === 'number' && Number.isInteger(t.id) && t.id >= 0, `bad id for ${t.name}`);
        assert.ok(typeof t.name === 'string' && t.name.length > 0, 'missing name');
      }
    });

    test('ids are unique', () => {
      const ids = registry.tokens.map(t => t.id);
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      assert.deepEqual(dupes, [], `duplicate ids: ${dupes.join(', ')}`);
    });
  });

  describe('bundles.generated.json', () => {
    let bundles;
    before(() => {
      bundles = JSON.parse(fs.readFileSync(path.join(DATA, 'bundles.generated.json'), 'utf8'));
    });

    test('has a non-empty bundles array', () => {
      assert.ok(Array.isArray(bundles.bundles), 'bundles must be an array');
      assert.ok(bundles.bundles.length > 0, 'bundles array is empty');
    });
  });

  describe('classes.generated.json', () => {
    let classes;
    before(() => {
      classes = JSON.parse(fs.readFileSync(path.join(DATA, 'classes.generated.json'), 'utf8'));
    });

    test('has a non-empty classes array', () => {
      assert.ok(Array.isArray(classes.classes), 'classes must be an array');
      assert.ok(classes.classes.length > 0, 'classes array is empty');
    });

    test('every class has a name and selector', () => {
      for (const c of classes.classes) {
        assert.ok(typeof c.name === 'string' && c.name.length > 0, 'class missing name');
        assert.ok(typeof c.selector === 'string' && c.selector.length > 0, `${c.name} missing selector`);
      }
    });
  });
});
