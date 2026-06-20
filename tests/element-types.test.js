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
  getContainerMode,
  ELEMENT_TYPE_LABEL_MAP,
  SOLE_CHILD_LABEL_OVERRIDES,
} from '../SLASHED-for-WP/integrations/bricks/editor-app/src/lib/element-types.js';

const s = (types, pos = 0, total = 1) => suggestContainerName(types, pos, total);

describe('suggestContainerName', () => {
  test('form → "form"',      () => assert.equal(s(['form']), 'form'));
  test('nav-nested → "nav"', () => assert.equal(s(['nav-nested']), 'nav'));
  test('nav-menu → "nav"',   () => assert.equal(s(['nav-menu']), 'nav'));

  test('button only → "actions"',       () => assert.equal(s(['button']), 'actions'));
  test('button-group only → "actions"', () => assert.equal(s(['button-group']), 'actions'));

  test('image only → "media"', () => assert.equal(s(['image']), 'media'));

  test('heading only → "header"',        () => assert.equal(s(['heading']), 'header'));
  test('heading + button → "header"',    () => assert.equal(s(['heading', 'button']), 'header'));

  test('text only → "body"',             () => assert.equal(s(['text']), 'body'));
  test('text-basic only → "body"',       () => assert.equal(s(['text-basic']), 'body'));

  test('heading + text → "content"',                () => assert.equal(s(['heading', 'text']), 'content'));
  test('heading + text-basic → "content"',          () => assert.equal(s(['heading', 'text-basic']), 'content'));
  test('heading + text + button → "content"',       () => assert.equal(s(['heading', 'text', 'button']), 'content'));
  test('heading + text-basic + button → "content"', () => assert.equal(s(['heading', 'text-basic', 'button']), 'content'));

  test('icon only → "icon-group"',      () => assert.equal(s(['icon']), 'icon-group'));
  test('icon-box only → "icon-group"',  () => assert.equal(s(['icon-box']), 'icon-group'));

  test('list → "list-wrap"', () => assert.equal(s(['list']), 'list-wrap'));

  test('empty → "content" (single sibling)', () => assert.equal(s([], 0, 1), 'content'));

  test('positional: first of multiple siblings → "header"',
    () => assert.equal(s([], 0, 3), 'header'));
  test('positional: last of multiple siblings → "footer"',
    () => assert.equal(s([], 2, 3), 'footer'));
  test('positional: middle of multiple siblings → "body"',
    () => assert.equal(s([], 1, 3), 'body'));

  // Container mode gate (workstream 3).
  test('generic mode → "item" regardless of children',
    () => assert.equal(suggestContainerName(['heading', 'text'], 0, 1, 'generic'), 'item'));
  test('role mode (explicit) still infers',
    () => assert.equal(suggestContainerName(['heading', 'text'], 0, 1, 'role'), 'content'));
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

describe('getContainerMode', () => {
  test('defaults to "role" with no window', () => assert.equal(getContainerMode(), 'role'));
  test('reads "generic" from localized config', () => {
    globalThis.window = { slashedBricksEditor: { rebemerContainerMode: 'generic' } };
    try {
      assert.equal(getContainerMode(), 'generic');
    } finally {
      delete globalThis.window;
    }
  });
});
