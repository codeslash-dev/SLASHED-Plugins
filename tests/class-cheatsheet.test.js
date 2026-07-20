/**
 * Unit tests for the colour/surface class cheatsheet (node:test).
 *
 * Run: node --test tests/class-cheatsheet.test.js
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASS_CHEATSHEET_GROUPS,
  cheatsheetCount,
  filterCheatsheet,
} from '../SLASHED-for-WP/integrations/bricks/editor-app/src/lib/class-cheatsheet.js';

describe('cheatsheet data integrity', () => {
  test('groups have unique ids, a label and a blurb', () => {
    const ids = new Set();
    for (const g of CLASS_CHEATSHEET_GROUPS) {
      assert.ok(g.id && !ids.has(g.id), `group id ${g.id} is unique`);
      ids.add(g.id);
      assert.ok(g.label, `group ${g.id} has a label`);
      assert.ok(g.blurb, `group ${g.id} has a blurb`);
      assert.ok(Array.isArray(g.classes) && g.classes.length, `group ${g.id} has classes`);
    }
  });

  test('every class is a plain sf- name with a non-empty description', () => {
    for (const g of CLASS_CHEATSHEET_GROUPS) {
      for (const c of g.classes) {
        assert.match(c.name, /^sf-[a-z0-9-]+$/, `${c.name} is a plain sf- class name`);
        assert.doesNotMatch(c.name, /^\./, `${c.name} has no leading dot`);
        assert.equal(typeof c.desc, 'string');
        assert.ok(c.desc.trim().length, `${c.name} has a non-empty desc`);
      }
    }
  });

  test('class names are unique across the whole cheatsheet', () => {
    const seen = new Set();
    for (const g of CLASS_CHEATSHEET_GROUPS) {
      for (const c of g.classes) {
        assert.ok(!seen.has(c.name), `${c.name} appears once`);
        seen.add(c.name);
      }
    }
  });

  test('cheatsheetCount rolls up all classes', () => {
    const total = CLASS_CHEATSHEET_GROUPS.reduce((n, g) => n + g.classes.length, 0);
    assert.equal(cheatsheetCount(), total);
    assert.ok(total > 0);
  });

  test('the surfaces group covers sf-surface--secondary (the reported gap)', () => {
    const surfaces = CLASS_CHEATSHEET_GROUPS.find((g) => g.id === 'surfaces');
    assert.ok(surfaces);
    assert.ok(surfaces.classes.some((c) => c.name === 'sf-surface--secondary'));
  });
});

describe('filterCheatsheet', () => {
  test('empty query returns all groups unchanged', () => {
    assert.equal(filterCheatsheet(''), CLASS_CHEATSHEET_GROUPS);
    assert.equal(filterCheatsheet('   '), CLASS_CHEATSHEET_GROUPS);
  });

  test('filters by class name, dropping empty groups', () => {
    const out = filterCheatsheet('surface');
    assert.ok(out.length >= 1);
    assert.ok(out.every((g) => g.classes.length));
    assert.ok(out.every((g) => g.classes.every((c) => /surface/i.test(c.name) || /surface/i.test(c.desc))));
  });

  test('matches description text too', () => {
    const out = filterCheatsheet('destructive');
    const names = out.flatMap((g) => g.classes.map((c) => c.name));
    assert.ok(names.includes('sf-btn--danger'));
  });

  test('no match yields an empty array', () => {
    assert.deepEqual(filterCheatsheet('zzzznope'), []);
  });
});
