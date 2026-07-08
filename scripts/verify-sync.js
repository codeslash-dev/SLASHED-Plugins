#!/usr/bin/env node
/**
 * Verifies that the plugin's version metadata is internally consistent — the
 * guard that would have caught the bundled CSS sitting at an old framework
 * version while the PHP constants claimed a newer one.
 *
 * Two independent version concepts are checked:
 *
 *   1. Framework-tracked version (which framework release's CSS is bundled):
 *      - all four bundled dist/*.css headers carry the SAME `SLASHED vX.Y.Z`;
 *      - SLASHED_CSS_REF / SLASHED_BRICKS_CSS_REF / SLASHED_GUTENBERG_CSS_REF
 *        all equal `v<that version>`;
 *      - the two shipped inventory.json copies are byte-identical.
 *
 *   2. Plugin's own release version (independent of the framework):
 *      - package.json `version` === readme.txt `Stable tag` === the `Version:`
 *        header in all three plugin entry files.
 *
 * Usage:
 *   node scripts/verify-sync.js          # exits non-zero on any mismatch
 *   import { runChecks } from './verify-sync.js'   # { errors, info }
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const PLUGIN = 'SLASHED-for-WP';

const DIST_BUNDLES = ['optimal', 'optimal-components', 'optimal-utilities', 'full'];

// PHP files carrying the tracked-framework-version constant.
const CSS_REF_TARGETS = [
  { file: `${PLUGIN}/slashed.php`, name: 'SLASHED_CSS_REF' },
  { file: `${PLUGIN}/integrations/bricks/slashed-bricks.php`, name: 'SLASHED_BRICKS_CSS_REF' },
  { file: `${PLUGIN}/integrations/gutenberg/slashed-gutenberg.php`, name: 'SLASHED_GUTENBERG_CSS_REF' },
];

// PHP files carrying the plugin's own `Version:` header.
const VERSION_HEADER_FILES = [
  `${PLUGIN}/slashed.php`,
  `${PLUGIN}/integrations/bricks/slashed-bricks.php`,
  `${PLUGIN}/integrations/gutenberg/slashed-gutenberg.php`,
];

// PHP define() constants that must also match the plugin's own release version.
const VERSION_CONSTANTS = [
  { file: `${PLUGIN}/slashed.php`,                                  name: 'SLASHED_VERSION' },
  { file: `${PLUGIN}/integrations/bricks/slashed-bricks.php`,      name: 'SLASHED_BRICKS_VERSION' },
  { file: `${PLUGIN}/integrations/gutenberg/slashed-gutenberg.php`, name: 'SLASHED_GUTENBERG_VERSION' },
];

const INVENTORY_COPIES = [
  `${PLUGIN}/data/inventory.json`,
  `${PLUGIN}/integrations/bricks/data/inventory.json`,
];

function read(root, rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function sha256(root, rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, rel))).digest('hex');
}

/** Extract `X.Y.Z[-pre]` from a `/* SLASHED vX.Y.Z — file.css *\/` header. */
function distHeaderVersion(root, rel) {
  const first = read(root, rel).split('\n', 1)[0];
  const m = first.match(/SLASHED\s+v(\d+\.\d+\.\d+(?:[-.][A-Za-z0-9.]+)*)/);
  return m ? m[1] : null;
}

function cssRefValue(root, rel, name) {
  const m = read(root, rel).match(new RegExp(`define\\(\\s*'${name}',\\s*'([^']*)'\\s*\\)`));
  return m ? m[1] : null;
}

function versionHeaderValue(root, rel) {
  const m = read(root, rel).match(/^\s*\*\s*Version:\s*(.+?)\s*$/m);
  return m ? m[1] : null;
}

function stableTagValue(root, rel) {
  const m = read(root, rel).match(/^Stable tag:\s*(.+?)\s*$/m);
  return m ? m[1] : null;
}

/**
 * Run every version-consistency check against a checkout root (defaults to
 * this repo). The `root` parameter lets tests point the same logic at a
 * fixture tree with deliberately broken metadata to prove the checks actually
 * fire — the CLI and the committed-state guard both call it with no argument.
 */
export function runChecks(root = ROOT) {
  const errors = [];
  const info = [];

  // ── 1. Framework-tracked version ──────────────────────────────────────────
  const distVersions = DIST_BUNDLES.map((b) => {
    const rel = `${PLUGIN}/dist/slashed.${b}.css`;
    const v = distHeaderVersion(root, rel);
    if (!v) errors.push(`Cannot read SLASHED version header from ${rel}`);
    return v;
  });

  const distVersion = distVersions[0];
  if (distVersion && !distVersions.every((v) => v === distVersion)) {
    errors.push(
      `Bundled dist/*.css headers disagree on version: ${DIST_BUNDLES.map(
        (b, i) => `${b}=${distVersions[i]}`
      ).join(', ')}`
    );
  } else if (distVersion) {
    info.push(`Bundled framework CSS: v${distVersion} (all ${DIST_BUNDLES.length} bundles agree)`);
  }

  const expectedRef = distVersion ? `v${distVersion}` : null;
  for (const { file, name } of CSS_REF_TARGETS) {
    const val = cssRefValue(root, file, name);
    if (val === null) {
      errors.push(`Cannot find ${name} define in ${file}`);
      continue;
    }
    if (expectedRef && val !== expectedRef) {
      errors.push(`${name} = '${val}' but bundled CSS is v${distVersion} (expected '${expectedRef}') — run \`npm run update-framework\``);
    }
  }
  if (expectedRef && errors.length === 0) info.push(`SLASHED_*_CSS_REF all = ${expectedRef}`);

  // Both shipped inventories must be byte-identical (one generator, two copies).
  const invHashes = INVENTORY_COPIES.map((rel) => sha256(root, rel));
  if (!invHashes.every((h) => h === invHashes[0])) {
    errors.push(`inventory.json copies differ:\n  ${INVENTORY_COPIES.map((f, i) => `${f} (${invHashes[i].slice(0, 12)})`).join('\n  ')}\n  run \`npm run build:data\``);
  } else {
    info.push('inventory.json copies are identical');
  }

  // ── 2. Plugin's own release version ───────────────────────────────────────
  const pkgVersion = JSON.parse(read(root, 'package.json')).version;
  const stableTag = stableTagValue(root, `${PLUGIN}/readme.txt`);
  const headerVersions = VERSION_HEADER_FILES.map((f) => [f, versionHeaderValue(root, f)]);

  if (stableTag !== pkgVersion) {
    errors.push(`readme.txt Stable tag '${stableTag}' != package.json version '${pkgVersion}' — run \`npm run version-sync\``);
  }
  for (const [file, v] of headerVersions) {
    if (v === null) errors.push(`Cannot find Version: header in ${file}`);
    else if (v !== pkgVersion) errors.push(`${file} Version: '${v}' != package.json version '${pkgVersion}' — run \`npm run version-sync\``);
  }
  for (const { file, name } of VERSION_CONSTANTS) {
    const val = cssRefValue(root, file, name);
    if (val === null) errors.push(`Cannot find ${name} define in ${file}`);
    else if (val !== pkgVersion) errors.push(`${name} = '${val}' != package.json version '${pkgVersion}' — run \`npm run version-sync\``);
  }
  if (errors.length === 0) info.push(`Plugin version: ${pkgVersion} (package.json, readme Stable tag, all Version: headers, all *_VERSION constants agree)`);

  return { errors, info };
}

// ── CLI ───────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const { errors, info } = runChecks();
  for (const line of info) console.log(`[verify-sync] ok   ${line}`);
  if (errors.length) {
    console.error('');
    for (const e of errors) console.error(`[verify-sync] FAIL ${e}`);
    console.error(`\n[verify-sync] ${errors.length} problem(s) found.`);
    process.exit(1);
  }
  console.log('\n[verify-sync] all version metadata is consistent.');
}
