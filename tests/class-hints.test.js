/**
 * Unit tests for resolveClassName (node:test, no browser needed).
 *
 * Run: node --test tests/class-hints.test.js
 * Also executed automatically via the `pretest` npm script before Playwright.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { resolveClassName } from '../SLASHED-for-WP/integrations/bricks/editor-app/src/lib/class-hints.js';

const HINTS = {
  'sf-stack': { description: 'Flex column with even spacing.', category: 'Layout' },
  'sf-stack--xl': { description: 'Flex column with even spacing.', category: 'Layout' },
  'is-hidden': { description: 'Hides the element.', category: 'States' },
};

describe('resolveClassName', () => {
  test('plain sf- class resolves', () => {
    assert.deepEqual(resolveClassName('sf-stack', HINTS), {
      name: 'sf-stack', description: 'Flex column with even spacing.', category: 'Layout',
    });
  });

  test('leading dot is stripped', () => {
    assert.equal(resolveClassName('.sf-stack', HINTS)?.name, 'sf-stack');
  });

  test('surrounding whitespace is trimmed', () => {
    assert.equal(resolveClassName('  sf-stack  ', HINTS)?.name, 'sf-stack');
  });

  test('modifier class resolves on its own key', () => {
    assert.equal(resolveClassName('sf-stack--xl', HINTS)?.name, 'sf-stack--xl');
  });

  test('is- state class resolves', () => {
    assert.equal(resolveClassName('is-hidden', HINTS)?.category, 'States');
  });

  test('unknown class returns null', () => {
    assert.equal(resolveClassName('sf-nope', HINTS), null);
  });

  test('non-sf/is prefix returns null', () => {
    assert.equal(resolveClassName('container', HINTS), null);
  });

  test('multi-token strings (whole rows) return null', () => {
    assert.equal(resolveClassName('sf-stack and more text', HINTS), null);
    assert.equal(resolveClassName('Section sf-stack', HINTS), null);
  });

  test('empty / nullish input returns null', () => {
    assert.equal(resolveClassName('', HINTS), null);
    assert.equal(resolveClassName(null, HINTS), null);
    assert.equal(resolveClassName(undefined, HINTS), null);
  });

  test('missing hints map returns null', () => {
    assert.equal(resolveClassName('sf-stack', null), null);
  });

  test('inherited Object prototype keys are not treated as hints', () => {
    assert.equal(resolveClassName('toString', HINTS), null);
    assert.equal(resolveClassName('sf-constructor', HINTS), null);
  });
});
