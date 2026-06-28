/**
 * Negative tests for scripts/verify-sync.js runChecks().
 *
 * Proves the checker actually *fails* when version metadata is inconsistent.
 * The pass path is already covered by tests/sync.test.js on the committed tree.
 *
 * Each test builds a minimal valid fixture root, mutates one field, and asserts
 * that runChecks() returns errors describing the specific mismatch.
 */
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runChecks } from '../scripts/verify-sync.js';

const PLUGIN = 'SLASHED-for-WP';
const PLUGIN_VER = '0.4.0';
const FW_VER = '0.6.21';

const tmpDirs = [];

/**
 * Build a minimal directory tree that satisfies every check in runChecks().
 * Returns the temp dir path. The caller is responsible for cleanup (or rely on
 * the after() hook at the bottom of this file).
 */
function buildFixture({ pluginVersion = PLUGIN_VER, fwVersion = FW_VER } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'slashed-verify-neg-'));
  tmpDirs.push(dir);

  // Root package.json
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: pluginVersion }));

  const pluginDir = path.join(dir, PLUGIN);

  // readme.txt
  fs.mkdirSync(pluginDir, { recursive: true });
  fs.writeFileSync(
    path.join(pluginDir, 'readme.txt'),
    `=== SLASHED for WP ===\nStable tag: ${pluginVersion}\n`
  );

  // PHP helper: a file with Version:, define(CSS_REF, ...) and define(VERSION, ...)
  function phpFile(cssRefName, versionName) {
    return `<?php\n/**\n * Version: ${pluginVersion}\n */\ndefine('${cssRefName}', 'v${fwVersion}');\ndefine('${versionName}', '${pluginVersion}');\n`;
  }

  fs.writeFileSync(path.join(pluginDir, 'slashed.php'), phpFile('SLASHED_CSS_REF', 'SLASHED_VERSION'));

  fs.mkdirSync(path.join(pluginDir, 'integrations', 'bricks'), { recursive: true });
  fs.writeFileSync(
    path.join(pluginDir, 'integrations', 'bricks', 'slashed-bricks.php'),
    phpFile('SLASHED_BRICKS_CSS_REF', 'SLASHED_BRICKS_VERSION')
  );

  fs.mkdirSync(path.join(pluginDir, 'integrations', 'gutenberg'), { recursive: true });
  fs.writeFileSync(
    path.join(pluginDir, 'integrations', 'gutenberg', 'slashed-gutenberg.php'),
    phpFile('SLASHED_GUTENBERG_CSS_REF', 'SLASHED_GUTENBERG_VERSION')
  );

  // dist CSS — all four bundles with matching version headers
  fs.mkdirSync(path.join(pluginDir, 'dist'), { recursive: true });
  for (const b of ['optimal', 'optimal-components', 'optimal-utilities', 'full']) {
    fs.writeFileSync(
      path.join(pluginDir, 'dist', `slashed.${b}.css`),
      `/* SLASHED v${fwVersion} — slashed.${b}.css */\n:root { --sf-color: #fff; }\n`
    );
  }

  // inventory.json copies — byte-identical
  const inv = JSON.stringify({ version: fwVersion });
  fs.mkdirSync(path.join(pluginDir, 'data'), { recursive: true });
  fs.writeFileSync(path.join(pluginDir, 'data', 'inventory.json'), inv);
  fs.mkdirSync(path.join(pluginDir, 'integrations', 'bricks', 'data'), { recursive: true });
  fs.writeFileSync(path.join(pluginDir, 'integrations', 'bricks', 'data', 'inventory.json'), inv);

  return dir;
}

describe('verify-sync negative cases', () => {
  test('passes on a well-formed fixture', () => {
    const dir = buildFixture();
    const { errors } = runChecks(dir);
    assert.deepEqual(errors, [], `expected no errors on valid fixture:\n - ${errors.join('\n - ')}`);
  });

  test('fails when SLASHED_CSS_REF does not match the bundled CSS version', () => {
    const dir = buildFixture();
    // Overwrite slashed.php with an out-of-date CSS_REF
    const php = fs.readFileSync(path.join(dir, PLUGIN, 'slashed.php'), 'utf8');
    fs.writeFileSync(
      path.join(dir, PLUGIN, 'slashed.php'),
      php.replace(`define('SLASHED_CSS_REF', 'v${FW_VER}')`, `define('SLASHED_CSS_REF', 'v0.0.1')`)
    );
    const { errors } = runChecks(dir);
    assert.ok(errors.length > 0, 'expected errors when SLASHED_CSS_REF is stale');
    assert.ok(
      errors.some(e => e.includes('SLASHED_CSS_REF')),
      `expected an error mentioning SLASHED_CSS_REF; got:\n - ${errors.join('\n - ')}`
    );
  });

  test('fails when dist CSS bundle headers disagree on version', () => {
    const dir = buildFixture();
    // Overwrite one bundle with a different version header
    fs.writeFileSync(
      path.join(dir, PLUGIN, 'dist', 'slashed.full.css'),
      `/* SLASHED v0.0.1 — slashed.full.css */\n:root { --sf-color: #000; }\n`
    );
    const { errors } = runChecks(dir);
    assert.ok(errors.length > 0, 'expected errors when dist CSS headers disagree');
    assert.ok(
      errors.some(e => e.includes('dist/*.css headers disagree')),
      `expected a dist headers disagreement error; got:\n - ${errors.join('\n - ')}`
    );
  });

  test('fails when inventory.json copies are not identical', () => {
    const dir = buildFixture();
    // Write a different inventory to the bricks copy
    fs.writeFileSync(
      path.join(dir, PLUGIN, 'integrations', 'bricks', 'data', 'inventory.json'),
      JSON.stringify({ version: '9.9.9' })
    );
    const { errors } = runChecks(dir);
    assert.ok(errors.length > 0, 'expected errors when inventory.json copies differ');
    assert.ok(
      errors.some(e => e.includes('inventory.json copies differ')),
      `expected an inventory mismatch error; got:\n - ${errors.join('\n - ')}`
    );
  });

  test('fails when readme.txt Stable tag differs from package.json version', () => {
    const dir = buildFixture();
    fs.writeFileSync(
      path.join(dir, PLUGIN, 'readme.txt'),
      `=== SLASHED for WP ===\nStable tag: 9.9.9\n`
    );
    const { errors } = runChecks(dir);
    assert.ok(errors.length > 0, 'expected errors when Stable tag is stale');
    assert.ok(
      errors.some(e => e.includes('Stable tag')),
      `expected a Stable tag mismatch error; got:\n - ${errors.join('\n - ')}`
    );
  });

  test('fails when a PHP Version: header differs from package.json version', () => {
    const dir = buildFixture();
    // Write slashed.php with a wrong Version: header
    fs.writeFileSync(
      path.join(dir, PLUGIN, 'slashed.php'),
      `<?php\n/**\n * Version: 9.9.9\n */\ndefine('SLASHED_CSS_REF', 'v${FW_VER}');\ndefine('SLASHED_VERSION', '${PLUGIN_VER}');\n`
    );
    const { errors } = runChecks(dir);
    assert.ok(errors.length > 0, 'expected errors when Version: header is stale');
    assert.ok(
      errors.some(e => e.includes('Version:')),
      `expected a Version: header mismatch error; got:\n - ${errors.join('\n - ')}`
    );
  });
});

// Clean up all temp dirs created during this test run.
after(() => {
  for (const d of tmpDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});
