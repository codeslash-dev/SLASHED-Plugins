/**
 * Unit tests for suggestContainerName (node:test, no browser needed).
 *
 * Run: node --test tests/element-types.test.js
 * Also executed automatically via the `pretest` npm script before Playwright.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { suggestContainerName } from '../SLASHED-for-WP/integrations/bricks/editor-app/src/lib/element-types.js';

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
});
