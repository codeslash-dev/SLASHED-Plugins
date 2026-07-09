/**
 * Failure-path tests for verify-sync's runChecks().
 *
 * sync.test.js proves the *committed* tree passes. This suite proves the guard
 * actually FIRES: it builds a minimal, internally-consistent fixture checkout
 * in a temp dir, confirms runChecks() finds no errors, then mutates one piece
 * of version metadata at a time and asserts the matching error is reported.
 * Without this, a check that silently stopped detecting drift would still let
 * sync.test.js pass.
 *
 * Run: node --test tests/verify-sync-failures.test.js
 */
import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runChecks } from '../scripts/verify-sync.js';

const PLUGIN = 'SLASHED-for-WP';
const FW = '0.7.3'; // bundled-framework version
const PV = '1.2.3'; // plugin release version
const BUNDLES = ['optimal', 'full', 'optimal.flat', 'full.flat'];

function write(root, rel, contents) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contents);
}

/** Build a fully-consistent fixture checkout that runChecks() should pass. */
function buildFixture(root) {
  for (const b of BUNDLES) {
    write(root, `${PLUGIN}/dist/slashed.${b}.css`, `/* SLASHED v${FW} — slashed.${b}.css */\n:root{}\n`);
  }
  const entry = (cssRef, cssName, verName) =>
    `<?php\n/**\n * Version: ${PV}\n */\n` +
    `define( '${cssRef}', 'v${FW}' );\n` +
    `define( '${verName}', '${PV}' );\n`;

  write(root, `${PLUGIN}/slashed.php`, entry('SLASHED_CSS_REF', 'x', 'SLASHED_VERSION'));
  write(root, `${PLUGIN}/integrations/bricks/slashed-bricks.php`, entry('SLASHED_BRICKS_CSS_REF', 'x', 'SLASHED_BRICKS_VERSION'));
  write(root, `${PLUGIN}/integrations/gutenberg/slashed-gutenberg.php`, entry('SLASHED_GUTENBERG_CSS_REF', 'x', 'SLASHED_GUTENBERG_VERSION'));

  const inventory = JSON.stringify({ variables: ['--sf-a'], sf_classes: [], is_classes: [] });
  write(root, `${PLUGIN}/data/inventory.json`, inventory);
  write(root, `${PLUGIN}/integrations/bricks/data/inventory.json`, inventory);

  write(root, `${PLUGIN}/readme.txt`, `=== SLASHED ===\nStable tag: ${PV}\n`);
  write(root, 'package.json', JSON.stringify({ version: PV }));
}

describe('runChecks failure detection', () => {
  let root;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-sync-'));
    buildFixture(root);
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  test('a consistent fixture reports no errors', () => {
    const { errors } = runChecks(root);
    assert.deepEqual(errors, [], `expected clean fixture:\n${errors.join('\n')}`);
  });

  test('mismatched dist bundle versions are caught', () => {
    write(root, `${PLUGIN}/dist/slashed.full.css`, `/* SLASHED v9.9.9 — slashed.full.css */\n`);
    const { errors } = runChecks(root);
    assert.ok(errors.some((e) => /disagree on version/.test(e)), errors.join('\n'));
  });

  test('a CSS_REF constant that lags the bundled CSS is caught', () => {
    write(root, `${PLUGIN}/slashed.php`,
      `<?php\n/**\n * Version: ${PV}\n */\n` +
      `define( 'SLASHED_CSS_REF', 'v0.0.1' );\n` +
      `define( 'SLASHED_VERSION', '${PV}' );\n`);
    const { errors } = runChecks(root);
    assert.ok(errors.some((e) => /SLASHED_CSS_REF/.test(e) && /bundled CSS is v/.test(e)), errors.join('\n'));
  });

  test('divergent inventory.json copies are caught', () => {
    write(root, `${PLUGIN}/integrations/bricks/data/inventory.json`, JSON.stringify({ variables: ['--sf-b'] }));
    const { errors } = runChecks(root);
    assert.ok(errors.some((e) => /inventory\.json copies differ/.test(e)), errors.join('\n'));
  });

  test('a Stable tag that drifts from package.json version is caught', () => {
    write(root, `${PLUGIN}/readme.txt`, `=== SLASHED ===\nStable tag: 9.9.9\n`);
    const { errors } = runChecks(root);
    assert.ok(errors.some((e) => /Stable tag/.test(e)), errors.join('\n'));
  });

  test('a plugin Version: header that drifts from package.json is caught', () => {
    write(root, `${PLUGIN}/integrations/bricks/slashed-bricks.php`,
      `<?php\n/**\n * Version: 9.9.9\n */\n` +
      `define( 'SLASHED_BRICKS_CSS_REF', 'v${FW}' );\n` +
      `define( 'SLASHED_BRICKS_VERSION', '${PV}' );\n`);
    const { errors } = runChecks(root);
    assert.ok(errors.some((e) => /Version:/.test(e) && /!=/.test(e)), errors.join('\n'));
  });

  test('a *_VERSION constant that drifts from package.json is caught', () => {
    write(root, `${PLUGIN}/slashed.php`,
      `<?php\n/**\n * Version: ${PV}\n */\n` +
      `define( 'SLASHED_CSS_REF', 'v${FW}' );\n` +
      `define( 'SLASHED_VERSION', '9.9.9' );\n`);
    const { errors } = runChecks(root);
    assert.ok(errors.some((e) => /SLASHED_VERSION/.test(e) && /!=/.test(e)), errors.join('\n'));
  });
});
