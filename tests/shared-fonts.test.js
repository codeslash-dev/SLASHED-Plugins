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
} from '../SLASHED-for-WP/integrations/bricks/admin-app/src/lib/fonts.js';

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
  test('matches by namespace, name prefix or syntax', () => {
    assert.equal(isFontFamilyToken({ namespace: 'font' }), true);
    assert.equal(isFontFamilyToken({ name: '--sf-font-body' }), true);
    assert.equal(isFontFamilyToken({ syntax: '<font-family>' }), true);
    assert.equal(isFontFamilyToken({ name: '--sf-color-primary' }), false);
    assert.equal(isFontFamilyToken(null), false);
  });
});
