#!/usr/bin/env node
/**
 * Drift detector for the Bricks admin-app Svelte SPA.
 *
 * The admin panel (SLASHED-for-WP/integrations/bricks/admin-app/)
 * is a hand-written UI over the framework's design-token API. Its
 * `cssVar=` props and placeholder `default={... ?? <literal>}` fallbacks
 * duplicate facts that live elsewhere — the CSS custom-property surface
 * (core/*.css, optional/*.css, docs/registry.json) and the canonical PHP
 * factory defaults (Slashed_Token_Defaults). Nothing enforces that those
 * copies stay in sync, so they silently rot when the framework changes.
 *
 * Two checks, both fatal on mismatch:
 *
 *   1. cssVar existence — every `--sf-*` name referenced via `cssVar=`
 *      (including template-literal forms like `--sf-color-${name}-light`,
 *      expanded against the live PHP defaults that drive the matching
 *      `{#each}` loop) must exist in the framework: either as a declared
 *      token (docs/registry.json) or as a documented "override hook"
 *      consumed via var(--sf-name, …) somewhere in core/optional (e.g.
 *      the unregistered --sf-color-*-dark tokens).
 *
 *   2. default-value parity — every literal placeholder in
 *      `default={defaults.KEY ?? <literal>}` must equal the value PHP's
 *      Slashed_Token_Defaults::get_all() actually returns for that key,
 *      so the UI never shows a "factory default" that the framework
 *      doesn't.
 *
 * Usage: node scripts/check-admin-app.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
// The framework token surface (registry + CSS sources) lives in a separate
// repo. Point SLASHED_FRAMEWORK_DIR at a local checkout; defaults to a
// sibling ../SLASHED checkout. registry.json is produced by the framework's
// `node scripts/audit.js`.
const FRAMEWORK = process.env.SLASHED_FRAMEWORK_DIR
  ? path.resolve(process.env.SLASHED_FRAMEWORK_DIR)
  : fs.existsSync(path.join(ROOT, '.framework'))
    ? path.join(ROOT, '.framework')
    : path.resolve(ROOT, '..', 'SLASHED');
const ADMIN_SRC = path.join(
  ROOT,
  'SLASHED-for-WP/integrations/bricks/admin-app/src'
);
const TOKEN_DEFAULTS_PHP = path.join(
  ROOT,
  'SLASHED-for-WP/includes/class-token-defaults.php'
);
const REGISTRY = path.join(FRAMEWORK, 'docs/registry.json');

const errors = [];

// ── Load canonical sources ───────────────────────────────────────────────────

if (!fs.existsSync(REGISTRY)) {
  console.error(`[check-admin-app] registry.json not found at ${REGISTRY} — build it in the framework repo with: node scripts/audit.js (set SLASHED_FRAMEWORK_DIR if it lives elsewhere)`);
  process.exit(1);
}
const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
const declaredTokens = new Set(registry.tokens);

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

const ALL_CSS_FILES = [
  ...fs.readdirSync(path.join(FRAMEWORK, 'core')).filter((f) => f.endsWith('.css')).map((f) => `core/${f}`),
  ...fs.readdirSync(path.join(FRAMEWORK, 'optional')).filter((f) => f.endsWith('.css')).map((f) => `optional/${f}`),
];
const cssCorpus = ALL_CSS_FILES
  .map((rel) => stripComments(fs.readFileSync(path.join(FRAMEWORK, rel), 'utf8')))
  .join('\n');

/** A custom property is "real" if declared, or consumed as an override hook. */
function tokenExists(name) {
  if (declaredTokens.has(name)) return true;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`var\\(\\s*${escaped}[\\s,)]`).test(cssCorpus);
}

/** Load the canonical PHP factory defaults by executing the real class. */
function loadPhpDefaults() {
  const out = execFileSync(
    'php',
    ['-r', `define('ABSPATH','/'); require '${TOKEN_DEFAULTS_PHP}'; echo json_encode(Slashed_Token_Defaults::get_all());`],
    { encoding: 'utf8' }
  );
  return JSON.parse(out);
}

let phpDefaults;
try {
  phpDefaults = loadPhpDefaults();
} catch (err) {
  console.error('[check-admin-app] could not load PHP token defaults:', err.message);
  process.exit(1);
}

function resolvePath(obj, segments) {
  let cur = obj;
  for (const seg of segments) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[seg];
  }
  return cur;
}

// ── Gather admin-app source files ────────────────────────────────────────────

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(svelte|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const sourceFiles = walk(ADMIN_SRC);

// ── Template-literal cssVar resolvers ────────────────────────────────────────
// Maps a normalized `prefix${}suffix` shape to a function returning the set
// of loop-variable values the matching {#each} actually iterates — derived
// straight from the live PHP defaults so this table never needs hand-kept
// duplicate name lists.

const TEMPLATE_RESOLVERS = {
  '--sf-color-${}-light': () => [
    ...Object.keys(phpDefaults.colors?.brand ?? {}),
    ...Object.keys(phpDefaults.colors?.status ?? {}),
  ],
  '--sf-color-${}-dark': () => [
    ...Object.keys(phpDefaults.colors?.brand ?? {}),
    ...Object.keys(phpDefaults.colors?.status ?? {}),
  ],
  '--sf-duration-${}': () => Object.keys(phpDefaults.motion?.durations ?? {}),
  '--sf-z-${}': () => Object.keys(phpDefaults.zindex ?? {}),
  '--sf-font-${}': () => Object.keys(phpDefaults.typography?.font_families ?? {}),
};

// ── Check 1: cssVar existence ────────────────────────────────────────────────

for (const file of sourceFiles) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');

  // Literal: cssVar="--sf-foo-bar"
  for (const m of src.matchAll(/cssVar="(--sf-[\w-]+)"/g)) {
    const name = m[1];
    if (!tokenExists(name)) {
      errors.push(`${rel}: cssVar="${name}" does not exist in the framework (not declared, not an override hook)`);
    }
  }

  // Template literal: cssVar={`--sf-...${expr}...`}
  for (const m of src.matchAll(/cssVar=\{`([^`]*)`\}/g)) {
    const raw = m[1];
    const normalized = raw.replace(/\$\{[^}]+\}/g, '${}');
    const resolver = TEMPLATE_RESOLVERS[normalized];
    if (resolver) {
      for (const value of resolver()) {
        const name = normalized.replace('${}', value);
        if (!tokenExists(name)) {
          errors.push(`${rel}: cssVar template "${raw}" resolves to "${name}" (via PHP defaults), which does not exist in the framework`);
        }
      }
    } else {
      // Unknown shape — fall back to a generic family-existence sanity check
      // so a wholesale rename of the static parts still gets caught.
      const [prefix, suffix] = normalized.split('${}');
      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedSuffix = (suffix || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const familyRe = new RegExp(`^${escapedPrefix}[\\w-]*${escapedSuffix}$`);
      if (![...declaredTokens].some((t) => familyRe.test(t))) {
        errors.push(`${rel}: cssVar template "${raw}" — unrecognized shape, and no declared token matches "${normalized}"; update TEMPLATE_RESOLVERS in scripts/check-admin-app.js if this is a new legitimate pattern`);
      }
    }
  }
}

// ── Check 2: default-value parity (placeholder literal vs. PHP canonical) ───
//
// Build a per-file map of local identifier → PHP defaults section, covering
// both `const defaults = meta.defaults?.[SECTION] ?? {}` (with a sibling
// `const SECTION = '...'`) and the namespaced `const xDefaults =
// meta.defaults?.section ?? {}` shape MiscTab uses.

const DEFAULT_LITERAL_RE =
  /default=\{(\w+)((?:\??\.\w+)+)\s*\?\?\s*('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?)\}/g;

function parseLiteral(raw) {
  if (raw[0] === "'" || raw[0] === '"') {
    return { kind: 'string', value: raw.slice(1, -1) };
  }
  return { kind: 'number', value: parseFloat(raw) };
}

function literalMatchesDefault(literal, defaultValue) {
  if (defaultValue === undefined) return false;
  if (literal.kind === 'string') return String(defaultValue) === literal.value;
  const num = parseFloat(defaultValue);
  return Number.isFinite(num) && Math.abs(num - literal.value) < 1e-9;
}

for (const file of sourceFiles) {
  const rel = path.relative(ROOT, file);
  const src = fs.readFileSync(file, 'utf8');

  const sectionConstMatch = src.match(/const\s+SECTION\s*=\s*'([\w-]+)'/);
  const sectionVar = sectionConstMatch ? sectionConstMatch[1] : null;

  /** identifier → section slug */
  const identSections = {};
  const identRe = /const\s+(\w+)\s*=\s*meta\.defaults\?\.(?:\[SECTION\]|(\w+))\s*\?\?\s*\{\}/g;
  for (const m of src.matchAll(identRe)) {
    const ident = m[1];
    const section = m[2] ?? sectionVar;
    if (section) identSections[ident] = section;
  }
  if (Object.keys(identSections).length === 0) continue;

  for (const m of src.matchAll(DEFAULT_LITERAL_RE)) {
    const [, ident, pathStr, literalRaw] = m;
    const section = identSections[ident];
    if (!section) continue;

    const segments = pathStr.split(/\??\./).filter(Boolean);
    const sectionDefaults = phpDefaults[section];
    if (sectionDefaults === undefined) {
      errors.push(`${rel}: defaults section "${section}" (from identifier "${ident}") does not exist in Slashed_Token_Defaults::get_all()`);
      continue;
    }

    const canonical = resolvePath(sectionDefaults, segments);
    const literal = parseLiteral(literalRaw);
    if (!literalMatchesDefault(literal, canonical)) {
      errors.push(
        `${rel}: default={${ident}${pathStr} ?? ${literalRaw}} — placeholder ${literalRaw} does not match ` +
        `Slashed_Token_Defaults::get_all()['${section}']${segments.map((s) => `['${s}']`).join('')} ` +
        `= ${JSON.stringify(canonical)}`
      );
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────────

if (errors.length) {
  console.error(`[check-admin-app] ${errors.length} drift issue(s) found between the admin-app and the framework:`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log('[check-admin-app] OK — admin-app cssVar references and placeholder defaults match the framework.');
