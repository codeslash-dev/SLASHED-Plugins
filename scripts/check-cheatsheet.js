#!/usr/bin/env node
/**
 * Verify that the admin-app Cheatsheet (cheatsheet-data.js) covers every
 * token and class shipped in the framework, as recorded in the Bricks
 * fallback inventory (data/inventory.json, regenerated from CSS source).
 *
 * The cheatsheet documents tokens/classes with a compact PATTERN notation,
 * e.g. `--sf-color-{primary,action}-500`, `.sf-grid-{1,2,3,4,6}`,
 * `--sf-space-{2xs..4xl}`. This script expands that notation into regexes
 * and asserts that every concrete inventory entry matches at least one
 * cheatsheet entry. Any uncovered names are printed and the process exits 1.
 *
 * Pattern notation:
 *   {a,b,c}          alternation (options may contain hyphens)
 *   {2xs..4xl}/{word} single-segment wildcard ([0-9a-z]+)
 *   *                multi-segment wildcard ([0-9a-z-]+)
 *
 * There is deliberately NO loose numeric-range form. Discrete numeric scales
 * (palette 50…950, alpha a5…a95) are written as explicit comma lists so that
 * matching stays exact and can never over-match a number outside the real
 * scale — which would otherwise hide a genuinely uncovered token.
 *
 * Usage: node scripts/check-cheatsheet.js
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const INV = path.join(ROOT, 'SLASHED-for-WP', 'integrations', 'bricks', 'data', 'inventory.json');
const SHEET = path.join(ROOT, 'SLASHED-for-WP', 'integrations', 'bricks', 'admin-app', 'src', 'lib', 'cheatsheet-data.js');

const inv = JSON.parse(fs.readFileSync(INV, 'utf8'));
const sheetSrc = fs.readFileSync(SHEET, 'utf8');

// Pull every `name: "..."` / `name: '...'` string out of the data module.
const names = [];
for (const m of sheetSrc.matchAll(/name:\s*"([^"]+)"/g)) names.push(m[1]);
for (const m of sheetSrc.matchAll(/name:\s*'([^']+)'/g)) names.push(m[1]);

function escapeLiteral(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert one cheatsheet pattern token into a RegExp source fragment.
 * Supported placeholder notations inside `{ }`:
 *   {a,b,c}      -> alternation (options may contain hyphens)
 *   {a..b}       -> single-segment wildcard  ([0-9a-z]+)
 *   {word}       -> single-segment wildcard  ([0-9a-z]+)
 * A literal `*` becomes a multi-segment wildcard ([0-9a-z-]+).
 *
 * Throws on an unterminated `{` so a malformed pattern fails fast instead of
 * spinning the scan loop forever.
 */
function patternToRegex(tok) {
  let out = '';
  let i = 0;
  while (i < tok.length) {
    const ch = tok[i];
    if (ch === '{') {
      const end = tok.indexOf('}', i);
      if (end === -1) {
        throw new Error(`Unterminated "{" in cheatsheet pattern: ${tok}`);
      }
      const body = tok.slice(i + 1, end);
      if (body.includes(',')) {
        const opts = body.split(',').map((o) => escapeLiteral(o.trim())).join('|');
        out += `(?:${opts})`;
      } else {
        out += '[0-9a-z]+';
      }
      i = end + 1;
    } else if (ch === '*') {
      out += '[0-9a-z-]+';
      i += 1;
    } else {
      out += escapeLiteral(ch);
      i += 1;
    }
  }
  return out;
}

// Build matchers. Entries may pack several names separated by ` / ` or `/`.
const matchers = [];
for (const raw of names) {
  for (const piece of raw.split(/\s*\/\s*/)) {
    // Inventory stores class names without the leading dot; cheatsheet
    // entries write `.sf-…` / `.is-…` for readability. Normalise both.
    const p = piece.trim().replace(/^\./, '');
    if (!p) continue;
    try {
      matchers.push(new RegExp('^' + patternToRegex(p) + '$'));
    } catch (e) {
      // Skip un-compilable fragments rather than crash the whole check.
    }
  }
}

function isCovered(name) {
  return matchers.some((re) => re.test(name));
}

const allItems = [
  ...inv.variables.map((v) => ({ kind: 'var', name: v })),
  ...inv.sf_classes.map((v) => ({ kind: 'sf', name: v })),
  ...inv.is_classes.map((v) => ({ kind: 'is', name: v })),
];

const uncovered = allItems.filter((it) => !isCovered(it.name));

if (uncovered.length === 0) {
  console.log(`[check-cheatsheet] OK — all ${allItems.length} inventory entries covered.`);
  process.exit(0);
}

console.error(`[check-cheatsheet] ${uncovered.length} uncovered of ${allItems.length}:`);
const byKind = { var: [], sf: [], is: [] };
for (const it of uncovered) byKind[it.kind].push(it.name);
for (const kind of ['var', 'sf', 'is']) {
  if (byKind[kind].length) {
    console.error(`\n# ${kind} (${byKind[kind].length})`);
    for (const n of byKind[kind]) console.error('  ' + n);
  }
}
process.exit(1);
