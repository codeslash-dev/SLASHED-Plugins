#!/usr/bin/env node
/**
 * Runs `php -l` (syntax check) over every PHP file shipped in the plugin.
 *
 * It's a WordPress plugin, so a parse error means a fatal "white screen" on
 * activation. This catches that before it ships. Requires `php` on PATH.
 *
 * Usage: node scripts/lint-php.js   (npm run lint:php)
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const PLUGIN_DIR = path.join(ROOT, 'SLASHED-for-WP');

function findPhp(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'vendor') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findPhp(full));
    else if (entry.name.endsWith('.php')) out.push(full);
  }
  return out;
}

try {
  execFileSync('php', ['--version'], { stdio: 'ignore' });
} catch {
  console.error('[lint-php] php not found on PATH — install PHP to run this check.');
  process.exit(1);
}

const files = findPhp(PLUGIN_DIR).sort();
const failures = [];

for (const file of files) {
  try {
    execFileSync('php', ['-l', file], { stdio: 'pipe' });
  } catch (err) {
    failures.push(`${path.relative(ROOT, file)}\n${(err.stdout || err.stderr || '').toString().trim()}`);
  }
}

if (failures.length) {
  console.error(`[lint-php] FAIL — ${failures.length} file(s) with syntax errors:\n`);
  for (const f of failures) console.error(f + '\n');
  process.exit(1);
}

console.log(`[lint-php] ok — ${files.length} PHP files, no syntax errors.`);
