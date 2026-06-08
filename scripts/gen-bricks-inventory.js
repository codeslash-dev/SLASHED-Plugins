#!/usr/bin/env node
/**
 * Generate the Bricks integration's fallback inventory.json.
 *
 * Token and class lists are parsed from CSS SOURCE files (same lists as
 * scripts/audit.js) — never from dist. This ensures the counts match
 * docs/registry.json and tests/token-api.snapshot.json exactly:
 *
 *   - Dist-based counting misses @property-only tokens and picks up local
 *     custom properties from class rules (--sf-icon-size etc.), causing
 *     wrong variable counts.
 *   - Source-based counting is canonical and stable across build tools.
 *
 * Usage:
 *   node scripts/gen-bricks-inventory.js
 */

import fs   from 'node:fs';
import path from 'node:path';
import { TOKEN_FILES, CLASS_FILES } from './registry-sources.js';

const ROOT = path.resolve(import.meta.dirname, '..');
// Token/class lists are parsed from the SLASHED framework's CSS source files,
// which live in a separate repo. Point SLASHED_FRAMEWORK_DIR at a local
// checkout; defaults to a sibling ../SLASHED checkout.
const FRAMEWORK = process.env.SLASHED_FRAMEWORK_DIR
  ? path.resolve(process.env.SLASHED_FRAMEWORK_DIR)
  : fs.existsSync(path.join(ROOT, '.framework'))
    ? path.join(ROOT, '.framework')
    : path.resolve(ROOT, '..', 'SLASHED');
const OUT  = path.join(ROOT, 'SLASHED-for-WP', 'integrations', 'bricks', 'data', 'inventory.json');

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripStrings(css) {
  return css.replace(/"[^"]*"|'[^']*'/g, '""');
}

function readFile(rel) {
  const abs = path.join(FRAMEWORK, rel);
  if (!fs.existsSync(abs)) {
    throw new Error(`[gen-bricks-inventory] Missing canonical source file: ${rel} (looked in SLASHED_FRAMEWORK_DIR=${FRAMEWORK})`);
  }
  return fs.readFileSync(abs, 'utf8');
}

// Natural-order comparator so numeric suffixes order intuitively
// (`primary-50` before `primary-500`, `space-2` before `space-10`).
// Mirrors the PHP-side `sort($x, SORT_NATURAL | SORT_FLAG_CASE)` in
// class-inventory.php / class-css-parser.php so the fallback inventory
// matches what the live parser produces from CSS at runtime.
const naturalCompare = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

function extractTokens() {
  const names = new Set();
  for (const rel of TOKEN_FILES) {
    const css = stripComments(readFile(rel));
    for (const m of css.matchAll(/@property\s+(--sf-[\w-]+)/g))  names.add(m[1]);
    for (const m of css.matchAll(/(--sf-[\w-]+)\s*:/g))          names.add(m[1]);
  }
  return [...names].sort(naturalCompare);
}

function extractClasses(prefix) {
  const names = new Set();
  const re = new RegExp(`\\.(${prefix}[\\w-]+)`, 'g');
  for (const rel of CLASS_FILES) {
    const css = stripStrings(stripComments(readFile(rel)));
    for (const m of css.matchAll(re)) names.add(m[1]);
  }
  return [...names].sort(naturalCompare);
}

const variables = extractTokens();
const sfClasses = extractClasses('sf-');
const isClasses = extractClasses('is-');

const inventory = {
  _meta: {
    source: 'source (core/ + optional/ token and class files)',
    counts: {
      variables:  variables.length,
      sf_classes: sfClasses.length,
      is_classes: isClasses.length,
    },
  },
  variables,
  sf_classes: sfClasses,
  is_classes: isClasses,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(inventory, null, 2) + '\n');

console.log(
  `[gen-bricks-inventory] → ${path.relative(ROOT, OUT)} ` +
  `(${variables.length} vars, ${sfClasses.length} .sf-, ${isClasses.length} .is-)`
);
