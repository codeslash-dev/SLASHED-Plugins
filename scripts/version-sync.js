#!/usr/bin/env node
/**
 * Single-sources the plugin's OWN release version into the WordPress metadata
 * that has to repeat it. This is the plugin's version (package.json) — NOT the
 * framework version it bundles (that lives in SLASHED_*_CSS_REF and is owned by
 * update-framework.js).
 *
 * Source of truth (in order):
 *   --from-tag        → `git describe --tags --abbrev=0` (strip leading v).
 *                       Use at release time once the repo carries tags.
 *   (default)         → package.json `version`.
 *
 * Stamps, idempotently:
 *   - SLASHED-for-WP/readme.txt           `Stable tag: X.Y.Z`
 *   - the `Version: X.Y.Z` header in the three plugin entry files.
 *
 * When --from-tag is used, package.json is updated first so it stays the
 * in-repo source of truth that verify-sync checks against.
 *
 * Usage:
 *   node scripts/version-sync.js
 *   node scripts/version-sync.js --from-tag
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const PLUGIN = 'SLASHED-for-WP';

const VERSION_HEADER_FILES = [
  `${PLUGIN}/slashed.php`,
  `${PLUGIN}/integrations/bricks/slashed-bricks.php`,
  `${PLUGIN}/integrations/gutenberg/slashed-gutenberg.php`,
];

// PHP define() constants that mirror the plugin's own release version.
// These are distinct from SLASHED_*_CSS_REF which tracks the framework version.
const VERSION_CONSTANT_FILES = [
  { file: `${PLUGIN}/slashed.php`,                                  name: 'SLASHED_VERSION' },
  { file: `${PLUGIN}/integrations/bricks/slashed-bricks.php`,      name: 'SLASHED_BRICKS_VERSION' },
  { file: `${PLUGIN}/integrations/gutenberg/slashed-gutenberg.php`, name: 'SLASHED_GUTENBERG_VERSION' },
];

const README = `${PLUGIN}/readme.txt`;

const SEMVER = String.raw`\d+\.\d+\.\d+(?:[-.][A-Za-z0-9.]+)*`;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function write(rel, content) {
  fs.writeFileSync(path.join(ROOT, rel), content);
}

function resolveVersion() {
  if (process.argv.includes('--from-tag')) {
    const tag = execFileSync('git', ['describe', '--tags', '--abbrev=0'], { cwd: ROOT })
      .toString()
      .trim();
    return tag.replace(/^v/, '');
  }
  return JSON.parse(read('package.json')).version;
}

function syncReplace(rel, pattern, replacement, label) {
  const original = read(rel);
  if (!pattern.test(original)) {
    throw new Error(`version-sync: pattern not found in ${rel} (${label})`);
  }
  const updated = original.replace(pattern, replacement);
  if (updated === original) {
    console.log(`  ok   ${rel}  (${label})`);
    return false;
  }
  write(rel, updated);
  console.log(`  bump ${rel}  → ${label}`);
  return true;
}

function main() {
  const version = resolveVersion();
  console.log(`\nversion-sync: plugin version → ${version}\n`);
  let changed = 0;

  // Keep package.json authoritative when the version came from a tag.
  const pkg = JSON.parse(read('package.json'));
  if (pkg.version !== version) {
    pkg.version = version;
    write('package.json', JSON.stringify(pkg, null, 2) + '\n');
    console.log(`  bump package.json  → ${version}`);
    changed++;
  }

  changed += syncReplace(
    README,
    new RegExp(`(^Stable tag:\\s*)${SEMVER}`, 'm'),
    `$1${version}`,
    `Stable tag = ${version}`
  ) ? 1 : 0;

  for (const file of VERSION_HEADER_FILES) {
    changed += syncReplace(
      file,
      new RegExp(`(^\\s*\\*\\s*Version:\\s*)${SEMVER}`, 'm'),
      `$1${version}`,
      `Version: = ${version}`
    ) ? 1 : 0;
  }

  for (const { file, name } of VERSION_CONSTANT_FILES) {
    changed += syncReplace(
      file,
      new RegExp(`(define\\(\\s*'${name}',\\s*')${SEMVER}('\\s*\\))`),
      `$1${version}$2`,
      `${name} = ${version}`
    ) ? 1 : 0;
  }

  console.log(changed === 0 ? '\nAll plugin version references already up to date.\n' : `\n${changed} file(s) updated.\n`);
}

main();
