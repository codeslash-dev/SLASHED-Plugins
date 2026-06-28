#!/usr/bin/env node
/**
 * Syncs the SLASHED framework configurator into this plugin's admin app.
 * Run via `npm run sync` or automatically as predev / prebuild hook.
 *
 * The configurator (`SLASHED/configurator`) is the single source of truth for
 * the design UI. This script vendors its entire `src/` tree plus the framework
 * CSS the chrome + preview need (resolved through the `@framework-css` alias in
 * vite.config.js).
 *
 * Source priority:
 *   1. Local sibling repo  (no token needed, fastest)
 *      Looks for  ../../../../../../slashed/configurator/src/  (and nearby)
 *   2. GitHub API  https://api.github.com/repos/codeslash-dev/slashed
 *      Set GITHUB_TOKEN env var to avoid public rate limits.
 *
 * The configurator is now embeddable on its own (it auto-detects WordPress via
 * window.slashedApp and persists through the REST API), so NOTHING in src/ needs
 * to diverge — `.syncignore` is empty by default. Plugin build wiring lives
 * outside src/ (vite.config.js, package.json, svelte.config.js, tsconfig.json)
 * and is never touched by this script.
 */

import {
  readFileSync, writeFileSync, mkdirSync, existsSync,
  readdirSync, statSync, copyFileSync, rmSync,
} from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ADMIN_APP = resolve(__dir, '..');
const SRC = resolve(ADMIN_APP, 'src');
const SRC_ROOT = SRC + sep; // canonical prefix for path-traversal guard

// Vendored framework CSS — target of the @framework-css alias.
const VENDOR = resolve(ADMIN_APP, 'framework-css');
const VENDOR_CORE = resolve(VENDOR, 'core');
const VENDOR_BADGES = resolve(VENDOR, 'badges');

// The plugin's own full bundle — used as the preview stylesheet so the preview
// matches the framework CSS the site actually serves.
const PLUGIN_FULL_CSS = resolve(ADMIN_APP, '../dist/slashed.full.css');

const SLASHED_REPO = 'codeslash-dev/slashed';
const REF = 'main';
const CFG_SRC = 'configurator/src';

// Chrome layers loaded at :root by src/main.ts (framework *source*, committed).
const CHROME_LAYERS = [
  'layers.css', 'tokens.css', 'tokens.layout.css', 'tokens.macros.css',
  'themes.css', 'layout.css', 'macros.css',
];

// ── Path safety ───────────────────────────────────────────────────────────────

/** Throw if `destPath` resolves outside the SRC directory. */
function assertWithinSrc(destPath) {
  const resolved = resolve(destPath);
  if (resolved !== SRC && !resolved.startsWith(SRC_ROOT)) {
    throw new Error(`Path traversal rejected: ${destPath} is outside src/`);
  }
}

/** Validate a single file/dir name returned by the GitHub API. */
function assertSafeName(name) {
  if (
    typeof name !== 'string' ||
    name.includes('/') ||
    name.includes('\\') ||
    name === '..' ||
    name.startsWith('../') ||
    name.includes('/../')
  ) {
    throw new Error(`Unsafe file name from API: ${JSON.stringify(name)}`);
  }
}

// ── Syncignore ───────────────────────────────────────────────────────────────

const IGNORE_PATH = resolve(ADMIN_APP, '.syncignore');
const syncIgnore = new Set(
  existsSync(IGNORE_PATH)
    ? readFileSync(IGNORE_PATH, 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
    : [],
);

function isIgnored(relFromSrc) {
  return syncIgnore.has(relFromSrc) || syncIgnore.has('src/' + relFromSrc);
}

// ── Framework CSS vendoring (shared) ───────────────────────────────────────────

/** Copy the plugin's full bundle into the vendored badges/ dir for the preview. */
function vendorFullBundle() {
  mkdirSync(VENDOR_BADGES, { recursive: true });
  if (existsSync(PLUGIN_FULL_CSS)) {
    copyFileSync(PLUGIN_FULL_CSS, join(VENDOR_BADGES, 'slashed.full.css'));
    process.stdout.write('  copy  framework-css/badges/slashed.full.css (from dist/)\n');
  } else if (existsSync(join(VENDOR_BADGES, 'slashed.full.css'))) {
    process.stdout.write('  keep  framework-css/badges/slashed.full.css (dist/ bundle missing)\n');
  } else {
    process.stderr.write('  WARN  dist/slashed.full.css not found — preview will be unstyled until the framework CSS is installed.\n');
  }
}

// ── Local sync ────────────────────────────────────────────────────────────────

function findLocalCfgSrc() {
  // Explicit override wins (CI / non-standard checkouts).
  if (process.env.SLASHED_CONFIGURATOR_SRC) {
    const p = resolve(process.env.SLASHED_CONFIGURATOR_SRC);
    if (existsSync(join(p, 'App.svelte'))) return p;
  }
  // Try a range of sibling-repo layouts and both casings of the repo dir.
  const rels = [
    '../../../../../../', '../../../../../', '../../../../', '../../../', '../../',
  ];
  const repoDirs = ['slashed', 'SLASHED'];
  for (const rel of rels) {
    for (const dir of repoDirs) {
      const p = resolve(ADMIN_APP, rel + dir + '/configurator/src');
      // Marker file in the current (TypeScript) configurator tree.
      if (existsSync(join(p, 'App.svelte'))) return p;
    }
  }
  return null;
}

function copyLocalDir(srcDir, srcBase) {
  for (const entry of readdirSync(srcDir)) {
    const srcPath = join(srcDir, entry);
    const rel = relative(srcBase, srcPath);
    if (statSync(srcPath).isDirectory()) {
      copyLocalDir(srcPath, srcBase);
    } else {
      if (isIgnored(rel)) {
        process.stdout.write(`  skip  src/${rel} (syncignore)\n`);
        continue;
      }
      const destPath = join(SRC, rel);
      assertWithinSrc(destPath);
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
      process.stdout.write(`  copy  src/${rel}\n`);
    }
  }
}

function vendorChromeLocal(repoRoot) {
  const coreDir = resolve(repoRoot, 'core');
  mkdirSync(VENDOR_CORE, { recursive: true });
  for (const name of CHROME_LAYERS) {
    const from = join(coreDir, name);
    if (!existsSync(from)) {
      throw new Error(`Framework chrome layer missing: ${from}`);
    }
    copyFileSync(from, join(VENDOR_CORE, name));
    process.stdout.write(`  copy  framework-css/core/${name}\n`);
  }
}

// ── GitHub API sync ───────────────────────────────────────────────────────────

async function ghFetch(path) {
  const url = `https://api.github.com/repos/${SLASHED_REPO}/contents/${path}?ref=${REF}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'slashed-admin-app-sync/2.0',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = new Error(`GitHub API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

async function ghFetchContent(ghPath) {
  const info = await ghFetch(ghPath);
  if (typeof info.content !== 'string') {
    throw new Error(`Unexpected API response for ${ghPath}: missing content`);
  }
  return Buffer.from(info.content, 'base64').toString('utf8');
}

async function syncGhFile(ghPath, destPath) {
  assertWithinSrc(destPath);
  const rel = relative(SRC, destPath);
  if (isIgnored(rel)) {
    process.stdout.write(`  skip  src/${rel} (syncignore)\n`);
    return;
  }
  let content;
  try {
    content = await ghFetchContent(ghPath);
  } catch (err) {
    if ((err.status === 403 || err.status === 404) && existsSync(destPath)) {
      process.stdout.write(`  keep  src/${rel} (GitHub API ${err.status} — keeping vendored copy)\n`);
      return;
    }
    throw err;
  }
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, content, { encoding: 'utf8' });
  process.stdout.write(`  fetch src/${rel}\n`);
}

async function syncGhDir(ghDir, destDir) {
  assertWithinSrc(destDir);
  const entries = await ghFetch(ghDir);
  if (!Array.isArray(entries)) {
    throw new Error(`Expected directory listing from API for ${ghDir}`);
  }
  await Promise.all(
    entries.map((entry) => {
      assertSafeName(entry.name);
      const localPath = join(destDir, entry.name);
      return entry.type === 'dir'
        ? syncGhDir(entry.path, localPath)
        : syncGhFile(entry.path, localPath);
    }),
  );
}

async function vendorChromeRemote() {
  mkdirSync(VENDOR_CORE, { recursive: true });
  for (const name of CHROME_LAYERS) {
    const dest = join(VENDOR_CORE, name);
    try {
      const content = await ghFetchContent(`core/${name}`);
      // lgtm[js/path-injection] -- dest is join(VENDOR_CORE, name) where name
      // is from the hardcoded CHROME_LAYERS array, not from network data.
      writeFileSync(dest, content, 'utf8');
      process.stdout.write(`  fetch framework-css/core/${name}\n`);
    } catch (err) {
      if ((err.status === 403 || err.status === 404) && existsSync(dest)) {
        process.stdout.write(`  keep  framework-css/core/${name} (GitHub API ${err.status})\n`);
        continue;
      }
      throw err;
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Syncing configurator core...');

  const local = findLocalCfgSrc();
  if (local) {
    console.log(`  source: local ${local}`);
    // Fresh tree: drop any stale files from the previous fork before copying.
    if (existsSync(SRC)) rmSync(SRC, { recursive: true, force: true });
    mkdirSync(SRC, { recursive: true });
    copyLocalDir(local, local);
    vendorChromeLocal(resolve(local, '../..')); // configurator/src -> repo root
    vendorFullBundle();
    console.log('Done (local).');
    return;
  }

  console.log(`  source: GitHub ${SLASHED_REPO}@${REF}`);
  // Recursively vendor the entire configurator/src tree (components, lib, data,
  // and root files: App.svelte, main.ts, types.ts, app.css, vite-env.d.ts).
  await syncGhDir(CFG_SRC, SRC);
  await vendorChromeRemote();
  vendorFullBundle();
  console.log('Done (remote).');
}

main().catch((err) => {
  console.error('sync-core failed:', err.message);
  process.exit(1);
});
