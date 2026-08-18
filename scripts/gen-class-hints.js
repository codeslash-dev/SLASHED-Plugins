#!/usr/bin/env node
/**
 * Generates data/classes-hints.json — a map of .sf-* / .is-* class names to
 * short descriptions and categories, extracted from the SLASHED framework's
 * api-index.json (the same source gen-variables-hints.js uses).
 *
 * Format:
 *   { "sf-stack":            { "description": "Flex column …", "category": "Layout primitives" },
 *     "sf-bento--row-tall":  { "description": "Bento grid variant …", "category": "Layout primitives" },
 *     "sf-is-disabled":      { "description": "Disabled state …", "category": "State classes" },
 *     ... }
 *
 * Why api-index.json and not the CSS source comments?
 *   This generator used to scrape section-heading comments out of the framework
 *   CSS. That coupled the hint map to a specific comment format, and when the
 *   framework adopted its "source comment policy" (short `/* Label *\/`
 *   separators, long-form docs moved to docs/) the scraper silently matched
 *   almost nothing — the class dropdown in Bricks lost most of its hints while
 *   the drift `--check` still passed (regen == committed, just wrong). The
 *   framework now publishes docs/api-index.json as its machine-readable class
 *   + token contract (generated from source), so we read that directly: it is
 *   robust to comment reformatting and always tracks the real class names
 *   (e.g. the sf-bento--row-* rename and the is-* → sf-is-* namespace move).
 *
 * Usage:
 *   node scripts/gen-class-hints.js          — write data/classes-hints.json
 *   node scripts/gen-class-hints.js --check  — exit 1 if file is stale
 */

import fs   from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
// Class descriptions are read from the SLASHED framework's api-index.json,
// which lives in a separate repo. Point SLASHED_FRAMEWORK_DIR at a local
// checkout; defaults to a ./.framework clone, then a sibling ../SLASHED.
const FRAMEWORK = process.env.SLASHED_FRAMEWORK_DIR
  ? path.resolve(process.env.SLASHED_FRAMEWORK_DIR)
  : fs.existsSync(path.join(ROOT, '.framework'))
    ? path.join(ROOT, '.framework')
    : path.resolve(ROOT, '..', 'SLASHED');

const API_INDEX_FILE = path.join(FRAMEWORK, 'docs', 'api-index.json');
const OUT = path.join(ROOT, 'SLASHED-for-WP', 'data', 'classes-hints.json');

/**
 * Normalise a class description for use as an editor tooltip.
 *
 * The framework's api-index truncates long descriptions with a trailing
 * ellipsis (`…` or `...`), which reads as a broken sentence in the small
 * Bricks tooltip. When a description was truncated this way, cut it back to
 * the last COMPLETE sentence (a `.`, `!`, or `?` followed by whitespace) so
 * the tooltip always ends cleanly. Untruncated descriptions are returned
 * unchanged (aside from trimming). If no internal sentence boundary exists,
 * the bare ellipsis is stripped rather than dropping the whole description.
 *
 * Pure — exported for unit testing.
 *
 * @param {string} raw Description as shipped in api-index.json.
 * @returns {string} Tooltip-ready description.
 */
export function normalizeDescription(raw) {
  let d = String(raw == null ? '' : raw).trim();

  // Only act on descriptions the upstream index truncated mid-sentence.
  if (!/(?:\u2026|\.\.\.)$/.test(d)) return d;

  // Drop the trailing ellipsis (unicode … or ASCII ...).
  d = d.replace(/\s*(?:\u2026|\.\.\.)\s*$/, '').trim();

  // Cut back to the last complete sentence (terminator followed by space).
  const m = d.match(/^[\s\S]*[.!?](?=\s)/);
  return (m ? m[0] : d).trim();
}

/**
 * Transform a parsed api-index.json object into the class-hints map.
 *
 * Pure (no fs / no env): keeps only `class` entries whose name is one the
 * Bricks class-hints resolver can actually tag — a single `sf-*` or `is-*`
 * token (see integrations/bricks/editor-app/src/lib/class-hints.js). Entries
 * without a description are skipped (a blank tooltip is worse than none),
 * descriptions are normalised for the tooltip (see normalizeDescription), and
 * the api-index category is preserved verbatim. Exported so the extraction
 * rules can be unit-tested without a framework checkout on disk.
 *
 * @param {object} apiIndex Parsed api-index.json ({ entries: [...] }).
 * @returns {object} map of class name to { description, category }
 */
export function buildClassHints(apiIndex) {
  const hints = {};
  const entries = (apiIndex && apiIndex.entries) || [];

  for (const entry of entries) {
    if (!entry || entry.type !== 'class') continue;

    const name = entry.name;
    if (typeof name !== 'string' || !name) continue;

    // The Bricks resolver only recognises sf-* / is-* tokens; unprefixed
    // framework classes (sr-only, skip-link, …) would ship as dead entries.
    if (!name.startsWith('sf-') && !name.startsWith('is-')) continue;

    const description = normalizeDescription(entry.description);
    if (!description) continue;

    hints[name] = {
      description,
      category: entry.category || 'Classes',
    };
  }

  return hints;
}

/**
 * Read the api-index.json and extract class hints.
 * @returns {object} map of class name to { description, category }
 */
function generate() {
  if (!fs.existsSync(API_INDEX_FILE)) {
    throw new Error(`[gen-class-hints] Missing API index file: ${API_INDEX_FILE}`);
  }

  let apiIndex;
  try {
    const raw = fs.readFileSync(API_INDEX_FILE, 'utf8');
    apiIndex = JSON.parse(raw);
  } catch (err) {
    throw new Error(`[gen-class-hints] Failed to parse ${API_INDEX_FILE}: ${err.message}`);
  }

  return buildClassHints(apiIndex);
}

// ── CLI ─────────────────────────────────────────────────────────────────────
// Guarded so importing this module (e.g. from a test) never reads the framework
// or writes/exits as a side effect.
if (import.meta.url === `file://${process.argv[1]}`) {
  const hints = generate();
  const json  = JSON.stringify(hints, null, 2) + '\n';
  const OUT_REL = path.relative(ROOT, OUT);

  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUT)) {
      console.error(`[gen-class-hints] ${OUT_REL} not found — run: node scripts/gen-class-hints.js`);
      process.exit(1);
    }
    const stored = fs.readFileSync(OUT, 'utf8');
    if (JSON.stringify(JSON.parse(stored)) !== JSON.stringify(JSON.parse(json))) {
      console.error(`[gen-class-hints] ${OUT_REL} is stale — run: node scripts/gen-class-hints.js`);
      process.exit(1);
    }
    console.log(`[gen-class-hints] OK — ${Object.keys(hints).length} class hints`);
  } else {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, json);
    console.log(`[gen-class-hints] → ${OUT_REL} (${Object.keys(hints).length} class hints)`);
  }
}
