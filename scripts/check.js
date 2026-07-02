#!/usr/bin/env node
/**
 * Runs every generated-artifact drift check in one command: class hints,
 * variables hints, and the vendored admin-app configurator core/CSS. Each
 * sub-check already knows how to report and exit non-zero on its own —
 * this just runs them all and aggregates the exit status, so CI (or a
 * pre-commit hook) has one command to gate on instead of three.
 *
 * Usage:
 *   node scripts/check.js   (npm run check)
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const CHECKS = [
  { label: 'class-hints', file: 'scripts/gen-class-hints.js', cwd: ROOT },
  { label: 'variables-hints', file: 'scripts/gen-variables-hints.js', cwd: ROOT },
  {
    label: 'admin-app sync',
    file: 'scripts/sync-core.mjs',
    cwd: path.join(ROOT, 'SLASHED-for-WP', 'admin-app'),
  },
];

let failed = false;

for (const { label, file, cwd } of CHECKS) {
  console.log(`\n[check] running ${label}...`);
  try {
    execFileSync(process.execPath, [file, '--check'], { cwd, stdio: 'inherit' });
  } catch {
    failed = true;
  }
}

if (failed) {
  console.error('\n[check] one or more drift checks failed — see output above.');
  process.exit(1);
}

console.log('\n[check] all drift checks passed.');
