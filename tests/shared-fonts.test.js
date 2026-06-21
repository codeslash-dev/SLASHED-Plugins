/**
 * Parity tests for the shared system font-stack catalogue (node --test).
 * Mirrors SLASHED/configurator/tests/fonts.test.js.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  SYSTEM_STACKS,
  detectSystemStack,
  isFontFamilyToken,
} from '../SLASHED-for-WP/admin-app/src/lib/fonts.js';

describe('system stacks', () => {
  test('every stack has a label and a non-empty value', () => {
    for (const s of SYSTEM_STACKS) {
      assert.ok(s.label && s.value, JSON.stringify(s));
    }
  });

  test('detect exact and whitespace-insensitive matches', () => {
    assert.equal(detectSystemStack('system-ui, sans-serif').label, 'System UI');
    assert.equal(detectSystemStack('system-ui,    sans-serif').label, 'System UI');
    assert.equal(detectSystemStack('SYSTEM-UI, SANS-SERIF').label, 'System UI');
  });

  test('unknown values and empties return null', () => {
    assert.equal(detectSystemStack('Comic Sans MS'), null);
    assert.equal(detectSystemStack(''), null);
    assert.equal(detectSystemStack(null), null);
  });
});

describe('isFontFamilyToken', () => {
  test('matches by name prefix or syntax — excludes weight/features/numeric/variation', () => {
    // Genuine font-family tokens
    assert.equal(isFontFamilyToken({ name: '--sf-font-body' }), true);
    assert.equal(isFontFamilyToken({ name: '--sf-font-heading' }), true);
    assert.equal(isFontFamilyToken({ name: '--sf-font-mono' }), true);
    assert.equal(isFontFamilyToken({ name: '--sf-font-display' }), true);
    assert.equal(isFontFamilyToken({ name: '--sf-font-geometric' }), true);
    assert.equal(isFontFamilyToken({ syntax: '<font-family>' }), true);
    // namespace alone is NOT sufficient — font-weight tokens share namespace 'font'
    assert.equal(isFontFamilyToken({ namespace: 'font' }), false);
    // Excluded: weight / feature / numeric / variation sibling tokens
    assert.equal(isFontFamilyToken({ name: '--sf-font-weight-heading', namespace: 'font' }), false);
    assert.equal(isFontFamilyToken({ name: '--sf-font-weight-bold',    namespace: 'font' }), false);
    assert.equal(isFontFamilyToken({ name: '--sf-font-features',       namespace: 'font' }), false);
    assert.equal(isFontFamilyToken({ name: '--sf-font-numeric',        namespace: 'font' }), false);
    assert.equal(isFontFamilyToken({ name: '--sf-font-variation',      namespace: 'font' }), false);
    assert.equal(isFontFamilyToken({ name: '--sf-font-weight_bold',    namespace: 'font' }), false);
    // Unrelated tokens
    assert.equal(isFontFamilyToken({ name: '--sf-color-primary' }), false);
    assert.equal(isFontFamilyToken(null), false);
  });
});
