/**
 * Unit tests for the reBEMer apply engine (node:test, no browser needed).
 *
 * buildPlan()/computeBlockAssignment() are pure and tested directly.
 * applyToSubtree() talks to live Bricks state only through bricks-api.js,
 * which itself only needs `document.querySelector('[data-v-app]')` to
 * return a Vue-app-shaped object exposing `$_state` — so these tests stub
 * that one DOM call with an in-memory fake state object and let the real
 * bricks-api.js + apply.js code run against it. This exercises the actual
 * integration (findElement, upsertGlobalClass, setElementClasses, the
 * batchMutations/rollback path) rather than a synthetic mock of the API
 * surface.
 *
 * Run: node --test tests/apply.test.js
 * Also executed automatically via the `pretest` npm script before Playwright.
 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBlockAssignment,
  buildPlan,
  applyToSubtree,
} from '../SLASHED-for-WP/integrations/bricks/editor-app/src/lib/apply.js';

// ─── computeBlockAssignment ──────────────────────────────────────────────

describe('computeBlockAssignment', () => {
  test('root row maps to its own slugified name', () => {
    const rows = [{ id: 'root', depth: 0, name: 'Card', include: true }];
    const map = computeBlockAssignment(rows, 'root');
    assert.equal(map.get('root'), 'card');
  });

  test('descendant rows inherit the nearest ancestor block', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Card', include: true },
      { id: 'a', depth: 1, name: 'Image', include: true },
      { id: 'b', depth: 2, name: 'Caption', include: true },
    ];
    const map = computeBlockAssignment(rows, 'root');
    assert.equal(map.get('a'), 'card');
    assert.equal(map.get('b'), 'card');
  });

  test('a sub-block root starts a new block scope for its descendants', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Page', include: true },
      { id: 'sub', depth: 1, name: 'Card', include: true, isBlockRoot: true },
      { id: 'inner', depth: 2, name: 'Title', include: true },
    ];
    const map = computeBlockAssignment(rows, 'root');
    assert.equal(map.get('sub'), 'card');
    assert.equal(map.get('inner'), 'card');
  });

  test('depth-based stack pops sub-blocks once a sibling/uncle row is reached', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Page', include: true },
      { id: 'sub', depth: 1, name: 'Card', include: true, isBlockRoot: true },
      { id: 'inner', depth: 2, name: 'Title', include: true },
      { id: 'after', depth: 1, name: 'Footer', include: true },
    ];
    const map = computeBlockAssignment(rows, 'root');
    // 'after' is back at depth 1, same as the popped sub-block root, so it
    // reverts to the root block, not 'card'.
    assert.equal(map.get('after'), 'page');
  });

  test('a skipped (include:false) sub-block root does not push a new scope', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Page', include: true },
      { id: 'sub', depth: 1, name: 'Card', include: false, isBlockRoot: true },
      { id: 'inner', depth: 2, name: 'Title', include: true },
    ];
    const map = computeBlockAssignment(rows, 'root');
    assert.equal(map.has('sub'), false);
    assert.equal(map.get('inner'), 'page');
  });
});

// ─── buildPlan ────────────────────────────────────────────────────────────

describe('buildPlan validation', () => {
  test('rejects an invalid mode', () => {
    const result = buildPlan({ rootId: 'root', rows: [{ id: 'root', depth: 0, name: 'Card', include: true }], mode: 'bogus' });
    assert.equal(result.ok, false);
    assert.match(result.error, /Invalid mode/);
    assert.deepEqual(result.ops, []);
  });

  test('rejects when the root row is missing from rows', () => {
    const result = buildPlan({ rootId: 'root', rows: [{ id: 'other', depth: 0, name: 'X', include: true }], mode: 'add' });
    assert.equal(result.ok, false);
    assert.match(result.error, /Root row missing/);
  });

  test('rejects an empty block name', () => {
    const result = buildPlan({ rootId: 'root', rows: [{ id: 'root', depth: 0, name: '   ', include: true }], mode: 'add' });
    assert.equal(result.ok, false);
    assert.match(result.error, /Block name is empty/);
  });

  test('rejects empty sub-block names, reporting all of them', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Card', include: true },
      { id: 'a', depth: 1, name: '   ', include: true, isBlockRoot: true, originalLabel: 'Block A' },
      { id: 'b', depth: 1, name: '###', include: true, isBlockRoot: true, originalLabel: 'Block B' },
    ];
    const result = buildPlan({ rootId: 'root', rows, mode: 'add' });
    assert.equal(result.ok, false);
    assert.match(result.error, /Block A/);
    assert.match(result.error, /Block B/);
  });

  test('rejects when no included rows produce an op', () => {
    const rows = [{ id: 'root', depth: 0, name: 'Card', include: false }];
    const result = buildPlan({ rootId: 'root', rows, mode: 'add' });
    assert.equal(result.ok, false);
    assert.match(result.error, /No rows to apply/);
  });
});

describe('buildPlan happy path', () => {
  test('builds block and element__name classes', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Card', include: true },
      { id: 'img', depth: 1, name: 'Image', include: true },
    ];
    const result = buildPlan({ rootId: 'root', rows, mode: 'add' });
    assert.equal(result.ok, true);
    const byId = Object.fromEntries(result.ops.map(o => [o.row.id, o]));
    assert.equal(byId.root.finalClass, 'card');
    assert.equal(byId.root.isRoot, true);
    assert.equal(byId.img.finalClass, 'card__image');
    assert.equal(byId.img.isRoot, false);
  });

  test('excludes rows with include:false from the plan', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Card', include: true },
      { id: 'img', depth: 1, name: 'Image', include: false },
    ];
    const result = buildPlan({ rootId: 'root', rows, mode: 'add' });
    assert.equal(result.ok, true);
    assert.equal(result.ops.length, 1);
    assert.equal(result.ops[0].row.id, 'root');
  });

  test('a sub-block root gets its own block name, not parentBlock__name', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Page', include: true },
      { id: 'sub', depth: 1, name: 'Card', include: true, isBlockRoot: true },
      { id: 'inner', depth: 2, name: 'Title', include: true },
    ];
    const result = buildPlan({ rootId: 'root', rows, mode: 'add' });
    assert.equal(result.ok, true);
    const byId = Object.fromEntries(result.ops.map(o => [o.row.id, o]));
    assert.equal(byId.sub.finalClass, 'card');
    assert.equal(byId.sub.isRoot, true);
    assert.equal(byId.inner.finalClass, 'card__title');
  });

  test('resolves modifiers against the post-numbered base class', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Card', include: true },
      { id: 'a', depth: 1, name: 'Image', include: true, suggestedFrom: 'element-type', modifiers: ['Large'] },
      { id: 'b', depth: 1, name: 'Image', include: true, suggestedFrom: 'element-type', modifiers: ['Small'] },
    ];
    const result = buildPlan({ rootId: 'root', rows, mode: 'add' });
    assert.equal(result.ok, true);
    const byId = Object.fromEntries(result.ops.map(o => [o.row.id, o]));
    // Both collide on 'card__image' and are non-authoritative -> auto-numbered.
    assert.equal(byId.a.finalClass, 'card__image-1');
    assert.equal(byId.b.finalClass, 'card__image-2');
    assert.deepEqual(byId.a.modifierSlugs, ['large']);
    assert.deepEqual(byId.b.modifierSlugs, ['small']);
  });

  test('migrate mode does not populate modifierSlugs', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Card', include: true, modifiers: ['Big'] },
    ];
    const result = buildPlan({ rootId: 'root', rows, mode: 'migrate' });
    assert.equal(result.ok, true);
    assert.deepEqual(result.ops[0].modifierSlugs, []);
  });
});

describe('buildPlan auto-numbering', () => {
  test('non-authoritative siblings colliding on the same class get -1, -2 suffixes in document order', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Card', include: true },
      { id: 'a', depth: 1, name: 'Image', include: true, suggestedFrom: 'fallback' },
      { id: 'b', depth: 1, name: 'Image', include: true, suggestedFrom: 'element-type' },
    ];
    const result = buildPlan({ rootId: 'root', rows, mode: 'add' });
    assert.equal(result.ok, true);
    const byId = Object.fromEntries(result.ops.map(o => [o.row.id, o]));
    assert.equal(byId.a.finalClass, 'card__image-1');
    assert.equal(byId.a.suggestedFrom, 'auto-number');
    assert.equal(byId.b.finalClass, 'card__image-2');
    assert.equal(byId.b.suggestedFrom, 'auto-number');
  });

  test('two authoritative (user/label) rows colliding is a hard error', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Card', include: true },
      { id: 'a', depth: 1, name: 'Image', include: true, suggestedFrom: 'user' },
      { id: 'b', depth: 1, name: 'Image', include: true, suggestedFrom: 'label' },
    ];
    const result = buildPlan({ rootId: 'root', rows, mode: 'add' });
    assert.equal(result.ok, false);
    assert.match(result.error, /used by 2 rows/);
  });

  test('an authoritative row is never renumbered even when it collides with non-authoritative siblings', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Card', include: true },
      { id: 'a', depth: 1, name: 'Image', include: true, suggestedFrom: 'user' },
      { id: 'b', depth: 1, name: 'Image', include: true, suggestedFrom: 'fallback' },
    ];
    const result = buildPlan({ rootId: 'root', rows, mode: 'add' });
    assert.equal(result.ok, true);
    const byId = Object.fromEntries(result.ops.map(o => [o.row.id, o]));
    assert.equal(byId.a.finalClass, 'card__image'); // untouched
    assert.equal(byId.a.suggestedFrom, 'user');
    assert.equal(byId.b.finalClass, 'card__image-1');
  });

  test('a post-numbering collision between a user-typed name and an auto-numbered one is a hard error', () => {
    const rows = [
      { id: 'root', depth: 0, name: 'Card', include: true },
      // Two auto-numbered siblings would normally become card__image-1/-2,
      // but a third row is user-typed as exactly 'card__image-1'.
      { id: 'a', depth: 1, name: 'Image', include: true, suggestedFrom: 'fallback' },
      { id: 'b', depth: 1, name: 'Image', include: true, suggestedFrom: 'fallback' },
      { id: 'c', depth: 1, name: 'Image-1', include: true, suggestedFrom: 'user' },
    ];
    const result = buildPlan({ rootId: 'root', rows, mode: 'add' });
    assert.equal(result.ok, false);
    assert.match(result.error, /produced by 2 rows after auto-numbering/);
  });
});

// ─── applyToSubtree ─────────────────────────────────────────────────────
//
// bricks-api.js resolves live state via one DOM call:
// document.querySelector('[data-v-app]').__vue_app__.config.globalProperties.$_state
// Stubbing that call with an in-memory object lets the real bricks-api.js
// (findElement, upsertGlobalClass, setElementClasses, batchMutations, …)
// run against a fake-but-real Bricks-shaped state tree.

function installFakeBricksApp(state) {
  const fakeApp = {
    __vue_app__: { config: { globalProperties: { $_state: state } } },
  };
  globalThis.document = {
    querySelector(sel) {
      return sel === '[data-v-app]' ? fakeApp : null;
    },
  };
}

function makeState({ content, globalClasses = [] } = {}) {
  return { header: [], footer: [], content, globalClasses };
}

let apiModule;

beforeEach(async () => {
  // Re-import bricks-api.js's internal module state is process-wide (module
  // singleton), so re-probe against the fresh fake app each test instead of
  // re-importing.
  apiModule = await import('../SLASHED-for-WP/integrations/bricks/editor-app/src/lib/bricks-api.js');
});

afterEach(() => {
  delete globalThis.document;
});

describe('applyToSubtree: add mode', () => {
  test('creates a new global class and attaches it to the element', () => {
    const root = { id: 'root', name: 'card', label: 'Card', children: [], settings: {} };
    const state = makeState({ content: [root] });
    installFakeBricksApp(state);
    apiModule.probe();

    const rows = [{ id: 'root', depth: 0, name: 'Card', include: true }];
    const result = applyToSubtree({ rootId: 'root', rows, mode: 'add', syncLabels: false });

    assert.equal(result.ok, true);
    assert.equal(result.count, 1);
    assert.equal(state.globalClasses.length, 1);
    assert.equal(state.globalClasses[0].name, 'card');
    assert.deepEqual(root.settings._cssGlobalClasses, [state.globalClasses[0].id]);
  });

  test('keeps existing classes when adding', () => {
    const root = { id: 'root', name: 'card', label: 'Card', children: [], settings: { _cssGlobalClasses: ['old-id'] } };
    const state = makeState({ content: [root], globalClasses: [{ id: 'old-id', name: 'legacy', settings: {} }] });
    installFakeBricksApp(state);
    apiModule.probe();

    const rows = [{ id: 'root', depth: 0, name: 'Card', include: true }];
    const result = applyToSubtree({ rootId: 'root', rows, mode: 'add', syncLabels: false });

    assert.equal(result.ok, true);
    assert.deepEqual(root.settings._cssGlobalClasses.sort(), ['old-id', state.globalClasses.find(c => c.name === 'card').id].sort());
  });
});

describe('applyToSubtree: rename mode', () => {
  test('renames the family base and its modifier siblings, seeding settings from the old base', () => {
    const root = {
      id: 'root', name: 'card', label: 'Card', children: [],
      settings: { _cssGlobalClasses: ['old-base', 'old-mod'] },
    };
    const state = makeState({
      content: [root],
      globalClasses: [
        { id: 'old-base', name: 'box', settings: { _padding: '10px' } },
        { id: 'old-mod', name: 'box--large', settings: { _fontSize: '20px' } },
      ],
    });
    installFakeBricksApp(state);
    apiModule.probe();

    const rows = [{ id: 'root', depth: 0, name: 'Card', include: true }];
    const result = applyToSubtree({ rootId: 'root', rows, mode: 'rename', syncLabels: false });

    assert.equal(result.ok, true);
    const names = root.settings._cssGlobalClasses
      .map(id => state.globalClasses.find(c => c.id === id).name)
      .sort();
    assert.deepEqual(names, ['card', 'card--large']);
    const newBase = state.globalClasses.find(c => c.name === 'card');
    assert.deepEqual(newBase.settings, { _padding: '10px' }); // seeded from old base
  });

  test('removeExisting strips unrelated classes when renaming', () => {
    const root = {
      id: 'root', name: 'card', label: 'Card', children: [],
      settings: { _cssGlobalClasses: ['old-base', 'unrelated'] },
    };
    const state = makeState({
      content: [root],
      globalClasses: [
        { id: 'old-base', name: 'box', settings: {} },
        { id: 'unrelated', name: 'u-mt-4', settings: {} },
      ],
    });
    installFakeBricksApp(state);
    apiModule.probe();

    const rows = [{ id: 'root', depth: 0, name: 'Card', include: true }];
    const result = applyToSubtree({ rootId: 'root', rows, mode: 'rename', syncLabels: false, removeExisting: true });

    assert.equal(result.ok, true);
    const names = root.settings._cssGlobalClasses.map(id => state.globalClasses.find(c => c.id === id).name);
    assert.deepEqual(names, ['card']);
  });
});

describe('applyToSubtree: replace mode', () => {
  test('with no family selected, strips every existing class and attaches only the new one', () => {
    const root = {
      id: 'root', name: 'card', label: 'Card', children: [],
      settings: { _cssGlobalClasses: ['a', 'b'] },
    };
    const state = makeState({
      content: [root],
      globalClasses: [{ id: 'a', name: 'x', settings: {} }, { id: 'b', name: 'y', settings: {} }],
    });
    installFakeBricksApp(state);
    apiModule.probe();

    const rows = [{ id: 'root', depth: 0, name: 'Card', include: true }];
    const result = applyToSubtree({ rootId: 'root', rows, mode: 'replace', syncLabels: false });

    assert.equal(result.ok, true);
    const names = root.settings._cssGlobalClasses.map(id => state.globalClasses.find(c => c.id === id).name);
    assert.deepEqual(names, ['card']);
  });

  test('with a targeted family, strips only that family and keeps unrelated classes', () => {
    const root = {
      id: 'root', name: 'card', label: 'Card', children: [],
      settings: { _cssGlobalClasses: ['old-base', 'old-mod', 'unrelated'] },
    };
    const state = makeState({
      content: [root],
      globalClasses: [
        { id: 'old-base', name: 'box', settings: {} },
        { id: 'old-mod', name: 'box--large', settings: {} },
        { id: 'unrelated', name: 'u-mt-4', settings: {} },
      ],
    });
    installFakeBricksApp(state);
    apiModule.probe();

    const rows = [{ id: 'root', depth: 0, name: 'Card', include: true, renameFamilyId: 'old-base' }];
    const result = applyToSubtree({ rootId: 'root', rows, mode: 'replace', syncLabels: false });

    assert.equal(result.ok, true);
    const names = root.settings._cssGlobalClasses.map(id => state.globalClasses.find(c => c.id === id).name).sort();
    assert.deepEqual(names, ['card', 'u-mt-4']);
  });
});

describe('applyToSubtree: migrate mode', () => {
  test('lifts allowlisted keys into a new class and removes them from the element', () => {
    const root = {
      id: 'root', name: 'card', label: 'Card', children: [],
      settings: { _cssGlobalClasses: [], _padding: '10px', dynamicDataToken: 'should-stay' },
    };
    const state = makeState({ content: [root] });
    installFakeBricksApp(state);
    apiModule.probe();

    const rows = [{ id: 'root', depth: 0, name: 'Card', include: true, migrateKeys: ['_padding', 'dynamicDataToken'] }];
    const result = applyToSubtree({ rootId: 'root', rows, mode: 'migrate', syncLabels: false });

    assert.equal(result.ok, true);
    const cls = state.globalClasses.find(c => c.name === 'card');
    // Only the allowlisted key is lifted (defense-in-depth re-filter).
    assert.deepEqual(cls.settings, { _padding: '10px' });
    assert.equal(root.settings._padding, undefined);
    assert.equal(root.settings.dynamicDataToken, 'should-stay');
  });

  test('refuses the whole apply when the target class exists with a conflicting value', () => {
    const root = {
      id: 'root', name: 'card', label: 'Card', children: [],
      settings: { _cssGlobalClasses: [], _padding: '10px' },
    };
    const state = makeState({
      content: [root],
      globalClasses: [{ id: 'existing', name: 'card', settings: { _padding: '20px' } }],
    });
    installFakeBricksApp(state);
    apiModule.probe();

    const rows = [{ id: 'root', depth: 0, name: 'Card', include: true, migrateKeys: ['_padding'] }];
    const result = applyToSubtree({ rootId: 'root', rows, mode: 'migrate', syncLabels: false });

    assert.equal(result.ok, false);
    assert.match(result.error, /Migrate blocked/);
    // Nothing was mutated: the pre-validation ran before any mutation.
    assert.equal(root.settings._padding, '10px');
  });

  test('merges non-conflicting keys into an existing class rather than overwriting it', () => {
    const root = {
      id: 'root', name: 'card', label: 'Card', children: [],
      settings: { _cssGlobalClasses: [], _padding: '10px', _margin: '5px' },
    };
    const state = makeState({
      content: [root],
      globalClasses: [{ id: 'existing', name: 'card', settings: { _padding: '10px' } }],
    });
    installFakeBricksApp(state);
    apiModule.probe();

    const rows = [{ id: 'root', depth: 0, name: 'Card', include: true, migrateKeys: ['_padding', '_margin'] }];
    const result = applyToSubtree({ rootId: 'root', rows, mode: 'migrate', syncLabels: false });

    assert.equal(result.ok, true);
    const cls = state.globalClasses.find(c => c.name === 'card');
    assert.deepEqual(cls.settings, { _padding: '10px', _margin: '5px' });
  });
});

describe('applyToSubtree: mixed mode', () => {
  test('each row applies its own per-row op', () => {
    const root = { id: 'root', name: 'card', label: 'Card', children: ['img'], settings: {} };
    const img = { id: 'img', name: 'image', label: 'Image', children: [], settings: { _cssGlobalClasses: ['old'] } };
    const state = makeState({
      content: [root, img],
      globalClasses: [{ id: 'old', name: 'card__photo', settings: {} }],
    });
    installFakeBricksApp(state);
    apiModule.probe();

    const rows = [
      { id: 'root', depth: 0, name: 'Card', include: true, op: 'add' },
      { id: 'img', depth: 1, name: 'Image', include: true, op: 'rename', currentClassIds: ['old'], renameFamilyId: 'old' },
    ];
    const result = applyToSubtree({ rootId: 'root', rows, mode: 'mixed', syncLabels: false });

    assert.equal(result.ok, true);
    assert.deepEqual(root.settings._cssGlobalClasses, [state.globalClasses.find(c => c.name === 'card').id]);
    const imgNames = img.settings._cssGlobalClasses.map(id => state.globalClasses.find(c => c.id === id).name);
    assert.deepEqual(imgNames, ['card__image']);
  });

  test('an unrecognised per-row op falls back to add', () => {
    const root = { id: 'root', name: 'card', label: 'Card', children: [], settings: {} };
    const state = makeState({ content: [root] });
    installFakeBricksApp(state);
    apiModule.probe();

    const rows = [{ id: 'root', depth: 0, name: 'Card', include: true, op: 'delete-everything' }];
    const result = applyToSubtree({ rootId: 'root', rows, mode: 'mixed', syncLabels: false });

    assert.equal(result.ok, true);
    assert.equal(state.globalClasses.find(c => c.name === 'card') !== undefined, true);
  });
});

describe('applyToSubtree: rollback on mid-apply failure', () => {
  test('rolls every touched element back to its pre-apply class list on error', () => {
    const root = { id: 'root', name: 'card', label: 'Card', children: ['img'], settings: { _cssGlobalClasses: ['pre-existing'] } };
    // A Proxy'd array whose splice() throws, simulating a failure partway
    // through the batch (e.g. an unexpected live-state shape).
    const throwingArray = new Proxy(['pre-existing-2'], {
      get(target, prop) {
        if (prop === 'splice') throw new Error('simulated mid-apply failure');
        return Reflect.get(target, prop);
      },
    });
    const img = { id: 'img', name: 'image', label: 'Image', children: [], settings: { _cssGlobalClasses: throwingArray } };
    const state = makeState({
      content: [root, img],
      globalClasses: [
        { id: 'pre-existing', name: 'kept', settings: {} },
        { id: 'pre-existing-2', name: 'kept-2', settings: {} },
      ],
    });
    installFakeBricksApp(state);
    apiModule.probe();

    const rows = [
      { id: 'root', depth: 0, name: 'Card', include: true },
      { id: 'img', depth: 1, name: 'Image', include: true },
    ];
    const result = applyToSubtree({ rootId: 'root', rows, mode: 'add', syncLabels: false });

    assert.equal(result.ok, false);
    assert.match(result.error, /rolled back/);
    // root was mutated first, then img's setElementClasses threw — root
    // must be restored to its pre-apply class list.
    assert.deepEqual(root.settings._cssGlobalClasses, ['pre-existing']);
  });
});

describe('applyToSubtree: no-op subtree', () => {
  test('reports failure when every targeted element has vanished', () => {
    const state = makeState({ content: [] }); // root row references an element that no longer exists
    installFakeBricksApp(state);
    apiModule.probe();

    const rows = [{ id: 'root', depth: 0, name: 'Card', include: true }];
    const result = applyToSubtree({ rootId: 'root', rows, mode: 'add', syncLabels: false });

    assert.equal(result.ok, false);
    assert.match(result.error, /No elements were modified/);
  });
});
