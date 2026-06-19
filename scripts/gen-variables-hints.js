#!/usr/bin/env node
/**
 * Generates data/variables-hints.json — a map of token names (without --sf- prefix)
 * to their descriptions and categories, extracted from the SLASHED framework's
 * api-index.json.
 *
 * Format:
 *   { "color-primary": { "description": "Primary brand color", "category": "Core tokens" },
 *     "space-m": { "description": "Medium spacing unit", "category": "Core tokens" },
 *     ... }
 *
 * Usage:
 *   node scripts/gen-variables-hints.js          — write data/variables-hints.json
 *   node scripts/gen-variables-hints.js --check  — exit 1 if file is stale
 */

import fs   from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
// Token descriptions are parsed from the SLASHED framework's api-index.json,
// which lives in a separate repo. Point SLASHED_FRAMEWORK_DIR at a local
// checkout; defaults to a sibling ../SLASHED checkout.
const FRAMEWORK = process.env.SLASHED_FRAMEWORK_DIR
  ? path.resolve(process.env.SLASHED_FRAMEWORK_DIR)
  : fs.existsSync(path.join(ROOT, '.framework'))
    ? path.join(ROOT, '.framework')
    : path.resolve(ROOT, '..', 'SLASHED');

const API_INDEX_FILE = path.join(FRAMEWORK, 'docs', 'api-index.json');
const OUT = path.join(ROOT, 'SLASHED-for-WP', 'data', 'variables-hints.json');

/**
 * Read the api-index.json and extract token hints.
 * @returns {object} map of token name (without --sf-) to { description, category }
 */
function generate() {
  if (!fs.existsSync(API_INDEX_FILE)) {
    throw new Error(`[gen-variables-hints] Missing API index file: ${API_INDEX_FILE}`);
  }

  let apiIndex;
  try {
    const raw = fs.readFileSync(API_INDEX_FILE, 'utf8');
    apiIndex = JSON.parse(raw);
  } catch (err) {
    throw new Error(`[gen-variables-hints] Failed to parse ${API_INDEX_FILE}: ${err.message}`);
  }

  const hints = {};
  const entries = apiIndex.entries || [];

  // Process only token entries
  for (const entry of entries) {
    if (entry.type !== 'token') continue;

    // Extract token name without -- prefix (keep sf- for Bricks lookup)
    const name = entry.name;
    if (!name.startsWith('--sf-')) continue;

    const tokenName = name.slice(2); // Remove '--' prefix, keep 'sf-'
    const description = entry.description || '';
    const category = entry.category || 'Core tokens';

    hints[tokenName] = {
      description,
      category,
    };
  }

  return hints;
}

const hints = generate();
const json  = JSON.stringify(hints, null, 2) + '\n';

const OUT_REL = path.relative(ROOT, OUT);

if (process.argv.includes('--check')) {
  if (!fs.existsSync(OUT)) {
    console.error(`[gen-variables-hints] ${OUT_REL} not found — run: node scripts/gen-variables-hints.js`);
    process.exit(1);
  }
  const stored = fs.readFileSync(OUT, 'utf8');
  if (JSON.stringify(JSON.parse(stored)) !== JSON.stringify(JSON.parse(json))) {
    console.error(`[gen-variables-hints] ${OUT_REL} is stale — run: node scripts/gen-variables-hints.js`);
    process.exit(1);
  }
  console.log(`[gen-variables-hints] OK — ${Object.keys(hints).length} variable hints`);
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, json);
  console.log(`[gen-variables-hints] → ${OUT_REL} (${Object.keys(hints).length} variable hints)`);
}
