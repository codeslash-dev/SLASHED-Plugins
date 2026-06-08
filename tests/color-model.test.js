/**
 * Unit tests for the Color System model (node:test, no browser needed).
 *
 * Run: node --test tests/color-model.test.js
 * Also executed automatically via the `pretest` npm script before Playwright.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyVar,
  swatchLabel,
  buildColorModel,
  filterModel,
  swatchValue,
  swatchHex,
  BRAND_FAMILIES,
  STATUS_FAMILIES,
  FAMILY_INFO,
} from '../SLASHED-for-WP/integrations/bricks/editor-app/src/lib/color-model.js';

describe('classifyVar', () => {
  test('base family token', () => {
    assert.deepEqual(classifyVar('--sf-color-primary'), {
      family: 'primary', kind: 'base', step: null, key: 'primary',
    });
  });

  test('numeric scale step', () => {
    assert.deepEqual(classifyVar('--sf-color-primary-300'), {
      family: 'primary', kind: 'scale', step: 300, key: 'primary-300',
    });
  });

  test('alpha step', () => {
    assert.deepEqual(classifyVar('--sf-color-action-a20'), {
      family: 'action', kind: 'alpha', step: 'a20', key: 'action-a20',
    });
  });

  test('named alias', () => {
    assert.deepEqual(classifyVar('--sf-color-primary-hover'), {
      family: 'primary', kind: 'alias', step: 'hover', key: 'primary-hover',
    });
  });

  test('status family is recognised', () => {
    assert.equal(classifyVar('--sf-color-success-200').family, 'success');
  });

  test('non-family token falls into semantic', () => {
    assert.deepEqual(classifyVar('--sf-color-text--secondary'), {
      family: 'semantic', kind: 'semantic', step: null, key: 'text--secondary',
    });
  });

  test('-light source token is skipped (dupe of base)', () => {
    assert.equal(classifyVar('--sf-color-primary-light'), null);
  });

  test('--sf-color-scheme is skipped', () => {
    assert.equal(classifyVar('--sf-color-scheme'), null);
  });

  test('non-color var is rejected', () => {
    assert.equal(classifyVar('--sf-space-4'), null);
    assert.equal(classifyVar('not-a-var'), null);
  });
});

describe('swatchLabel', () => {
  test('base → capitalised family', () => {
    assert.equal(swatchLabel({ family: 'primary', kind: 'base', step: null, key: 'primary' }), 'Primary');
  });
  test('scale → step number', () => {
    assert.equal(swatchLabel({ family: 'primary', kind: 'scale', step: 300, key: 'primary-300' }), '300');
  });
  test('alpha → uppercased', () => {
    assert.equal(swatchLabel({ family: 'action', kind: 'alpha', step: 'a20', key: 'action-a20' }), 'A20');
  });
  test('semantic → humanised with separators', () => {
    assert.equal(swatchLabel({ family: 'semantic', kind: 'semantic', step: null, key: 'text--secondary' }), 'Text · Secondary');
  });
});

describe('buildColorModel', () => {
  const vars = [
    '--sf-color-primary',
    '--sf-color-primary-light', // skipped
    '--sf-color-primary-50',
    '--sf-color-primary-500',
    '--sf-color-primary-900',
    '--sf-color-primary-a20',
    '--sf-color-primary-hover',
    '--sf-color-success',
    '--sf-color-text',
    '--sf-color-text--muted',
    '--sf-color-scheme', // skipped
  ];
  const light = {
    '--sf-color-primary': '#3b5bdb',
    '--sf-color-primary-50': '#edf0fc',
    '--sf-color-primary-500': '#3b5bdb',
    '--sf-color-primary-900': '#1a2a66',
    '--sf-color-primary-a20': '#d8def7',
    '--sf-color-primary-hover': '#2f49af',
    '--sf-color-success': '#2f9e44',
    '--sf-color-text': '#1c1c2e',
    '--sf-color-text--muted': '#6e6e82',
  };
  const dark = {
    '--sf-color-primary': '#748ffc',
    '--sf-color-text': '#e8e8f0',
  };

  test('groups brand, status, semantic in order', () => {
    const { groups } = buildColorModel(vars, light, dark);
    assert.deepEqual(groups.map((g) => g.id), ['primary', 'success', 'semantic']);
    assert.deepEqual(groups.map((g) => g.type), ['brand', 'status', 'semantic']);
  });

  test('-light and scheme are excluded from counts', () => {
    const { groups } = buildColorModel(vars, light, dark);
    const primary = groups.find((g) => g.id === 'primary');
    // base, 50, 500, 900, a20, hover = 6 (light + scheme excluded)
    assert.equal(primary.count, 6);
  });

  test('swatch with no light hex is dropped', () => {
    const { groups } = buildColorModel(['--sf-color-primary-700'], {}, {});
    assert.equal(groups.length, 0);
  });

  test('dark falls back to light when missing', () => {
    const { groups } = buildColorModel(['--sf-color-success'], light, {});
    const sw = groups[0].sections[0].swatches[0];
    assert.equal(sw.dark, sw.light);
    assert.equal(sw.dark, '#2f9e44');
  });

  test('family sections split into shades / transparent / semantic', () => {
    const { groups } = buildColorModel(vars, light, dark);
    const primary = groups.find((g) => g.id === 'primary');
    assert.deepEqual(primary.sections.map((s) => s.id), ['scale', 'alpha', 'alias']);
    // scale section keeps base first, then ascending steps.
    const scaleLabels = primary.sections[0].swatches.map((s) => s.label);
    assert.deepEqual(scaleLabels, ['Primary', '50', '500', '900']);
  });

  test('swatch name drops the leading --', () => {
    const { groups } = buildColorModel(['--sf-color-primary'], light, dark);
    assert.equal(groups[0].sections[0].swatches[0].name, 'sf-color-primary');
  });

  test('handles missing / malformed input safely', () => {
    assert.deepEqual(buildColorModel(undefined, undefined, undefined), { groups: [] });
    assert.deepEqual(buildColorModel(null, null, null), { groups: [] });
  });

  test('every brand/status family slug is a known constant', () => {
    for (const f of [...BRAND_FAMILIES, ...STATUS_FAMILIES]) {
      assert.equal(typeof f, 'string');
    }
  });

  test('groups carry role + when-to-use copy', () => {
    const { groups } = buildColorModel(vars, light, dark);
    const primary = groups.find((g) => g.id === 'primary');
    assert.equal(primary.tagline, FAMILY_INFO.primary.tagline);
    assert.equal(primary.use, FAMILY_INFO.primary.use);
    // every brand + status family has guidance defined.
    for (const f of [...BRAND_FAMILIES, ...STATUS_FAMILIES, 'semantic']) {
      assert.ok(FAMILY_INFO[f] && FAMILY_INFO[f].tagline && FAMILY_INFO[f].use, `missing info for ${f}`);
    }
  });
});

describe('semantic subgrouping', () => {
  const vars = [
    '--sf-color-text',
    '--sf-color-text--muted',
    '--sf-color-text--on-primary',
    '--sf-color-bg',
    '--sf-color-surface',
    '--sf-color-bg--hover',
    '--sf-color-border',
    '--sf-color-border--subtle',
    '--sf-color-link',
    '--sf-color-link--hover',
    '--sf-color-selection-bg',
    '--sf-color-mark-bg',
    '--sf-color-code-bg',
  ];
  const light = Object.fromEntries(vars.map((v) => [v, '#abcabc']));
  const model = buildColorModel(vars, light, {});
  const semantic = model.groups.find((g) => g.id === 'semantic');

  test('semantic group splits into purpose-based labelled sections', () => {
    const ids = semantic.sections.map((s) => s.id);
    // Order is fixed: text-on, text, state, surface, border, link, select, code.
    assert.deepEqual(ids, ['text-on', 'text', 'state', 'surface', 'border', 'link', 'select', 'code']);
    for (const s of semantic.sections) assert.ok(s.label, `section ${s.id} has a label`);
  });

  test('interactive bg states are separated from plain surfaces', () => {
    const state = semantic.sections.find((s) => s.id === 'state');
    const surface = semantic.sections.find((s) => s.id === 'surface');
    assert.deepEqual(state.swatches.map((s) => s.var), ['--sf-color-bg--hover']);
    assert.deepEqual(
      surface.swatches.map((s) => s.var).sort(),
      // --sf-color-surface is the semantic alias (= var(--sf-color-base)), restored after
      // the partial revert of the base→surface rename in commit 62b7337.
      ['--sf-color-bg', '--sf-color-surface']
    );
  });

  test('text-on-color is its own section, separate from Text', () => {
    const on = semantic.sections.find((s) => s.id === 'text-on');
    const text = semantic.sections.find((s) => s.id === 'text');
    assert.deepEqual(on.swatches.map((s) => s.var), ['--sf-color-text--on-primary']);
    assert.ok(text.swatches.every((s) => !s.var.includes('--on-')));
  });

  test('section counts roll up to the group count', () => {
    const total = semantic.sections.reduce((n, s) => n + s.swatches.length, 0);
    assert.equal(total, semantic.count);
  });
});

describe('filterModel', () => {
  const vars = ['--sf-color-primary', '--sf-color-primary-50', '--sf-color-success'];
  const light = {
    '--sf-color-primary': '#3b5bdb',
    '--sf-color-primary-50': '#edf0fc',
    '--sf-color-success': '#2f9e44',
  };
  const model = buildColorModel(vars, light, {});

  test('empty query returns the model unchanged', () => {
    assert.equal(filterModel(model, ''), model);
    assert.equal(filterModel(model, '   '), model);
  });

  test('filters by token name', () => {
    const out = filterModel(model, 'success');
    assert.deepEqual(out.groups.map((g) => g.id), ['success']);
  });

  test('matching a group label keeps its swatches', () => {
    const out = filterModel(model, 'primary');
    assert.equal(out.groups.length, 1);
    assert.equal(out.groups[0].id, 'primary');
    assert.equal(out.groups[0].count, 2);
  });

  test('no match yields empty groups', () => {
    assert.deepEqual(filterModel(model, 'zzz'), { groups: [] });
  });
});

describe('value + hex helpers', () => {
  const swatch = { var: '--sf-color-primary', light: '#aaa', dark: '#222' };
  test('swatchValue wraps in var()', () => {
    assert.equal(swatchValue(swatch), 'var(--sf-color-primary)');
  });
  test('swatchHex picks by mode', () => {
    assert.equal(swatchHex(swatch, 'light'), '#aaa');
    assert.equal(swatchHex(swatch, 'dark'), '#222');
  });
});
