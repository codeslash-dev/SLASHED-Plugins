#!/usr/bin/env node
// Copies the local-delivery CSS bundles (essential, optimal, full) from the
// root dist/ build output into the WordPress plugin's bundled dist/.
//
// The plugin ships these files so sites can load SLASHED without a CDN
// (see Slashed_CSS_Loader / "local-first delivery"). They must always match
// the bundles built from the current core/optional sources, so this runs as
// part of `npm run build` and is registered in scripts/artifacts.json —
// `node scripts/check-artifacts.js --check` fails CI if they ever drift.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
// The SLASHED framework is a separate repo. Point SLASHED_FRAMEWORK_DIR at a
// local checkout (or installed package) that contains the built dist/ bundles;
// defaults to a sibling ../SLASHED checkout.
const FRAMEWORK = process.env.SLASHED_FRAMEWORK_DIR
  ? path.resolve(process.env.SLASHED_FRAMEWORK_DIR)
  : fs.existsSync(path.join(ROOT, '.framework'))
    ? path.join(ROOT, '.framework')
    : path.resolve(ROOT, '..', 'SLASHED');
const SRC_DIR = path.join(FRAMEWORK, 'dist');
const DEST_DIR = path.join(ROOT, 'SLASHED-for-WP/dist');

const BUNDLES = ['essential', 'optimal', 'full'];

fs.mkdirSync(DEST_DIR, { recursive: true });

for (const bundle of BUNDLES) {
  const filename = `slashed.${bundle}.css`;
  fs.copyFileSync(path.join(SRC_DIR, filename), path.join(DEST_DIR, filename));
  console.log(`[sync-plugin-dist] → SLASHED-for-WP/dist/${filename}`);
}
