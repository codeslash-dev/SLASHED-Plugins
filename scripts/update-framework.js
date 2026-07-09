#!/usr/bin/env node
/**
 * Sync the plugin to a chosen (or the latest) SLASHED framework version.
 *
 * The plugin ships local copies of the framework's CSS for offline/local-first
 * delivery. This script, end to end:
 *   1. Resolve the target version ("latest" → newest stable tag via jsDelivr).
 *   2. Download that release's CSS bundles (optimal/full)
 *      from the framework's GitHub Release assets into SLASHED-for-WP/dist/.
 *   3. Shallow-clone the framework source at that tag into ./.framework and
 *      regenerate data/inventory.json + data/classes-hints.json from it.
 *   4. Stamp the SLASHED_*_CSS_REF constants in the PHP entry points.
 *   5. Verify everything is internally consistent (scripts/verify-sync.js).
 *
 * Why download Release assets instead of building from source?
 *   The framework's version lives in its package.json, which the release
 *   pipeline does not always bump on the tagged commit — so a source build can
 *   stamp the WRONG version in the bundle header (e.g. v0.5.21 for the v0.5.23
 *   tag). The published GitHub Release assets are built in CI with the correct
 *   version and are the canonical, immutable, correctly-stamped artifacts —
 *   the same ones the plugin's runtime pinned-version CDN mode uses.
 *
 * Usage:
 *   node scripts/update-framework.js                 # latest stable release
 *   node scripts/update-framework.js --version=0.5.23
 *   node scripts/update-framework.js --version=v0.6.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runChecks } from './verify-sync.js';

const ROOT          = path.resolve(import.meta.dirname, '..');
const FRAMEWORK_DIR = path.join(ROOT, '.framework');
const DEST_DIR      = path.join(ROOT, 'SLASHED-for-WP', 'dist');
const REPO_URL      = 'https://github.com/codeslash-dev/SLASHED.git';
const META_URL      = 'https://data.jsdelivr.com/v1/packages/gh/codeslash-dev/SLASHED';
const GH_API_BASE   = 'https://api.github.com/repos/codeslash-dev/SLASHED';
const RELEASE_BASE  = 'https://github.com/codeslash-dev/SLASHED/releases/download';

const BUNDLES = ['optimal', 'full'];

// PHP files + the constant whose value is the tracked framework version tag.
const CSS_REF_TARGETS = [
  { file: 'SLASHED-for-WP/slashed.php',                                  name: 'SLASHED_CSS_REF' },
  { file: 'SLASHED-for-WP/integrations/bricks/slashed-bricks.php',       name: 'SLASHED_BRICKS_CSS_REF' },
  { file: 'SLASHED-for-WP/integrations/gutenberg/slashed-gutenberg.php', name: 'SLASHED_GUTENBERG_CSS_REF' },
];

function log(msg) { console.log(`[update-framework] ${msg}`); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, attempts = 5, extraHeaders = {}) {
  let last;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'slashed-for-wp update-framework', ...extraHeaders }, redirect: 'follow' });
      if (res.ok || ![429, 500, 502, 503, 504].includes(res.status)) return res;
      last = new Error(`HTTP ${res.status}`);
    } catch (err) {
      last = err;
    }
    if (i < attempts) {
      const backoff = 750 * 2 ** (i - 1);
      log(`retrying (${i}/${attempts - 1}) after ${backoff}ms — ${last.message}`);
      await sleep(backoff);
    }
  }
  throw last;
}

function parseVersionArg() {
  const arg = process.argv.find((a) => a.startsWith('--version='));
  if (!arg) return 'latest';
  return arg.slice('--version='.length).trim() || 'latest';
}

const normalizeTag = (v) => `v${String(v).replace(/^v/, '')}`;

const STABLE_RE = /^(\d+)\.(\d+)\.(\d+)$/;
const bareVer = (v) => String(v || '').replace(/^v/, '');

// Validate a raw version string and rebuild the tag from its NUMERIC
// components. The result is provably `v<int>.<int>.<int>`, so no substring of
// an untrusted network response (the jsDelivr/GitHub release metadata) flows on
// into the download URL / git ref built from the tag — closes CodeQL's
// "network data written to file system" path. Returns null when not stable X.Y.Z.
function toStableTag(raw) {
  const m = STABLE_RE.exec(bareVer(raw));
  if (!m) return null;
  const [maj, min, pat] = m.slice(1, 4).map(Number);
  return `v${maj}.${min}.${pat}`;
}

// Compare two `X.Y.Z` strings numerically. Returns >0 if a is newer than b.
function cmpSemver(a, b) {
  const pa = bareVer(a).split('.').map(Number);
  const pb = bareVer(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

// jsDelivr's metadata CDN. Fast, but eventually-consistent — a freshly
// published release can take minutes to appear here, so it must never be the
// sole source of truth for "latest" (that lag is exactly what shipped the
// plugin against a stale framework release once).
async function latestFromJsdelivr() {
  const res = await fetchWithRetry(META_URL);
  if (!res.ok) throw new Error(`jsDelivr metadata request failed: HTTP ${res.status}`);
  const body = await res.json();
  const versions = Array.isArray(body.versions) ? body.versions : [];
  for (const entry of versions) {
    const tag = toStableTag(typeof entry === 'string' ? entry : entry?.version);
    if (tag) return tag; // newest-first; first stable wins
  }
  return null;
}

// GitHub's Releases API is the authoritative source: `/releases/latest`
// reflects a publish the instant it happens and excludes drafts/prereleases.
// Authenticates with GITHUB_TOKEN/GH_TOKEN when present (raises the rate limit
// and is always available in CI).
async function latestFromGithub() {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetchWithRetry(`${GH_API_BASE}/releases/latest`, 5, headers);
  if (!res.ok) throw new Error(`GitHub releases request failed: HTTP ${res.status}`);
  const body = await res.json();
  const tag = toStableTag(body?.tag_name);
  if (tag) return tag;
  throw new Error(`GitHub latest release tag "${body?.tag_name}" is not a stable X.Y.Z version`);
}

// Resolve "latest" from GitHub (source of truth) with jsDelivr as a fallback,
// then take whichever is newer. GitHub is authoritative and updates instantly,
// so it normally wins; the max() guard guarantees we never regress to an older
// release if one source lags or is briefly unavailable.
async function resolveLatestTag() {
  const results = await Promise.allSettled([latestFromGithub(), latestFromJsdelivr()]);
  const [gh, jsd] = results;

  if (gh.status === 'rejected' && jsd.status === 'rejected') {
    throw new Error(
      `could not resolve latest framework tag — GitHub: ${gh.reason.message}; jsDelivr: ${jsd.reason.message}`,
    );
  }
  if (gh.status === 'rejected') {
    log(`GitHub releases lookup failed (${gh.reason.message}); falling back to jsDelivr`);
  }

  const candidates = [gh, jsd]
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);
  if (candidates.length === 0) throw new Error('no stable release tag found for the framework');

  const newest = candidates.reduce((a, b) => (cmpSemver(b, a) > 0 ? b : a));
  if (candidates.length === 2 && cmpSemver(candidates[0], candidates[1]) !== 0) {
    log(`GitHub=${gh.value} jsDelivr=${jsd.value} disagree (CDN lag) — using newer ${newest}`);
  }
  return newest;
}

async function downloadReleaseBundles(tag) {
  fs.mkdirSync(DEST_DIR, { recursive: true });
  for (const bundle of BUNDLES) {
    const filename = `slashed.${bundle}.css`;
    const url = `${RELEASE_BASE}/${tag}/${filename}`;
    const res = await fetchWithRetry(url);
    if (!res.ok) {
      throw new Error(`failed to download ${filename} for ${tag}: HTTP ${res.status} (${url})`);
    }
    const css = await res.text();
    const header = css.split('\n', 1)[0];
    if (!header.includes(`SLASHED ${tag} `) && !header.includes(`SLASHED ${tag}\t`)) {
      throw new Error(`downloaded ${filename} header "${header.trim()}" does not match ${tag} — refusing to ship a mis-stamped bundle`);
    }
    fs.writeFileSync(path.join(DEST_DIR, filename), css);
    log(`↓ SLASHED-for-WP/dist/${filename} (${header.trim()})`);
  }
}

function cloneFrameworkSource(tag) {
  fs.rmSync(FRAMEWORK_DIR, { recursive: true, force: true });
  log(`cloning framework source @ ${tag} → .framework (for inventory/class-hints)`);
  execFileSync('git', ['clone', '--depth', '1', '--branch', tag, REPO_URL, FRAMEWORK_DIR], { stdio: 'inherit' });
}

function syncRegistrySources() {
  const src = path.join(FRAMEWORK_DIR, 'scripts', 'registry-sources.js');
  const dst = path.join(ROOT, 'scripts', 'registry-sources.js');
  if (!fs.existsSync(src)) {
    log('WARN: framework has no scripts/registry-sources.js — skipping sync');
    return;
  }
  fs.copyFileSync(src, dst);
  log('synced scripts/registry-sources.js from framework');
}

function regenerateData() {
  syncRegistrySources();
  const env = { ...process.env, SLASHED_FRAMEWORK_DIR: FRAMEWORK_DIR };
  for (const script of ['gen-bricks-inventory.js', 'gen-class-hints.js', 'gen-variables-hints.js']) {
    execFileSync('node', [path.join('scripts', script)], { cwd: ROOT, stdio: 'inherit', env });
  }
}

// Re-vendor the admin-app configurator core from the framework clone so the
// vendored UI moves to the same release as the bundled CSS in one step —
// otherwise `npm run check` fails right after a version bump because
// admin-app/src/ still reflects the previous release.
function syncAdminAppCore() {
  const adminApp = path.join(ROOT, 'SLASHED-for-WP', 'admin-app');
  const cfgSrc = path.join(FRAMEWORK_DIR, 'configurator', 'src');
  if (!fs.existsSync(path.join(cfgSrc, 'App.svelte'))) {
    log('WARN: framework clone has no configurator/src — skipping admin-app vendoring');
    return;
  }
  execFileSync('node', [path.join('scripts', 'sync-core.mjs')], {
    cwd: adminApp,
    stdio: 'inherit',
    // update-framework is an explicit maintenance action: re-vendoring is the
    // whole point, so never inherit a SLASHED_SKIP_SYNC=1 opt-out from the
    // caller's environment (which would silently skip it and leave the repo
    // on a mixed framework ref).
    env: { ...process.env, SLASHED_CONFIGURATOR_SRC: cfgSrc, SLASHED_SKIP_SYNC: '0' },
  });
  log('vendored admin-app configurator core from framework clone');
}

function stampCssRef(tag) {
  for (const { file, name } of CSS_REF_TARGETS) {
    const abs = path.join(ROOT, file);
    const src = fs.readFileSync(abs, 'utf8');
    const re = new RegExp(`(define\\(\\s*'${name}',\\s*)'[^']*'(\\s*\\))`);
    if (!re.test(src)) throw new Error(`could not find ${name} define in ${file}`);
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

  await downloadReleaseBundles(tag);
  cloneFrameworkSource(tag);
  regenerateData();
  syncAdminAppCore();
  stampCssRef(tag);

  const { errors, info } = runChecks();
  for (const line of info) log(`verify: ${line}`);
  if (errors.length) {
    for (const e of errors) console.error(`[update-framework] verify FAIL: ${e}`);
    throw new Error('post-sync verification failed');
  }

  log(`done — plugin now tracks framework ${tag}.`);
  log('next: npm run build:apps && npm run build:zip   (rebuild SPA assets + package)');
}

main().catch((err) => {
  console.error(`[update-framework] ${err.message}`);
  process.exit(1);
});
