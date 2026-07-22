/**
 * Unit tests for the Gutenberg panel's apply layer (#53) — the module that
 * writes to the selected block via wp.data. Exercised with a minimal mock of
 * the `core/block-editor` store, no browser or WordPress runtime needed.
 *
 * Covers the issue's acceptance criteria:
 *   - color / gradient apply writes to the block's `style` attribute,
 *   - class toggle writes to `className`,
 *   - everything fails silently when wp.data is unavailable.
 *
 * Run: node --test tests/gutenberg-apply.test.js
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  selectedClientId, selectedClientIds, applyColor, applyGradient, applyFontSize,
  hasClass, toggleClass,
} from '../SLASHED-for-WP/integrations/gutenberg/assets/editor/apply.js';

/** Build a mock wp.data with a small block registry and selection state. */
function mockEditor(blocks, { selected = null, multi = [] } = {}) {
  const registry = new Map(blocks.map((b) => [b.clientId, b]));
  const updates = [];
  const select = {
    getSelectedBlockClientId: () => selected,
    getMultiSelectedBlockClientIds: () => multi,
    getBlock: (id) => registry.get(id) || null,
  };
  const dispatch = {
    updateBlockAttributes: (id, attrs) => {
      const block = registry.get(id);
      block.attributes = { ...block.attributes, ...attrs };
      updates.push({ id, attrs });
    },
  };
  // The `window` object the apply layer reads: window.wp.data.{select,dispatch}.
  const win = {
    wp: { data: { select: (name) => (name === 'core/block-editor' ? select : null), dispatch: (name) => (name === 'core/block-editor' ? dispatch : null) } },
  };
  return { win, updates, registry };
}

function block(clientId, attributes = {}) {
  return { clientId, name: 'core/group', attributes };
}

beforeEach(() => { delete globalThis.window; });

describe('selection helpers', () => {
  test('single selection', () => {
    globalThis.window = mockEditor([block('a')], { selected: 'a' }).win;
    assert.equal(selectedClientId(), 'a');
    assert.deepEqual(selectedClientIds(), ['a']);
  });

  test('multi selection falls back to the first id for single-target ops', () => {
    globalThis.window = mockEditor([block('a'), block('b')], { multi: ['a', 'b'] }).win;
    assert.equal(selectedClientId(), 'a');
    assert.deepEqual(selectedClientIds(), ['a', 'b']);
  });
});

describe('color / gradient apply writes style', () => {
  test('background color', () => {
    const env = mockEditor([block('a')], { selected: 'a' });
    globalThis.window = env.win;
    assert.equal(applyColor('background', 'var(--sf-color-primary)'), true);
    assert.deepEqual(env.registry.get('a').attributes.style, { color: { background: 'var(--sf-color-primary)' } });
  });

  test('text color', () => {
    const env = mockEditor([block('a')], { selected: 'a' });
    globalThis.window = env.win;
    applyColor('text', 'var(--sf-color-text)');
    assert.deepEqual(env.registry.get('a').attributes.style, { color: { text: 'var(--sf-color-text)' } });
  });

  test('border color uses the border.color path', () => {
    const env = mockEditor([block('a')], { selected: 'a' });
    globalThis.window = env.win;
    applyColor('border', 'var(--sf-color-border)');
    assert.deepEqual(env.registry.get('a').attributes.style, { border: { color: 'var(--sf-color-border)' } });
  });

  test('gradient', () => {
    const env = mockEditor([block('a')], { selected: 'a' });
    globalThis.window = env.win;
    applyGradient('var(--sf-gradient-brand)');
    assert.deepEqual(env.registry.get('a').attributes.style, { color: { gradient: 'var(--sf-gradient-brand)' } });
  });

  test('font size', () => {
    const env = mockEditor([block('a')], { selected: 'a' });
    globalThis.window = env.win;
    applyFontSize('var(--sf-text-l)');
    assert.deepEqual(env.registry.get('a').attributes.style, { typography: { fontSize: 'var(--sf-text-l)' } });
  });

  test('deep-merges into existing style without clobbering siblings', () => {
    const env = mockEditor([block('a', { style: { color: { text: 'red' }, spacing: { padding: '1rem' } } })], { selected: 'a' });
    globalThis.window = env.win;
    applyColor('background', 'var(--sf-color-primary)');
    assert.deepEqual(env.registry.get('a').attributes.style, {
      color: { text: 'red', background: 'var(--sf-color-primary)' },
      spacing: { padding: '1rem' },
    });
  });

  test('applies to every block in a multi-selection', () => {
    const env = mockEditor([block('a'), block('b')], { multi: ['a', 'b'] });
    globalThis.window = env.win;
    assert.equal(applyColor('background', 'var(--sf-color-primary)'), true);
    assert.equal(env.registry.get('a').attributes.style.color.background, 'var(--sf-color-primary)');
    assert.equal(env.registry.get('b').attributes.style.color.background, 'var(--sf-color-primary)');
  });
});

describe('class toggle writes className', () => {
  test('adds a class when absent, removes it when present', () => {
    const env = mockEditor([block('a')], { selected: 'a' });
    globalThis.window = env.win;

    assert.equal(hasClass('sf-stack'), false);
    assert.equal(toggleClass('sf-stack'), true);
    assert.equal(env.registry.get('a').attributes.className, 'sf-stack');
    assert.equal(hasClass('sf-stack'), true);

    assert.equal(toggleClass('sf-stack'), false);
    assert.equal(env.registry.get('a').attributes.className, '');
    assert.equal(hasClass('sf-stack'), false);
  });

  test('preserves unrelated existing classes', () => {
    const env = mockEditor([block('a', { className: 'has-background wp-custom' })], { selected: 'a' });
    globalThis.window = env.win;
    toggleClass('sf-grid');
    assert.deepEqual(env.registry.get('a').attributes.className.split(' ').sort(), ['has-background', 'sf-grid', 'wp-custom']);
  });

  test('converges a mixed selection to a single consistent state', () => {
    const env = mockEditor([block('a', { className: 'sf-stack' }), block('b')], { multi: ['a', 'b'] });
    globalThis.window = env.win;
    // First block has the class → toggle decides "remove" and applies uniformly.
    assert.equal(toggleClass('sf-stack'), false);
    assert.equal(env.registry.get('a').attributes.className, '');
    assert.equal(env.registry.get('b').attributes.className, '');
  });
});

describe('fail-silent when wp.data is unavailable', () => {
  test('no window.wp → reads return empty, writes are no-ops', () => {
    // window undefined (default from beforeEach)
    assert.equal(selectedClientId(), null);
    assert.deepEqual(selectedClientIds(), []);
    assert.equal(applyColor('background', 'var(--sf-color-primary)'), false);
    assert.equal(applyGradient('var(--sf-gradient-brand)'), false);
    assert.equal(hasClass('sf-stack'), false);
    assert.equal(toggleClass('sf-stack'), null);
  });

  test('window without wp.data → still fails silently', () => {
    globalThis.window = { wp: {} };
    assert.equal(selectedClientId(), null);
    assert.equal(applyColor('text', 'var(--sf-color-text)'), false);
    assert.equal(toggleClass('sf-grid'), null);
  });

  test('nothing selected → writes are no-ops, toggle returns null', () => {
    globalThis.window = mockEditor([block('a')], { selected: null }).win;
    assert.equal(applyColor('background', 'var(--sf-color-primary)'), false);
    assert.equal(toggleClass('sf-stack'), null);
  });
});
