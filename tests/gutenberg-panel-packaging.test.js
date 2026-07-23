/**
 * Regression guard for #53: the in-editor token panels only work if their
 * runtime assets are actually shipped in the distributable zip.
 *
 * The Gutenberg panel (assets/editor/panel.js + siblings) was enqueued by PHP
 * but its `assets/` directory was omitted from scripts/zip-plugin.js's INCLUDE
 * list — so the packaged plugin enqueued a file that wasn't there and the panel
 * silently no-op'd (class-editor-enqueue.php bails on `! file_exists`). Bricks
 * shipped its `assets/` and worked; Gutenberg didn't and didn't.
 *
 * This test discovers every integration that has an `assets/` directory and
 * asserts the zip packer copies it, so a future integration can't regress the
 * same way.
 *
 * Run: node --test tests/gutenberg-panel-packaging.test.js
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const INTEGRATIONS = path.join(ROOT, 'SLASHED-for-WP', 'integrations');
const ZIP_SCRIPT = path.join(ROOT, 'scripts', 'zip-plugin.js');

const zipSource = fs.readFileSync(ZIP_SCRIPT, 'utf8');

/** Integration dirs (bricks, gutenberg, …) that ship a runtime `assets/` dir. */
function integrationsWithAssets() {
  return fs
    .readdirSync(INTEGRATIONS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => fs.existsSync(path.join(INTEGRATIONS, name, 'assets')));
}

describe('zip-plugin ships every integration assets/ dir (#53)', () => {
  const withAssets = integrationsWithAssets();

  test('at least the gutenberg integration has an assets dir to ship', () => {
    assert.ok(
      withAssets.includes('gutenberg'),
      `expected integrations/gutenberg/assets to exist; found: ${withAssets.join(', ')}`,
    );
  });

  for (const name of withAssets) {
    test(`zip-plugin.js copies integrations/${name}/assets`, () => {
      assert.ok(
        zipSource.includes(`integrations/${name}/assets`),
        `scripts/zip-plugin.js INCLUDE list is missing integrations/${name}/assets — ` +
          'the packaged plugin would enqueue panel assets that were never shipped.',
      );
    });
  }
});

describe('Gutenberg panel runtime assets are present in-repo', () => {
  const editorDir = path.join(INTEGRATIONS, 'gutenberg', 'assets', 'editor');
  // The ES-module panel imports these siblings by relative path at runtime;
  // every one must exist or the module fails to load in the editor.
  for (const file of ['panel.js', 'apply.js', 'color-model.js', 'panel.css']) {
    test(`assets/editor/${file} exists`, () => {
      assert.ok(fs.existsSync(path.join(editorDir, file)), `${file} missing`);
    });
  }
});
