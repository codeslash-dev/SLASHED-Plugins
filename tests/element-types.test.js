/**
 * Unit tests for suggestContainerName (node:test, no browser needed).
 *
 * Run: node --test tests/element-types.test.js
 * Also executed automatically via the `pretest` npm script before Playwright.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  suggestContainerName,
  suggestElementName,
  mergedElementTypeMap,
  ELEMENT_TYPE_LABEL_MAP,
  SOLE_CHILD_LABEL_OVERRIDES,
} from '../SLASHED-for-WP/integrations/bricks/editor-app/src/lib/element-types.js';

describe('suggestContainerName', () => {
  // Layout containers are named after their own Bricks type.
  test('container → "container"', () => assert.equal(suggestContainerName('container'), 'container'));
  test('section → "section"',     () => assert.equal(suggestContainerName('section'), 'section'));
  test('div → "div"',             () => assert.equal(suggestContainerName('div'), 'div'));
  test('block → "block"',         () => assert.equal(suggestContainerName('block'), 'block'));

  // Unknown / empty types fall back to the generic 'item'.
  test('empty string → "item"',      () => assert.equal(suggestContainerName(''), 'item'));
  test('undefined → "item"',         () => assert.equal(suggestContainerName(undefined), 'item'));
  test('null → "item"',              () => assert.equal(suggestContainerName(null), 'item'));
  test('non-container type → "item"', () => assert.equal(suggestContainerName('heading'), 'item'));
  test('input is trimmed',           () => assert.equal(suggestContainerName(' section '), 'section'));

  // Admin override for a container type wins over the type-name default.
  test('admin override wins for a container', () => {
    globalThis.window = { slashedBricksEditor: { rebemerElementMap: { container: 'wrapper' } } };
    try {
      assert.equal(suggestContainerName('container'), 'wrapper');
      assert.equal(suggestContainerName('section'), 'section'); // untouched default
    } finally {
      delete globalThis.window;
    }
  });
});

describe('suggestElementName', () => {
  test('known type → mapped label', () => assert.equal(suggestElementName('heading'), 'heading'));
  test('unknown type → fallback', () => assert.equal(suggestElementName('totally-unknown'), 'item'));
  test('unknown type → custom fallback', () => assert.equal(suggestElementName('totally-unknown', ''), ''));
  test('layout container → fallback (never type label)',
    () => assert.equal(suggestElementName('container', 'item'), 'item'));

  // Newly added type-map entries (workstream 1).
  test('divider → "divider"', () => assert.equal(suggestElementName('divider'), 'divider'));
  test('social-icons → "social"', () => assert.equal(suggestElementName('social-icons'), 'social'));
  test('post-title → "title"', () => assert.equal(suggestElementName('post-title'), 'title'));
  test('progress-bar → "progress"', () => assert.equal(suggestElementName('progress-bar'), 'progress'));
});

describe('SOLE_CHILD_LABEL_OVERRIDES additions', () => {
  test('icon → "icon"', () => assert.equal(SOLE_CHILD_LABEL_OVERRIDES.icon, 'icon'));
  test('svg → "icon"', () => assert.equal(SOLE_CHILD_LABEL_OVERRIDES.svg, 'icon'));
  test('button-group → "actions"', () => assert.equal(SOLE_CHILD_LABEL_OVERRIDES['button-group'], 'actions'));
});

describe('mergedElementTypeMap (user overrides)', () => {
  test('no window → returns built-ins unchanged', () => {
    assert.equal(mergedElementTypeMap().heading, ELEMENT_TYPE_LABEL_MAP.heading);
  });

  test('user override wins over built-in; new keys merge in', () => {
    globalThis.window = { slashedBricksEditor: { rebemerElementMap: { heading: 'hed', widget: 'thing' } } };
    try {
      const merged = mergedElementTypeMap();
      assert.equal(merged.heading, 'hed');       // override wins
      assert.equal(merged.widget, 'thing');      // new key merged
      assert.equal(merged.image, 'image');       // untouched built-in preserved
      assert.equal(suggestElementName('heading'), 'hed');
      // The frozen base is never mutated.
      assert.equal(ELEMENT_TYPE_LABEL_MAP.heading, 'heading');
    } finally {
      delete globalThis.window;
    }
  });
});
