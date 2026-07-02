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
 *
 * --check / --dry-run: reports drift against the framework source (files that
 * would change, be added, or are vendored locally but no longer exist upstream)
 * without writing anything. Used by `npm run check` (PL-025) to catch admin-app
 * vendoring drift in CI. See writeFile() below — every write in this script
 * routes through it, so the "never touch disk in check mode" invariant only
 * has to hold in one place.
 */

import {
  readFileSync, writeFileSync, mkdirSync, existsSync,
  readdirSync, statSync, copyFileSync, rmSync,
  openSync, fstatSync, closeSync, constants,
} from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECK_MODE = process.argv.includes('--check') || process.argv.includes('--dry-run');

// ── Vendored manifest ─────────────────────────────────────────────────────────
// Written after every real sync so editors / AI tools can tell at a glance
// which files in src/ originate from the framework and must NOT be edited
// here. Edit those files in codeslash-dev/SLASHED → configurator/src/ instead.
// Skipped entirely in --check mode (no sync happened, nothing to record).

const MANIFEST_PATH = resolve(resolve(dirname(fileURLToPath(import.meta.url)), '..'), '.vendored-manifest.json');
const _vendoredFiles = [];

function toPosix(p) {
  return sep === '/' ? p : p.split(sep).join('/');
}

function trackVendored(relFromSrc, source) {
  _vendoredFiles.push({ file: `src/${toPosix(relFromSrc)}`, source });
}

function writeManifest(sourceLabel) {
  const manifest = {
    _info: {
      description: 'Files vendored from the SLASHED framework configurator. DO NOT edit directly — make changes in codeslash-dev/SLASHED → configurator/src/ and re-run npm run sync.',
      frameworkRepo: 'https://github.com/codeslash-dev/SLASHED',
      configuratorSrc: 'configurator/src/',
      source: sourceLabel,
      syncedAt: new Date().toISOString(),
    },
    vendoredFiles: _vendoredFiles.slice().sort((a, b) => a.file.localeCompare(b.file)),
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  process.stdout.write(`  wrote .vendored-manifest.json (${_vendoredFiles.length} files)\n`);
}

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
  const posix = toPosix(relFromSrc);
  return syncIgnore.has(posix) || syncIgnore.has('src/' + posix);
}

// ── --check mode: drift tracking + the single write call site ─────────────────

const driftFindings = [];
// Relative (posix, from SRC) paths this run actually resolved against the
// framework source — used in --check mode to detect files vendored locally
// that no longer exist upstream ("orphans").
const visitedSrcRel = new Set();

function reportDrift(kind, label, detail) {
  driftFindings.push(`  ${kind.padEnd(8)} ${label}${detail ? ` (${detail})` : ''}`);
}

/**
 * Writes `content` (string or Buffer) to `destPath` — or, in --check mode,
 * compares it against the existing file and records drift instead of
 * touching disk. This is the *only* place either the real sync or the check
 * mode writes a file, so "never write in --check mode" only needs to be true
 * here rather than in every call site separately.
 */
function writeFile(destPath, content, label) {
  if (!CHECK_MODE) {
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, content);
    return;
  }
  const next = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  if (!existsSync(destPath)) {
    reportDrift('missing', label, 'present upstream, not vendored locally');
    return;
  }
  const existing = readFileSync(destPath);
  if (!existing.equals(next)) {
    reportDrift('stale', label, 'vendored copy differs from upstream source');
  }
}

/** Recursively list every file under `dir`, relative (posix) to `base`. Read-only. */
function listRelFiles(dir, base, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      listRelFiles(p, base, out);
    } else {
      out.push(toPosix(relative(base, p)));
    }
  }
  return out;
}

/**
 * In --check mode, flag files vendored locally but no longer resolved from
 * upstream: src/ files not visited this run, and framework-css/core/ files
 * outside the fixed CHROME_LAYERS set (the complete, hardcoded list of
 * chrome layers this script ever vendors — anything else there is stale).
 */
function reportOrphans() {
  if (!CHECK_MODE) return;
  for (const rel of listRelFiles(SRC, SRC)) {
    if (isIgnored(rel) || visitedSrcRel.has(rel)) continue;
    reportDrift('orphan', `src/${rel}`, 'vendored locally, no longer present upstream');
  }
  for (const rel of listRelFiles(VENDOR_CORE, VENDOR_CORE)) {
    if (CHROME_LAYERS.includes(rel)) continue;
    reportDrift('orphan', `framework-css/core/${rel}`, 'vendored locally, no longer a tracked chrome layer');
  }
}

/** Print the check result and set the process exit code. Never used outside --check mode. */
function finishCheck(sourceLabel) {
  console.log(`  source: ${sourceLabel}`);
  if (driftFindings.length === 0) {
    console.log('OK — admin-app/src/ (and vendored framework-css/) match the framework configurator.');
    return;
  }
  console.error('Drift detected against the framework configurator:');
  for (const line of driftFindings) console.error(line);
  console.error(`\n${driftFindings.length} finding(s) — run npm run sync to update.`);
  process.exitCode = 1;
}

// ── Framework CSS vendoring (shared) ───────────────────────────────────────────

/** Copy the plugin's full bundle into the vendored badges/ dir for the preview. */
function vendorFullBundle() {
  const label = 'framework-css/badges/slashed.full.css';
  const dest = join(VENDOR_BADGES, 'slashed.full.css');
  if (existsSync(PLUGIN_FULL_CSS)) {
    if (!CHECK_MODE) mkdirSync(VENDOR_BADGES, { recursive: true });
    writeFile(dest, readFileSync(PLUGIN_FULL_CSS), label);
    if (!CHECK_MODE) process.stdout.write(`  copy  ${label} (from dist/)\n`);
  } else if (existsSync(dest)) {
    if (!CHECK_MODE) process.stdout.write(`  keep  ${label} (dist/ bundle missing)\n`);
  } else {
    process.stderr.write(`  WARN  dist/slashed.full.css not found — preview will be unstyled until the framework CSS is installed.\n`);
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
    // Open first so the isDirectory check and (for files) the read below
    // operate on the same fd/inode — no TOCTOU window between checking what
    // the entry is and using it, matching the O_NOFOLLOW idiom used elsewhere
    // in this file for the syncignore-preservation reads.
    const fd = openSync(srcPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
    let isDir;
    try {
      isDir = fstatSync(fd).isDirectory();
      if (!isDir) {
        if (isIgnored(rel)) {
          if (!CHECK_MODE) process.stdout.write(`  skip  src/${rel} (syncignore)\n`);
        } else {
          const destPath = join(SRC, rel);
          assertWithinSrc(destPath);
          const relPosix = toPosix(rel);
          visitedSrcRel.add(relPosix);
          writeFile(destPath, readFileSync(fd), `src/${relPosix}`);
          if (!CHECK_MODE) {
            trackVendored(rel, `local:configurator/src/${rel}`);
            process.stdout.write(`  copy  src/${rel}\n`);
          }
        }
      }
    } finally {
      closeSync(fd);
    }
    if (isDir) copyLocalDir(srcPath, srcBase);
  }
}

function vendorChromeLocal(repoRoot) {
  const coreDir = resolve(repoRoot, 'core');
  if (!CHECK_MODE) mkdirSync(VENDOR_CORE, { recursive: true });
  for (const name of CHROME_LAYERS) {
    const from = join(coreDir, name);
    if (!existsSync(from)) {
      throw new Error(`Framework chrome layer missing: ${from}`);
    }
    const dest = join(VENDOR_CORE, name);
    const label = `framework-css/core/${name}`;
    writeFile(dest, readFileSync(from), label);
    if (!CHECK_MODE) process.stdout.write(`  copy  ${label}\n`);
  }
}

// ── GitHub API sync ───────────────────────────────────────────────────────────
//
// Content fetched here is written to disk verbatim by writeFile() (source
// vendoring — there's no meaningful way to "sanitize" a .svelte/.ts file
// without corrupting it). The accepted trust boundary: SLASHED_REPO/REF are
// hardcoded constants (not derived from any input), fetched over HTTPS via
// the official GitHub REST API, and every write destination is confined to
// SRC by assertWithinSrc()/assertSafeName() regardless of fetched content.

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
  const relPosix = toPosix(rel);
  if (isIgnored(rel)) {
    if (!CHECK_MODE) process.stdout.write(`  skip  src/${rel} (syncignore)\n`);
    return;
  }
  visitedSrcRel.add(relPosix);
  let content;
  try {
    content = await ghFetchContent(ghPath);
  } catch (err) {
    if ((err.status === 403 || err.status === 404) && existsSync(destPath)) {
      if (!CHECK_MODE) process.stdout.write(`  keep  src/${rel} (GitHub API ${err.status} — keeping vendored copy)\n`);
      return;
    }
    throw err;
  }
  writeFile(destPath, content, `src/${relPosix}`);
  if (!CHECK_MODE) {
    trackVendored(rel, `github:${SLASHED_REPO}/${ghPath}@${REF}`);
    process.stdout.write(`  fetch src/${rel}\n`);
  }
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
  if (!CHECK_MODE) mkdirSync(VENDOR_CORE, { recursive: true });
  for (const name of CHROME_LAYERS) {
    const dest = join(VENDOR_CORE, name);
    const label = `framework-css/core/${name}`;
    try {
      const content = await ghFetchContent(`core/${name}`);
      writeFile(dest, content, label);
      if (!CHECK_MODE) process.stdout.write(`  fetch ${label}\n`);
    } catch (err) {
      if ((err.status === 403 || err.status === 404) && existsSync(dest)) {
        if (!CHECK_MODE) process.stdout.write(`  keep  ${label} (GitHub API ${err.status})\n`);
        continue;
      }
      throw err;
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(CHECK_MODE ? 'Checking configurator core sync...' : 'Syncing configurator core...');

  const local = findLocalCfgSrc();
  if (local) {
    if (!CHECK_MODE) {
      console.log(`  source: local ${local}`);
      // Fresh tree: drop any stale files from the previous fork before copying,
      // but preserve syncignored plugin-specific files across the wipe (mirrors
      // the same logic used in GitHub API mode).
      const preserved = [];
      if (existsSync(SRC)) {
        for (const entry of syncIgnore) {
          const rel = entry.startsWith('src/') ? entry.slice(4) : entry;
          const srcPath = resolve(join(SRC, rel));
          if (!srcPath.startsWith(SRC_ROOT)) continue;
          // O_NOFOLLOW rejects symlinks at open time without a TOCTOU-prone pre-check.
          let fd;
          try { fd = openSync(srcPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)); } catch { continue; }
          try {
            if (!fstatSync(fd).isFile()) continue;
            preserved.push({ rel, content: readFileSync(fd) });
            process.stdout.write(`  keep  src/${rel} (syncignore — saved across wipe)\n`);
          } finally { closeSync(fd); }
        }
        rmSync(SRC, { recursive: true, force: true });
      }
      mkdirSync(SRC, { recursive: true });
      for (const { rel, content } of preserved) {
        const destPath = resolve(join(SRC, rel));
        if (!destPath.startsWith(SRC_ROOT)) continue;
        mkdirSync(dirname(destPath), { recursive: true });
        writeFileSync(destPath, content);
      }
    }
    // --check mode never wipes/preserves — SRC is left untouched; copyLocalDir
    // below only reads from it (via writeFile()'s compare branch).
    copyLocalDir(local, local);
    vendorChromeLocal(resolve(local, '../..')); // configurator/src -> repo root
    vendorFullBundle();
    if (CHECK_MODE) {
      reportOrphans();
      finishCheck(`local ${local}`);
      return;
    }
    writeManifest(process.env.SLASHED_CONFIGURATOR_SRC ? 'local:SLASHED_CONFIGURATOR_SRC' : 'local');
    console.log('Done (local).');
    return;
  }

  if (!CHECK_MODE) {
    console.log(`  source: GitHub ${SLASHED_REPO}@${REF}`);
    // Fresh tree: drop stale files before fetching, but preserve any syncignored
    // files so plugin-specific overrides survive the wipe.
    const preserved = [];
    if (existsSync(SRC)) {
      for (const entry of syncIgnore) {
        const rel = entry.startsWith('src/') ? entry.slice(4) : entry;
        const srcPath = resolve(join(SRC, rel));
        if (!srcPath.startsWith(SRC_ROOT)) continue;
        // Open the fd first so stat + read operate on the same inode (no
        // TOCTOU). O_NOFOLLOW rejects symlinks at open time, matching the
        // local-source preserve block above.
        let fd;
        try { fd = openSync(srcPath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)); } catch { continue; }
        try {
          if (!fstatSync(fd).isFile()) continue;
          preserved.push({ rel, content: readFileSync(fd) });
          process.stdout.write(`  keep  src/${rel} (syncignore — saved across wipe)\n`);
        } finally { closeSync(fd); }
      }
      rmSync(SRC, { recursive: true, force: true });
    }
    mkdirSync(SRC, { recursive: true });
    for (const { rel, content } of preserved) {
      const destPath = resolve(join(SRC, rel));
      if (!destPath.startsWith(SRC_ROOT)) continue;
      mkdirSync(dirname(destPath), { recursive: true });
      writeFileSync(destPath, content);
    }
  }
  // Recursively vendor the entire configurator/src tree (components, lib, data,
  // and root files: App.svelte, main.ts, types.ts, app.css, vite-env.d.ts).
  await syncGhDir(CFG_SRC, SRC);
  await vendorChromeRemote();
  vendorFullBundle();
  if (CHECK_MODE) {
    reportOrphans();
    finishCheck(`GitHub ${SLASHED_REPO}@${REF}`);
    return;
  }
  writeManifest(`github:${SLASHED_REPO}@${REF}`);
  console.log('Done (remote).');
}

main().catch((err) => {
  console.error('sync-core failed:', err.message);
  process.exit(1);
});
