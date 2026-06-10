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
  bestOklchOnSurface,
  rgbToOklch,
  oklchToRgb,
  suggestBrandPalette,
  farthestHue,
  suggestPalette,
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
    assert.match(out.base.color, /^oklch\(/);
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
    assert.match(out.base.color, /^oklch\(/);
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

describe('bestOklchOnSurface', () => {
  test('finds a passing value and reports its true ratio', () => {
    const hit = bestOklchOnSurface(0.15, 220, [255, 255, 255], 4.5);
    assert.ok(hit, 'value found');
    assert.ok(hit.ratio >= 4.5);
    assert.match(hit.color, /^oklch\(/);
    assert.equal(hit.locked, false);
  });

  test('returns null when the target is unreachable on the line', () => {
    // ~5.3:1 is the ceiling on mid-grey; 22 can never be met.
    assert.equal(bestOklchOnSurface(0.05, 0, [128, 128, 128], 22), null);
  });
});

describe('farthestHue', () => {
  test('opposite hue when one is taken', () => {
    assert.equal(farthestHue([0]), 180);
  });

  test('picks a widest gap with two taken', () => {
    const h = farthestHue([0, 180]);
    assert.ok(h === 90 || h === 270, `got ${h}`);
  });

  test('zero when nothing taken', () => {
    assert.equal(farthestHue([]), 0);
  });
});

describe('suggestBrandPalette', () => {
  const surface = [255, 255, 255];

  test('keeps locked roles untouched and generates the rest', () => {
    const roles = {
      primary: [40, 110, 220],
      secondary: [200, 40, 80],
      tertiary: [40, 110, 220],
      action: [40, 110, 220],
    };
    const out = suggestBrandPalette({
      roles,
      surfaceRgb: surface,
      locked: { primary: true, secondary: true },
    });
    assert.equal(out.primary.locked, true);
    assert.equal(out.primary.color, null);
    assert.deepEqual(out.primary.rgb, roles.primary);
    assert.equal(out.secondary.locked, true);
    assert.equal(out.tertiary.locked, false);
    assert.ok(out.tertiary.color);
    assert.ok(out.tertiary.ratio >= 4.5, `tertiary AA: ${out.tertiary.ratio}`);
    assert.equal(out.action.locked, false);
    assert.ok(out.action.ratio >= 4.5, `action AA: ${out.action.ratio}`);
  });

  test('generated hues stay distinct from the locked anchors', () => {
    const out = suggestBrandPalette({
      roles: { primary: [220, 40, 40], secondary: [40, 200, 90] },
      surfaceRgb: surface,
      locked: { primary: true, secondary: true },
    });
    const hueOf = (rgb) => rgbToOklch(...rgb)[2];
    const lockedHues = [hueOf([220, 40, 40]), hueOf([40, 200, 90])];
    for (const role of ['tertiary', 'action']) {
      const gh = hueOf(out[role].rgb);
      const minDist = Math.min(
        ...lockedHues.map((u) => {
          const raw = Math.abs(gh - u);
          return Math.min(raw, 360 - raw);
        })
      );
      assert.ok(minDist > 15, `${role} hue ${gh} too close to a lock (${minDist}°)`);
    }
  });

  test('can generate an entire palette from scratch (no locks)', () => {
    const out = suggestBrandPalette({
      roles: { primary: [40, 110, 220] },
      surfaceRgb: surface,
    });
    for (const role of ['primary', 'secondary', 'tertiary', 'action']) {
      assert.ok(out[role], `${role} present`);
      assert.ok(out[role].ratio >= 4.5, `${role} AA: ${out[role].ratio}`);
    }
  });

  test('returns null without a surface', () => {
    assert.equal(suggestBrandPalette({ roles: {}, surfaceRgb: null }), null);
  });
});

describe('suggestPalette (unified generator)', () => {
  const roles = {
    base: [245, 246, 250],
    neutral: [40, 44, 52],
    primary: [40, 110, 220],
    secondary: [200, 40, 80],
    tertiary: [20, 160, 110],
    action: [120, 70, 210],
  };

  test('generates every supplied role against one shared surface', () => {
    const out = suggestPalette({ roles });
    for (const r of ['base', 'neutral', 'primary', 'secondary', 'tertiary', 'action']) {
      assert.ok(out[r], `${r} present`);
    }
    assert.ok(out.neutral.ratio >= 7, `neutral AAA: ${out.neutral.ratio}`);
    for (const r of ['primary', 'secondary', 'tertiary', 'action']) {
      assert.ok(out[r].ratio >= 4.5, `${r} AA: ${out[r].ratio}`);
    }
  });

  test('locked roles are kept; only the rest are generated (action handled once)', () => {
    const out = suggestPalette({
      roles,
      locked: { base: true, primary: true },
    });
    assert.equal(out.base.locked, true);
    assert.deepEqual(out.base.rgb, roles.base);
    assert.equal(out.primary.locked, true);
    assert.deepEqual(out.primary.rgb, roles.primary);
    assert.equal(out.action.locked, false);
    assert.ok(out.action.ratio >= 4.5);
    assert.equal(out.secondary.locked, false);
    assert.equal(out.tertiary.locked, false);
  });

  test('omits roles whose RGB is not supplied', () => {
    const out = suggestPalette({ roles: { base: [245, 246, 250], primary: [40, 110, 220] } });
    assert.ok(out.base);
    assert.ok(out.primary);
    assert.equal(out.neutral, undefined);
    assert.equal(out.secondary, undefined);
  });

  test('returns null without a base', () => {
    assert.equal(suggestPalette({ roles: { primary: [1, 2, 3] } }), null);
  });
});

describe('OKLCH generation — review fixes', () => {
  test('bestOklchOnSurface emits a color whose chroma round-trips to its rgb', () => {
    const hit = bestOklchOnSurface(0.4, 30, [255, 255, 255], 4.5);
    assert.ok(hit);
    const m = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/.exec(hit.color);
    assert.ok(m, `parseable: ${hit.color}`);
    const [, L, C, H] = m.map(Number);
    const rt = oklchToRgb(L, C, H);
    assert.deepEqual(rt, hit.rgb, 'emitted color re-renders to the measured rgb');
    assert.ok(C < 0.4, `chroma fitted below request: ${C}`);
  });

  test('a single non-primary present role keeps its own hue (no phantom hue 0)', () => {
    const red = [200, 40, 80];
    const ownHue = rgbToOklch(...red)[2];
    const out = suggestBrandPalette({ roles: { secondary: red }, surfaceRgb: [255, 255, 255] });
    const genHue = rgbToOklch(...out.secondary.rgb)[2];
    const dist = Math.min(Math.abs(genHue - ownHue), 360 - Math.abs(genHue - ownHue));
    assert.ok(dist < 20, `secondary kept ~its hue (own ${ownHue.toFixed(0)}, got ${genHue.toFixed(0)})`);
  });
});
