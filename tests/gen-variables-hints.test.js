/**
 * Unit tests for buildVariableHints() in scripts/gen-variables-hints.js — the
 * pure api-index.json → variable-hints transform. Locks the extraction rules
 * (token-only, --sf- prefix, `--` stripped, category default) so a framework
 * api-index shape change surfaces as a failing test, not a silently wrong hint
 * map. No framework checkout needed (the module CLI is guarded).
 *
 * Run: node --test tests/gen-variables-hints.test.js
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildVariableHints } from '../scripts/gen-variables-hints.js';

describe('buildVariableHints', () => {
  test('keeps only --sf- token entries and strips the leading --', () => {
    const idx = {
      entries: [
        { type: 'token', name: '--sf-color-primary', description: 'Primary', category: 'Colors' },
        { type: 'token', name: '--other-var', description: 'skip', category: 'X' }, // not --sf-
        { type: 'mixin', name: '--sf-nope', description: 'skip' },                   // not a token
      ],
    };
    const hints = buildVariableHints(idx);
    assert.deepEqual(Object.keys(hints), ['sf-color-primary']); // '--' stripped, 'sf-' kept
    assert.deepEqual(hints['sf-color-primary'], { description: 'Primary', category: 'Colors' });
  });

  test('defaults description to "" and category to "Core tokens"', () => {
    const hints = buildVariableHints({ entries: [{ type: 'token', name: '--sf-space-m' }] });
    assert.deepEqual(hints['sf-space-m'], { description: '', category: 'Core tokens' });
  });

  test('tolerates a missing/empty entries array', () => {
    assert.deepEqual(buildVariableHints({}), {});
    assert.deepEqual(buildVariableHints({ entries: [] }), {});
    assert.deepEqual(buildVariableHints(null), {});
  });

  test('skips entries whose name is not a string', () => {
    const hints = buildVariableHints({ entries: [{ type: 'token', name: 42 }, { type: 'token' }] });
    assert.deepEqual(hints, {});
  });
});
