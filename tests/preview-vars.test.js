/**
 * Drift guard for the WP-admin preview/WCAG derivation module.
 *
 * `preview-vars.js` rebuilds the framework's --c-, --on-, surface, text and
 * tint custom properties in JS because the admin page can't load the SLASHED
 * stylesheet. It MUST stay a faithful mirror of `core/tokens.css` — but unlike
 * `color.js` (pinned byte-for-byte by shared-parity), nothing enforces that.
 *
 * This suite pins the exact derivation formulas. If someone edits
 * `preview-vars.js`, these assertions fail and force a conscious re-check
 * against the current `core/tokens.css`; if `core/tokens.css` changes upstream,
 * the mismatch should be reflected here in the same commit. It can't fully
 * prove equivalence (the framework expresses these as CSS `light-dark()`), but
 * it stops silent drift of the preview + checker, which both consume this.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildPreviewVars } from '../SLASHED-for-WP/integrations/bricks/admin-app/src/lib/preview-vars.js';

const META = {}; // exercise the default contrast threshold (0.6) and bias (0)

describe('preview-vars derivations mirror core/tokens.css', () => {
  const light = buildPreviewVars({}, META, false);
  const dark = buildPreviewVars({}, META, true);

  test('surfaces are derived from --c-base', () => {
    assert.ok(light.includes('--c-surface:var(--c-base)'));
    assert.ok(light.includes('--c-bg:oklch(from var(--c-base) calc(l + 0.02) c h)'));
    assert.ok(light.includes('--c-raised:oklch(from var(--c-base) calc(l + 0.04) c h)'));
    assert.ok(light.includes('--c-inset:oklch(from var(--c-base) calc(l - 0.02) c h)'));
  });

  test('on-color uses the sign(threshold - l) auto-contrast trick', () => {
    assert.ok(light.includes('--on-primary:oklch(from var(--c-primary) clamp(0.1, sign(0.6 - l) * 999, 0.95) 0 0)'));
  });

  test('light body text formula (with contrast bias 0)', () => {
    assert.ok(
      light.includes('--c-text:oklch(from var(--sf-color-neutral-light) clamp(0.05, calc(l - 0.4 - 0), 0.35) c h)')
    );
  });

  test('dark body text formula resolves against --c-neutral', () => {
    assert.ok(dark.includes('--c-text:oklch(from var(--c-neutral) clamp(0.70, calc(l + 0.25 + 0), 1) c h)'));
  });

  test('status tints are translucent fills at 0.14 alpha', () => {
    assert.ok(light.includes('--tint-success:oklch(from var(--c-success) l c h / 0.14)'));
  });

  test('auto dark-mode derivations for base and standard colors', () => {
    assert.ok(
      light.includes('--sf-color-base-dark:oklch(from var(--sf-color-base-light) clamp(0.16, calc(1.18 - l), 0.24) calc(c * 0.5) h)')
    );
    assert.ok(
      light.includes('--sf-color-primary-dark:oklch(from var(--sf-color-primary-light) clamp(0.65, calc(0.95 - l * 0.5), 0.88) calc(c * 0.9) h)')
    );
  });

  test('active-mode color aliases follow the requested mode', () => {
    assert.ok(light.includes('--c-primary:var(--sf-color-primary-light)'));
    assert.ok(dark.includes('--c-primary:var(--sf-color-primary-dark)'));
  });
});
