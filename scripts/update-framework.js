#!/usr/bin/env node
/**
 * Sync the plugin to a chosen (or the latest) SLASHED framework version.
 *
 * The plugin tracks the framework's published source. This script, end to end:
 *   1. Resolve the target version ("latest" → newest stable tag via jsDelivr).
 *   2. Shallow-clone the framework at that tag into ./.framework.
 *   3. Build the CSS bundles from that source (npm ci + bundle) so they exactly
 *      match the tag, then copy them into SLASHED-for-WP/dist/ via
 *      sync-plugin-dist.js (local-first delivery).
 *   4. Regenerate data/inventory.json + data/classes-hints.json from the source.
 *   5. Stamp the SLASHED_*_CSS_REF constants in the PHP entry points so the
 *      plugin's default/standalone CSS URLs point at the synced version.
 *
 * Building from source (rather than downloading release assets) means any tag
 * works and the bundles always match the exact source at that tag. At runtime
 * the WordPress plugin still loads CSS from the framework's published artifacts
 * (jsDelivr `dist` branch for "latest"; GitHub Release assets for a pinned
 * version) — see Slashed_CSS_Loader / Slashed_Framework_Updater.
 *
 * Usage:
 *   node scripts/update-framework.js                 # latest stable release
 *   node scripts/update-framework.js --version=0.5.21
 *   node scripts/update-framework.js --version=v0.6.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT          = path.resolve(import.meta.dirname, '..');
const FRAMEWORK_DIR = path.join(ROOT, '.framework');
const REPO_URL      = 'https://github.com/codeslash-dev/SLASHED.git';
const META_URL      = 'https://data.jsdelivr.com/v1/packages/gh/codeslash-dev/SLASHED';

// PHP files + the constant whose value is the tracked framework version tag.
const CSS_REF_TARGETS = [
  { file: 'SLASHED-for-WP/slashed.php',                                 name: 'SLASHED_CSS_REF' },
  { file: 'SLASHED-for-WP/integrations/bricks/slashed-bricks.php',      name: 'SLASHED_BRICKS_CSS_REF' },
  { file: 'SLASHED-for-WP/integrations/gutenberg/slashed-gutenberg.php', name: 'SLASHED_GUTENBERG_CSS_REF' },
];

function log(msg) { console.log(`[update-framework] ${msg}`); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, attempts = 4) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'slashed-for-wp update-framework' } });
      if (res.ok || ![429, 502, 503, 504].includes(res.status)) return res;
      last = new Error(`HTTP ${res.status}`);
    } catch (err) {
      last = err;
    }
    if (i < attempts) {
      const backoff = 500 * 2 ** (i - 1);
      log(`retrying (${i}/${attempts - 1}) after ${backoff}ms — ${last.message}`);
      await sleep(backoff);
    }
  }
  throw last;
}

function parseVersionArg() {
  const arg = process.argv.find((a) => a.startsWith('--version='));
  if (!arg) return 'latest';
  const v = arg.slice('--version='.length).trim();
  return v || 'latest';
}

async function resolveLatestTag() {
  const res = await fetchWithRetry(META_URL);
  if (!res.ok) throw new Error(`metadata request failed: HTTP ${res.status}`);
  const body = await res.json();
  const versions = Array.isArray(body.versions) ? body.versions : [];
  for (const entry of versions) {
    const raw = typeof entry === 'string' ? entry : (entry && entry.version) || '';
    const ver = String(raw).replace(/^v/, '');
    if (/^\d+\.\d+\.\d+$/.test(ver)) return `v${ver}`; // newest-first; first stable wins
  }
  throw new Error('no stable release tag found in framework metadata');
}

function normalizeTag(v) {
  return `v${String(v).replace(/^v/, '')}`;
}

function cloneFrameworkSource(tag) {
  fs.rmSync(FRAMEWORK_DIR, { recursive: true, force: true });
  log(`cloning framework source @ ${tag} → .framework`);
  execFileSync(
    'git',
    ['clone', '--depth', '1', '--branch', tag, REPO_URL, FRAMEWORK_DIR],
    { stdio: 'inherit' }
  );
}

function buildFrameworkBundles() {
  // Build the CSS bundles from the cloned source so they match the tag exactly.
  log('installing framework deps + building bundles (npm ci && npm run build)');
  execFileSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: FRAMEWORK_DIR, stdio: 'inherit' });
  execFileSync('npm', ['run', 'build'], { cwd: FRAMEWORK_DIR, stdio: 'inherit' });
}

function syncBundlesIntoPlugin() {
  // sync-plugin-dist.js copies dist/slashed.{essential,optimal,full}.css from
  // the framework checkout into SLASHED-for-WP/dist/. Point it at .framework.
  const env = { ...process.env, SLASHED_FRAMEWORK_DIR: FRAMEWORK_DIR };
  execFileSync('node', [path.join('scripts', 'sync-plugin-dist.js')], { cwd: ROOT, stdio: 'inherit', env });
}

function regenerateData() {
  const env = { ...process.env, SLASHED_FRAMEWORK_DIR: FRAMEWORK_DIR };
  for (const script of ['gen-bricks-inventory.js', 'gen-class-hints.js']) {
    execFileSync('node', [path.join('scripts', script)], { cwd: ROOT, stdio: 'inherit', env });
  }
}

function stampCssRef(tag) {
  for (const { file, name } of CSS_REF_TARGETS) {
    const abs = path.join(ROOT, file);
    const src = fs.readFileSync(abs, 'utf8');
    const re = new RegExp(`(define\\(\\s*'${name}',\\s*)'[^']*'(\\s*\\))`);
    if (!re.test(src)) {
      throw new Error(`could not find ${name} define in ${file}`);
    }
    const updated = src.replace(re, `$1'${tag}'$2`);
    if (updated !== src) {
      fs.writeFileSync(abs, updated);
      log(`stamped ${name} = ${tag} in ${file}`);
    }
  }
}

async function main() {
  const requested = parseVersionArg();
  const tag = requested === 'latest' ? await resolveLatestTag() : normalizeTag(requested);
  log(`target framework version: ${tag}${requested === 'latest' ? ' (latest)' : ''}`);

  cloneFrameworkSource(tag);
  buildFrameworkBundles();
  syncBundlesIntoPlugin();
  regenerateData();
  stampCssRef(tag);

  log(`done — plugin now tracks framework ${tag}.`);
  log('next: npm run build:apps && npm run build:zip   (rebuild SPA assets + package)');
}

main().catch((err) => {
  console.error(`[update-framework] ${err.message}`);
  process.exit(1);
});
