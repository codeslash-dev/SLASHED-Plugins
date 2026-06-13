#!/usr/bin/env node
/**
 * Syncs shared configurator files from the SLASHED framework repo.
 * Run via `npm run sync` or automatically as predev / prebuild hook.
 *
 * Source priority:
 *   1. Local sibling repo  (no token needed, fastest)
 *      Looks for  ../../../../../../slashed/configurator/src/
 *      and        ../../../../slashed/configurator/src/
 *   2. GitHub API  https://api.github.com/repos/codeslash-dev/slashed
 *      Set GITHUB_TOKEN env var to avoid public rate limits (3000 reqs/hr).
 *
 * Files in .syncignore are WP-specific and must NOT be overwritten.
 */

import {
  readFileSync, writeFileSync, mkdirSync, existsSync,
  readdirSync, statSync, copyFileSync,
} from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ADMIN_APP = resolve(__dir, '..');
const SRC = resolve(ADMIN_APP, 'src');

const SLASHED_REPO = 'codeslash-dev/slashed';
const REF = 'main';
const CFG_SRC = 'configurator/src';

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

// ── Local sync ────────────────────────────────────────────────────────────────

function findLocalCfgSrc() {
  const candidates = [
    resolve(ADMIN_APP, '../../../../../../slashed/configurator/src'),
    resolve(ADMIN_APP, '../../../../slashed/configurator/src'),
    resolve(ADMIN_APP, '../../../../../slashed/configurator/src'),
  ];
  for (const p of candidates) {
    if (existsSync(join(p, 'lib/model.js'))) return p;
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
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
      process.stdout.write(`  copy  src/${rel}\n`);
    }
  }
}

// ── GitHub API sync ───────────────────────────────────────────────────────────

async function ghFetch(path) {
  const url = `https://api.github.com/repos/${SLASHED_REPO}/contents/${path}?ref=${REF}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'slashed-admin-app-sync/1.0',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path}`);
  return res.json();
}

async function syncGhFile(ghPath, destPath) {
  const rel = relative(SRC, destPath);
  if (isIgnored(rel)) {
    process.stdout.write(`  skip  src/${rel} (syncignore)\n`);
    return;
  }
  const info = await ghFetch(ghPath);
  const content = Buffer.from(info.content, 'base64').toString('utf8');
  mkdirSync(dirname(destPath), { recursive: true });
  writeFileSync(destPath, content);
  process.stdout.write(`  fetch src/${rel}\n`);
}

async function syncGhDir(ghDir, destDir) {
  const entries = await ghFetch(ghDir);
  await Promise.all(
    entries.map((entry) => {
      const localPath = join(destDir, entry.name);
      return entry.type === 'dir'
        ? syncGhDir(entry.path, localPath)
        : syncGhFile(entry.path, localPath);
    }),
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Syncing configurator core...');

  const local = findLocalCfgSrc();
  if (local) {
    console.log(`  source: local ${local}`);
    copyLocalDir(local, local);
    console.log('Done (local).');
    return;
  }

  console.log(`  source: GitHub ${SLASHED_REPO}@${REF}`);
  await syncGhDir(`${CFG_SRC}/components`, resolve(SRC, 'components'));
  await syncGhDir(`${CFG_SRC}/lib`, resolve(SRC, 'lib'));

  // The generated catalogue (baked at build time in the configurator)
  await syncGhFile(
    `${CFG_SRC}/data/api-index.generated.json`,
    resolve(SRC, 'data/api-index.generated.json'),
  );

  // Top-level CSS (configurator chrome styles, if any live at src/)
  const topLevel = await ghFetch(CFG_SRC);
  for (const entry of topLevel) {
    if (entry.type === 'file' && entry.name.endsWith('.css')) {
      await syncGhFile(entry.path, resolve(SRC, entry.name));
    }
  }

  console.log('Done (remote).');
}

main().catch((err) => {
  console.error('sync-core failed:', err.message);
  process.exit(1);
});
