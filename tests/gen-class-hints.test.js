/**
 * Unit tests for buildClassHints() in scripts/gen-class-hints.js — the pure
 * api-index.json → class-hints transform. Locks the extraction rules (class
 * entries only, sf-* / is-* names only, description required, category
 * preserved) so a framework api-index shape change surfaces as a failing test
 * rather than a silently wrong hint map. No framework checkout needed (the
 * module CLI is guarded, so importing runs no I/O).
 *
 * Run: node --test tests/gen-class-hints.test.js
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildClassHints, normalizeDescription } from '../scripts/gen-class-hints.js';

describe('buildClassHints', () => {
  test('keeps sf-* and is-* class entries with their description and category', () => {
    const idx = {
      entries: [
        { type: 'class', name: 'sf-stack', description: 'Flex column.', category: 'Layout primitives' },
        { type: 'class', name: 'sf-is-disabled', description: 'Disabled state.', category: 'State classes' },
        // Bare is-* branch: the framework has moved states to sf-is-*, but the
        // generator (like the runtime resolver) still accepts a bare is-* token.
        { type: 'class', name: 'is-open', description: 'Legacy open state.', category: 'State classes' },
      ],
    };
    const hints = buildClassHints(idx);
    assert.deepEqual(hints['sf-stack'], { description: 'Flex column.', category: 'Layout primitives' });
    assert.deepEqual(hints['sf-is-disabled'], { description: 'Disabled state.', category: 'State classes' });
    assert.deepEqual(hints['is-open'], { description: 'Legacy open state.', category: 'State classes' });
  });

  test('captures BEM modifier classes (double dash) like sf-bento--row-tall', () => {
    const idx = {
      entries: [
        { type: 'class', name: 'sf-bento--row-tall', description: 'Taller default row height.', category: 'Layout primitives' },
      ],
    };
    assert.deepEqual(buildClassHints(idx)['sf-bento--row-tall'], {
      description: 'Taller default row height.',
      category: 'Layout primitives',
    });
  });

  test('skips token entries and non-sf/is class names', () => {
    const idx = {
      entries: [
        { type: 'token', name: '--sf-color-primary', description: 'Primary', category: 'Colors' }, // not a class
        { type: 'class', name: 'sr-only', description: 'Screen-reader only', category: 'Accessibility' }, // unprefixed
        { type: 'class', name: 'no-print', description: 'Hidden in print', category: 'Print' }, // unprefixed
      ],
    };
    assert.deepEqual(buildClassHints(idx), {});
  });

  test('skips class entries that have no description', () => {
    const idx = {
      entries: [
        { type: 'class', name: 'sf-nodesc', category: 'Layout primitives' },
        { type: 'class', name: 'sf-blankdesc', description: '   ', category: 'Layout primitives' },
      ],
    };
    assert.deepEqual(buildClassHints(idx), {});
  });

  test('defaults a missing category to "Classes"', () => {
    const hints = buildClassHints({ entries: [{ type: 'class', name: 'sf-x', description: 'X.' }] });
    assert.deepEqual(hints['sf-x'], { description: 'X.', category: 'Classes' });
  });

  test('trims surrounding whitespace from the description', () => {
    const hints = buildClassHints({ entries: [{ type: 'class', name: 'sf-x', description: '  Trimmed.  ', category: 'C' }] });
    assert.equal(hints['sf-x'].description, 'Trimmed.');
  });

  test('normalizes an upstream-truncated description to its last complete sentence', () => {
    const hints = buildClassHints({
      entries: [{ type: 'class', name: 'sf-x', description: 'First sentence. Second, truncated clause…', category: 'C' }],
    });
    assert.equal(hints['sf-x'].description, 'First sentence.');
  });

  test('tolerates a missing/empty entries array', () => {
    assert.deepEqual(buildClassHints({}), {});
    assert.deepEqual(buildClassHints({ entries: [] }), {});
    assert.deepEqual(buildClassHints(null), {});
  });

  test('skips entries whose name is not a string', () => {
    const hints = buildClassHints({ entries: [{ type: 'class', name: 42 }, { type: 'class' }] });
    assert.deepEqual(hints, {});
  });
});

describe('normalizeDescription', () => {
  test('returns a complete description unchanged (aside from trimming)', () => {
    assert.equal(normalizeDescription('  A full sentence.  '), 'A full sentence.');
    assert.equal(normalizeDescription('No terminator here'), 'No terminator here');
  });

  test('cuts a unicode-ellipsis truncation back to the last complete sentence', () => {
    assert.equal(
      normalizeDescription('Opt a subtree into a fluid scale (issue #497). By default it tracks the container…'),
      'Opt a subtree into a fluid scale (issue #497).',
    );
  });

  test('handles an ASCII "..." truncation too', () => {
    assert.equal(normalizeDescription('Done. More stuff that got cut...'), 'Done.');
  });

  test('does not treat mid-word dots (e.g. tokens.macros.css) as sentence ends', () => {
    // No terminator followed by whitespace before the ellipsis → strip ellipsis only.
    assert.equal(normalizeDescription('See tokens.macros.css for the set…'), 'See tokens.macros.css for the set');
  });

  test('tolerates null / non-string input', () => {
    assert.equal(normalizeDescription(null), '');
    assert.equal(normalizeDescription(undefined), '');
  });
});
