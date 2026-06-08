#!/usr/bin/env node

/**
 * Packages the unified SLASHED WordPress plugin into a distributable zip.
 *
 * Output: dist/slashed.zip
 *
 * The zip contains a single top-level `slashed/` directory with:
 *   slashed.php                          — unified entry point
 *   includes/                            — shared PHP classes
 *   dist/                                — bundled CSS for local-first delivery
 *   integrations/bricks/
 *     slashed-bricks.php
 *     includes/                          — Bricks PHP classes
 *     assets/                            — pre-built admin/editor JS + CSS
 *     data/                              — fallback inventory.json
 *   integrations/gutenberg/
 *     slashed-gutenberg.php
 *     includes/                          — Gutenberg PHP classes
 *
 * Source directories (admin-app/, editor-app/) are excluded — their built
 * output already lives in assets/.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execSync, execFileSync } from 'node:child_process';

const ROOT   = path.resolve(import.meta.dirname, '..');
const OUTPUT = path.join(ROOT, 'dist', 'slashed.zip');
const STAGE  = path.join(ROOT, '.tmp-plugin-stage');
const STAGE_PLUGIN = path.join(STAGE, 'slashed');

const PLUGIN_ROOT = 'SLASHED-for-WP';

// Paths relative to ROOT that are copied into the zip.
// src is the repo path; dest is the path inside the slashed/ zip folder.
const INCLUDE = [
  { src: `${PLUGIN_ROOT}/slashed.php`,                                  dest: 'slashed.php' },
  { src: `${PLUGIN_ROOT}/includes`,                                     dest: 'includes' },
  { src: `${PLUGIN_ROOT}/dist`,                                         dest: 'dist', required: true },
  { src: `${PLUGIN_ROOT}/data`,                                         dest: 'data' },
  { src: `${PLUGIN_ROOT}/integrations/bricks/slashed-bricks.php`,      dest: 'integrations/bricks/slashed-bricks.php' },
  { src: `${PLUGIN_ROOT}/integrations/bricks/includes`,                 dest: 'integrations/bricks/includes' },
  { src: `${PLUGIN_ROOT}/integrations/bricks/assets`,                   dest: 'integrations/bricks/assets' },
  { src: `${PLUGIN_ROOT}/integrations/bricks/data`,                     dest: 'integrations/bricks/data' },
  { src: `${PLUGIN_ROOT}/integrations/gutenberg/slashed-gutenberg.php`, dest: 'integrations/gutenberg/slashed-gutenberg.php' },
  { src: `${PLUGIN_ROOT}/integrations/gutenberg/includes`,              dest: 'integrations/gutenberg/includes' },
];

function copyRecursive(src, dest) {
  const stat = fs.lstatSync(src);
  if (stat.isSymbolicLink()) {
    console.warn(`[zip-plugin] warning: skipping symlink ${src}`);
    return;
  }
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function clean(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function main() {
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  clean(STAGE);
  fs.mkdirSync(STAGE_PLUGIN, { recursive: true });

  for (const { src: srcRel, dest: destRel, required } of INCLUDE) {
    const src  = path.join(ROOT, srcRel);
    const dest = path.join(STAGE_PLUGIN, destRel);
    if (!fs.existsSync(src)) {
      if (required) {
        throw new Error(`[zip-plugin] required path missing: ${srcRel} — run \`npm run build\` first`);
      }
      console.warn(`[zip-plugin] warning: ${srcRel} not found, skipping`);
      continue;
    }
    copyRecursive(src, dest);
  }

  if (fs.existsSync(OUTPUT)) fs.unlinkSync(OUTPUT);

  try {
    execSync('which zip', { stdio: 'ignore' });
    execFileSync('zip', ['-r', OUTPUT, 'slashed'], { cwd: STAGE, stdio: 'pipe' });
  } catch {
    createZipFromDir(STAGE_PLUGIN, OUTPUT, 'slashed');
  }

  const kb = (fs.statSync(OUTPUT).size / 1024).toFixed(1);
  console.log(`[zip-plugin] → dist/slashed.zip (${kb} kB)`);

  clean(STAGE);
}

/**
 * Minimal zip creator using Node.js built-ins (no external dependencies).
 * Handles files and directories with DEFLATE compression.
 */
function createZipFromDir(sourceDir, outputPath, rootName) {
  const files = [];

  function walk(dir, rel) {
    for (const entry of fs.readdirSync(dir)) {
      const full     = path.join(dir, entry);
      const entryRel = rel ? `${rel}/${entry}` : entry;
      const stat     = fs.statSync(full);
      if (stat.isDirectory()) {
        files.push({ path: `${rootName}/${entryRel}/`, isDir: true });
        walk(full, entryRel);
      } else {
        files.push({ path: `${rootName}/${entryRel}`, isDir: false, data: fs.readFileSync(full) });
      }
    }
  }

  files.unshift({ path: `${rootName}/`, isDir: true });
  walk(sourceDir, '');

  const localHeaders   = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf      = Buffer.from(file.path, 'utf8');
    const uncompressed = file.isDir ? Buffer.alloc(0) : file.data;
    const compressed   = file.isDir ? Buffer.alloc(0) : zlib.deflateRawSync(uncompressed, { level: 9 });
    const crc          = crc32(uncompressed);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(file.isDir ? 0 : 8, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(uncompressed.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);

    localHeaders.push(Buffer.concat([local, compressed]));

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(file.isDir ? 0 : 8, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(uncompressed.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(file.isDir ? 0x10 : 0, 38);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    centralHeaders.push(central);
    offset += local.length + compressed.length;
  }

  const centralDirBuf = Buffer.concat(centralHeaders);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  fs.writeFileSync(outputPath, Buffer.concat([...localHeaders, centralDirBuf, eocd]));
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

main();
