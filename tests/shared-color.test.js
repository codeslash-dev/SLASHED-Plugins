/**
 * Parity tests for the shared color/WCAG utilities (node --test, no DOM).
 *
 * This suite mirrors SLASHED/configurator/tests/color.test.js so the admin app
 * and the framework configurator can never drift on contrast maths, level
 * thresholds, HSL conversion or palette suggestions.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  relativeLuminance,
  contrastRatio,
  wcagLevel,
  wcagLevelLarge,
  levelClass,
  rgbToHsl,
  hslToRgb,
  suggestAccessiblePalette,
  bestTextOnSurface,
} from '../SLASHED-for-WP/integrations/bricks/admin-app/src/lib/color.js';

const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

describe('contrast + luminance', () => {
  test('black/white extremes', () => {
    assert.equal(relativeLuminance(WHITE), 1);
    assert.equal(relativeLuminance(BLACK), 0);
    assert.equal(Math.round(contrastRatio(BLACK, WHITE)), 21);
  });

  test('ratio is symmetric', () => {
    const a = [33, 99, 200];
    assert.equal(contrastRatio(a, WHITE), contrastRatio(WHITE, a));
  });

  test('identical colors give 1:1', () => {
    assert.equal(contrastRatio([120, 120, 120], [120, 120, 120]), 1);
  });
});

describe('wcag levels', () => {
  test('normal-text thresholds', () => {
    assert.equal(wcagLevel(21), 'AAA');
    assert.equal(wcagLevel(7), 'AAA');
    assert.equal(wcagLevel(4.5), 'AA');
    assert.equal(wcagLevel(3), 'AA-large');
    assert.equal(wcagLevel(2.9), 'fail');
  });

  test('large-text thresholds', () => {
    assert.equal(wcagLevelLarge(4.5), 'AAA');
    assert.equal(wcagLevelLarge(3), 'AA');
    assert.equal(wcagLevelLarge(2.9), 'fail');
  });

  test('level class mapping', () => {
    assert.equal(levelClass('AAA'), 'badge--aaa');
    assert.equal(levelClass('AA'), 'badge--aa');
    assert.equal(levelClass('AA-large'), 'badge--aa-large');
    assert.equal(levelClass('fail'), 'badge--fail');
  });
});

describe('rgb ↔ hsl round trip', () => {
  test('primaries survive a round trip', () => {
    for (const rgb of [[255, 0, 0], [0, 255, 0], [0, 0, 255], [18, 52, 86]]) {
      const [h, s, l] = rgbToHsl(...rgb);
      const back = hslToRgb(h, s, l);
      for (let i = 0; i < 3; i++) {
        assert.ok(Math.abs(back[i] - rgb[i]) <= 1, `channel ${i}: ${back[i]} ~ ${rgb[i]}`);
      }
    }
  });

  test('greys have zero saturation', () => {
    const [, s] = rgbToHsl(128, 128, 128);
    assert.equal(s, 0);
    assert.deepEqual(hslToRgb(0, 0, 50), [128, 128, 128]);
  });

  test('hue wraps and channels clamp', () => {
    assert.deepEqual(hslToRgb(360, 100, 50), hslToRgb(0, 100, 50));
    assert.deepEqual(hslToRgb(0, 200, 50), hslToRgb(0, 100, 50));
  });
});

describe('palette optimizer', () => {
  test('returns null on missing inputs', () => {
    assert.equal(suggestAccessiblePalette({ baseRgb: null, neutralRgb: [0, 0, 0], actionRgb: [0, 0, 0] }), null);
  });

  test('suggests an AAA neutral and AA action on a light base', () => {
    const out = suggestAccessiblePalette({
      baseRgb: [240, 240, 245],
      neutralRgb: [40, 44, 52],
      actionRgb: [40, 110, 220],
    });
    assert.ok(out, 'suggestion produced');
    assert.match(out.base.color, /^hsl\(/);
    assert.ok(out.neutral, 'neutral found');
    assert.ok(out.neutral.ratio >= 7, `neutral AAA: ${out.neutral.ratio}`);
    assert.ok(out.action, 'action found');
    assert.ok(out.action.ratio >= 4.5, `action AA: ${out.action.ratio}`);
  });
});


describe('palette optimizer — locks', () => {
  test('an unlocked suggestion carries lock flags and keeps the proposed surface', () => {
    const out = suggestAccessiblePalette({
      baseRgb: [240, 240, 245],
      neutralRgb: [40, 44, 52],
      actionRgb: [40, 110, 220],
    });
    assert.equal(out.base.locked, false);
    assert.equal(out.neutral.locked, false);
    assert.equal(out.action.locked, false);
    assert.match(out.base.color, /^hsl\(/);
  });

  test('a locked role is echoed back untouched with its measured ratio', () => {
    const action = [40, 110, 220];
    const out = suggestAccessiblePalette({
      baseRgb: [240, 240, 245],
      neutralRgb: [40, 44, 52],
      actionRgb: action,
      locked: { action: true },
    });
    assert.equal(out.action.locked, true);
    assert.equal(out.action.color, null);
    assert.deepEqual(out.action.rgb, action);
    assert.ok(out.action.ratio > 1);
    // the unlocked neutral is still generated to clear AAA
    assert.equal(out.neutral.locked, false);
    assert.ok(out.neutral.ratio >= 7);
  });

  test('a locked DARK base generates a lighter, legible neutral + action', () => {
    const darkBase = [20, 22, 28];
    const out = suggestAccessiblePalette({
      baseRgb: darkBase,
      neutralRgb: [40, 44, 52],
      actionRgb: [40, 110, 220],
      locked: { base: true },
    });
    assert.equal(out.base.locked, true);
    assert.equal(out.base.color, null);
    assert.deepEqual(out.base.rgb, darkBase);
    assert.ok(out.neutral, 'neutral generated');
    assert.ok(out.neutral.ratio >= 7, `neutral AAA on dark base: ${out.neutral.ratio}`);
    assert.ok(relativeLuminance(out.neutral.rgb) > relativeLuminance(darkBase));
    assert.ok(out.action, 'action generated');
    assert.ok(out.action.ratio >= 4.5, `action AA on dark base: ${out.action.ratio}`);
  });
});

describe('bestTextOnSurface', () => {
  test('finds a passing value and reports its true ratio', () => {
    const hit = bestTextOnSurface(220, 80, [255, 255, 255], 4.5);
    assert.ok(hit, 'value found');
    assert.ok(hit.ratio >= 4.5);
    assert.match(hit.color, /^hsl\(/);
    assert.equal(hit.locked, false);
  });

  test('returns null when the target is unreachable on the line', () => {
    // 21:1 is the absolute ceiling (black on white); 22 can never be met.
    assert.equal(bestTextOnSurface(0, 0, [128, 128, 128], 22), null);
  });
});
