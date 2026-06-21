/**
 * Parity tests for the shared modular-scale utilities (node --test).
 * Mirrors SLASHED/configurator/tests/scale.test.js.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  modularValue,
  round,
  computeScale,
  buildClamp,
  TEXT_STEPS,
  RATIOS,
} from '../SLASHED-for-WP/admin-app/src/lib/scale.js';

describe('modular value', () => {
  test('index 0 is the base', () => {
    assert.equal(modularValue(1, 1.25, 0), 1);
  });
  test('positive/negative steps apply the ratio', () => {
    assert.equal(round(modularValue(1, 1.25, 1)), 1.25);
    assert.equal(round(modularValue(1, 2, 3)), 8);
    assert.equal(round(modularValue(1, 2, -1)), 0.5);
  });
});

describe('computeScale', () => {
  const scale = computeScale(TEXT_STEPS, {
    baseMin: 1,
    baseMax: 1.25,
    ratioMin: 1.2,
    ratioMax: 1.333,
  });

  test('covers every step', () => {
    assert.equal(scale.length, TEXT_STEPS.length);
  });
  test('m is the base size', () => {
    const m = scale.find((s) => s.name === 'm');
    assert.equal(m.min, 1);
    assert.equal(m.max, 1.25);
  });
  test('increases monotonically from 2xs upward', () => {
    for (let i = 1; i < scale.length; i++) {
      assert.ok(scale[i].min > scale[i - 1].min, `${scale[i].name} > ${scale[i - 1].name}`);
    }
  });
});

describe('buildClamp', () => {
  test('fluid expression interpolates between viewports', () => {
    const c = buildClamp(1, 1.25, 22.5, 90);
    assert.match(c, /^clamp\(1rem,/);
    assert.match(c, /vw,/);
    assert.match(c, /1\.25rem\)$/);
  });

  test('equal min/max collapses to a bare rem value', () => {
    assert.equal(buildClamp(1.5, 1.5, 22.5, 90), '1.5rem');
  });

  test('clamp endpoints equal the requested min/max at the viewport bounds', () => {
    const minRem = 1;
    const maxRem = 2;
    const vpMin = 20;
    const vpMax = 80;
    const c = buildClamp(minRem, maxRem, vpMin, vpMax);
    const m = c.match(/clamp\(([\d.]+)rem, ([\-\d.]+)rem \+ ([\d.]+)vw, ([\d.]+)rem\)/);
    assert.ok(m, `parseable clamp: ${c}`);
    const intercept = parseFloat(m[2]);
    const vw = parseFloat(m[3]);
    const atMin = intercept + (vw / 100) * vpMin;
    const atMax = intercept + (vw / 100) * vpMax;
    assert.ok(Math.abs(atMin - minRem) < 0.01, `at min: ${atMin}`);
    assert.ok(Math.abs(atMax - maxRem) < 0.01, `at max: ${atMax}`);
  });
});

describe('ratios catalogue', () => {
  test('exposes common named ratios', () => {
    const values = RATIOS.map((r) => r.value);
    assert.ok(values.includes(1.25));
    assert.ok(values.includes(1.618));
    assert.ok(values.includes(2));
  });
});
