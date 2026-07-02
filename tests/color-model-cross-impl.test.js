/**
 * PL-015: cross-implementation regression test for color-token classification.
 *
 * classifyVar()/classify_color() exist in three near-identical
 * implementations — Bricks JS, Gutenberg JS, and Gutenberg PHP — that had
 * silently drifted (PL-013/PL-014: only Gutenberg JS correctly filtered both
 * `-light` and `-dark` source tokens; Bricks JS and Gutenberg PHP only
 * filtered `-light`). This test runs a shared fixture list against all three
 * so a future edit to one can't silently re-diverge from the others without
 * a test failure.
 *
 * The PHP side can't be imported into node:test directly, so it's exercised
 * by shelling out to php-harness/classify-color.php (a reflection-based
 * harness — classify_color() is private and needs no WordPress bootstrap).
 * TODO: migrate this PHP-side comparison into the PHPUnit suite once PR-A3
 * (Brain Monkey test scaffold) lands, rather than shelling out.
 *
 * Run: node --test tests/color-model-cross-impl.test.js
 */
import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyVar as classifyVarBricks } from '../SLASHED-for-WP/integrations/bricks/editor-app/src/lib/color-model.js';
import { classifyVar as classifyVarGutenberg } from '../SLASHED-for-WP/integrations/gutenberg/assets/editor/color-model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHP_HARNESS = path.join(__dirname, 'php-harness', 'classify-color.php');

// Covers every classify_color() branch (base/scale/alpha/alias/semantic),
// both source-duplicate suffixes under test (PL-013/014's bug), the
// --sf-color-scheme special-case, and a non-color var.
const FIXTURE_VARS = [
  '--sf-color-primary',
  '--sf-color-primary-light',
  '--sf-color-primary-dark',
  '--sf-color-primary-50',
  '--sf-color-primary-500',
  '--sf-color-primary-900',
  '--sf-color-primary-a20',
  '--sf-color-primary-hover',
  '--sf-color-success',
  '--sf-color-success-dark',
  '--sf-color-text--secondary',
  '--sf-color-scheme',
  '--sf-space-4',
  'not-a-var',
];

let phpResultsByVar;

before(() => {
  try {
    execFileSync('php', ['--version'], { stdio: 'ignore' });
  } catch {
    throw new Error('php not found on PATH — install PHP to run tests/color-model-cross-impl.test.js');
  }

  const output = execFileSync('php', [PHP_HARNESS], {
    input: JSON.stringify(FIXTURE_VARS),
    encoding: 'utf8',
    timeout: 10_000,
  });
  const phpResults = JSON.parse(output);
  phpResultsByVar = new Map(phpResults.map((r) => [r.var, r.result]));
});

describe('color classification stays behaviorally identical across Bricks JS, Gutenberg JS, and Gutenberg PHP', () => {
  for (const varName of FIXTURE_VARS) {
    test(`${varName}: all three agree on filtered (null) vs. classified`, () => {
      const bricks = classifyVarBricks(varName);
      const gutenbergJs = classifyVarGutenberg(varName);
      const gutenbergPhp = phpResultsByVar.get(varName);

      assert.equal(bricks === null, gutenbergJs === null, 'Bricks JS and Gutenberg JS disagree on whether this var is filtered');
      assert.equal(bricks === null, gutenbergPhp === null, 'Bricks JS and Gutenberg PHP disagree on whether this var is filtered');
    });

    test(`${varName}: family/kind/key agree when not filtered`, () => {
      const bricks = classifyVarBricks(varName);
      const gutenbergJs = classifyVarGutenberg(varName);
      const gutenbergPhp = phpResultsByVar.get(varName);
      if (bricks === null) return;

      // step/order are intentionally not compared: PHP's `order` for the
      // `alias` kind is a lookup-table index (self::ALIAS_ORDER), not the
      // raw suffix string the JS `step` field carries — a deliberate
      // per-consumer shape difference, not drift.
      assert.deepEqual(
        { family: bricks.family, kind: bricks.kind, key: bricks.key },
        { family: gutenbergJs.family, kind: gutenbergJs.kind, key: gutenbergJs.key },
        'Bricks JS and Gutenberg JS classify this var differently'
      );
      assert.deepEqual(
        { family: bricks.family, kind: bricks.kind, key: bricks.key },
        { family: gutenbergPhp.family, kind: gutenbergPhp.kind, key: gutenbergPhp.key },
        'Bricks JS and Gutenberg PHP classify this var differently'
      );
    });
  }
});
