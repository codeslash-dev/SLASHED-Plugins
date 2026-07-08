/**
 * color-model.js is maintained as two byte-identical copies — one for the
 * Bricks editor-app, one for the Gutenberg editor bundle — because the two
 * builders ship separate bundles with no shared module between them. The
 * cross-impl test (color-model-cross-impl.test.js) only pins the *behaviour*
 * of classifyVar(); every other export (buildColorModel, swatchHex,
 * filterModel, FAMILY_INFO, …) is unguarded and could silently diverge if
 * someone edits one copy and forgets the other.
 *
 * This test asserts the two files are identical byte-for-byte, so any edit to
 * one that isn't mirrored in the other fails CI. When you change one copy,
 * copy it verbatim to the other (they are intentionally the same file).
 *
 * Run: node --test tests/color-model-copies-identical.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const BRICKS_COPY = path.join(
  ROOT,
  'SLASHED-for-WP/integrations/bricks/editor-app/src/lib/color-model.js',
);
const GUTENBERG_COPY = path.join(
  ROOT,
  'SLASHED-for-WP/integrations/gutenberg/assets/editor/color-model.js',
);

test('Bricks and Gutenberg color-model.js copies are byte-identical', () => {
  const bricks = readFileSync(BRICKS_COPY, 'utf8');
  const gutenberg = readFileSync(GUTENBERG_COPY, 'utf8');
  assert.equal(
    bricks,
    gutenberg,
    'color-model.js has diverged between the Bricks and Gutenberg copies — ' +
      'they are intentionally identical. Copy your change to both files.',
  );
});
