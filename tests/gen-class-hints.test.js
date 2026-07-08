/**
 * Unit tests for the pure logic in scripts/gen-class-hints.js.
 *
 * The generator parses framework CSS section comments into class-name hints.
 * A silent change to the framework's comment format would produce wrong hints
 * that the drift check (which only compares "regen == committed") can't flag as
 * *wrong*, only as *changed*. These tests lock the parser's contract and the
 * curated-merge precedence against a synthetic CSS fixture — no framework
 * checkout required (the module's CLI is guarded, so importing runs no I/O).
 *
 * Run: node --test tests/gen-class-hints.test.js
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseCss, applyCuratedHints, MANUAL_HINTS, OVERRIDE_HINTS } from '../scripts/gen-class-hints.js';

describe('parseCss', () => {
  test('assigns a section description to its base class and all modifiers', () => {
    const css = [
      '/* -- Stack -----------',
      '   Flex column with even vertical spacing between children. */',
      '.sf-stack     { }',
      '.sf-stack--xs { }',
      '.sf-stack--xl { }',
    ].join('\n');

    const hints = parseCss(css, 'Layout');
    const expected = { description: 'Flex column with even vertical spacing between children.', category: 'Layout' };
    assert.deepEqual(hints['sf-stack'], expected);
    assert.deepEqual(hints['sf-stack--xs'], expected);
    assert.deepEqual(hints['sf-stack--xl'], expected);
  });

  test('separates consecutive sections and captures is-* classes', () => {
    const css = [
      '/* -- Stack -----',
      '   Stack desc. */',
      '.sf-stack { }',
      '/* -- Cluster -----',
      '   Cluster desc. */',
      '.sf-cluster { }',
      '.is-clustered { }',
    ].join('\n');

    const hints = parseCss(css, 'Layout');
    assert.equal(hints['sf-stack'].description, 'Stack desc.');
    assert.equal(hints['sf-cluster'].description, 'Cluster desc.');
    assert.equal(hints['is-clustered'].description, 'Cluster desc.');
  });

  test('falls back to the section title when the body has no description line', () => {
    const css = '/* -- LonelyTitle ------\n   -------------- */\n.sf-lonely { }';
    assert.equal(parseCss(css, 'Cat')['sf-lonely'].description, 'LonelyTitle');
  });

  test('ignores class names that appear only inside a comment', () => {
    const css = '/* -- X -----\n  desc */\n.sf-real { }\n/* .sf-ghost lives in a comment */';
    const hints = parseCss(css, 'Cat');
    assert.ok(hints['sf-real']);
    assert.equal(hints['sf-ghost'], undefined);
  });

  test('ignores classes that appear before any section comment', () => {
    assert.deepEqual(parseCss('.sf-orphan { }', 'Cat'), {});
  });
});

describe('applyCuratedHints', () => {
  test('OVERRIDE_HINTS always win over a parsed entry', () => {
    const merged = applyCuratedHints({ 'sf-bento': { description: 'auto-parsed', category: 'X' } });
    assert.equal(merged['sf-bento'].description, OVERRIDE_HINTS['sf-bento'].description);
  });

  test('MANUAL_HINTS fill gaps for classes that were not parsed', () => {
    const merged = applyCuratedHints({});
    assert.deepEqual(merged['is-hidden'], MANUAL_HINTS['is-hidden']);
  });

  test('MANUAL_HINTS do NOT override an already-parsed entry', () => {
    const merged = applyCuratedHints({ 'is-hidden': { description: 'PARSED', category: 'Y' } });
    assert.equal(merged['is-hidden'].description, 'PARSED');
  });

  test('does not mutate its input', () => {
    const input = { 'sf-x': { description: 'd', category: 'c' } };
    applyCuratedHints(input);
    assert.deepEqual(Object.keys(input), ['sf-x']);
  });
});
