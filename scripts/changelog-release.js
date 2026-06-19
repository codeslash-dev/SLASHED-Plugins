#!/usr/bin/env node
/**
 * Generates / promotes Keep a Changelog entries.
 *
 * Two modes:
 *   --from-tag            Read the newest git tag, promote [Unreleased] + auto-
 *                         generated entries to [X.Y.Z] - YYYY-MM-DD.
 *   --version=X.Y.Z       Same, with an explicit version.
 *   (no flags)            Re-populate the [Unreleased] section from commits since
 *                         the last tag (or all commits if no tags exist).
 *
 * Commit categorisation (conventional-commit prefixes):
 *   feat / add / new      → Added
 *   fix / bugfix          → Fixed
 *   refactor / perf       → Changed
 *   chore / ci / build / test / docs / deps / bump  → skipped
 *   anything else         → Changed
 *
 * Usage:
 *   node scripts/changelog-release.js
 *   node scripts/changelog-release.js --from-tag
 *   node scripts/changelog-release.js --version=1.2.3
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const CHANGELOG = path.join(ROOT, 'CHANGELOG.md');
const README    = path.join(ROOT, 'SLASHED-for-WP', 'readme.txt');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function arg(flag) {
  const a = process.argv.find(x => x.startsWith(`--${flag}=`));
  return a ? a.slice(flag.length + 3) : null;
}

function git(...args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return null;
  return r.stdout.trim();
}

function resolveVersion() {
  if (process.argv.includes('--from-tag')) {
    const tag = git('describe', '--tags', '--abbrev=0');
    if (!tag) { console.error('changelog-release: no git tags found'); process.exit(1); }
    return tag.replace(/^v/, '');
  }
  const v = arg('version');
  return v || null;
}

// ---------------------------------------------------------------------------
// Commit collection & categorisation
// ---------------------------------------------------------------------------

const SKIP_RE = /^(chore|ci|build|test|docs|deps|bump|release|dependabot|merge|revert|add files|delete|create data|initial commit|update changelog)\b/i;
const FEAT_RE = /^(feat|feature|add|new)\b/i;
const FIX_RE  = /^(fix|bugfix|hotfix)\b/i;

function stripScope(subject) {
  // "fix(release): message" → "message" with title-case
  const m = subject.match(/^[^(:]+(?:\([^)]*\))?:\s*(.*)/);
  return m ? capitalise(m[1]) : capitalise(subject);
}

function capitalise(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function collectCommits(since) {
  const range = since ? `${since}..HEAD` : 'HEAD';
  const log = git(
    'log', range, '--no-merges',
    '--format=%H\x1f%s\x1f%b\x1e',
    '--'
  );
  if (!log) return [];

  return log.split('\x1e').flatMap(entry => {
    const [, subject = '', body = ''] = entry.split('\x1f');
    const s = subject.trim();
    if (!s) return [];
    return [{ subject: s, body: body.trim() }];
  });
}

function categorise(commits) {
  const added   = [];
  const fixed   = [];
  const changed = [];

  for (const { subject } of commits) {
    const bare = subject.replace(/\s*\(#\d+\)\s*$/, '').trim();
    if (SKIP_RE.test(bare)) continue;
    const entry = `- ${stripScope(bare)}`;
    if (FEAT_RE.test(bare))     added.push(entry);
    else if (FIX_RE.test(bare)) fixed.push(entry);
    else                        changed.push(entry);
  }

  return { added, fixed, changed };
}

function renderSection({ added, fixed, changed }) {
  const parts = [];
  if (added.length)   parts.push('### Added\n\n' + added.join('\n'));
  if (changed.length) parts.push('### Changed\n\n' + changed.join('\n'));
  if (fixed.length)   parts.push('### Fixed\n\n' + fixed.join('\n'));
  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// CHANGELOG manipulation
// ---------------------------------------------------------------------------

function parseUnreleased(content) {
  const start = content.indexOf('## [Unreleased]');
  if (start === -1) return { before: content, body: '', after: '' };

  const afterHeader = content.slice(start + '## [Unreleased]'.length);
  const nextSection = afterHeader.search(/\n## /);
  const body = nextSection === -1 ? afterHeader : afterHeader.slice(0, nextSection);
  const after = nextSection === -1 ? '' : afterHeader.slice(nextSection);

  return {
    before: content.slice(0, start),
    body,          // includes leading newline(s)
    after,         // starts with \n## ...
  };
}

function mergeBody(existing, generated) {
  const existingTrimmed = existing.trim();
  const generatedTrimmed = generated.trim();
  // Manual entries in [Unreleased] take precedence — auto-fill only when empty.
  if (existingTrimmed) return `\n\n${existingTrimmed}\n`;
  if (generatedTrimmed) return `\n\n${generatedTrimmed}\n`;
  return '';
}

// ---------------------------------------------------------------------------
// readme.txt == Changelog == sync
// ---------------------------------------------------------------------------

/**
 * Render a WP-format changelog entry from categorised commits.
 * Returns a string like:
 *   = X.Y.Z =
 *   * Added: Foo bar.
 *   * Fixed: Baz qux.
 */
function renderReadmeEntry(version, { added, fixed, changed }) {
  const lines = [
    ...added.map(l => `* Added: ${l.replace(/^- /, '')}`),
    ...changed.map(l => `* Changed: ${l.replace(/^- /, '')}`),
    ...fixed.map(l => `* Fixed: ${l.replace(/^- /, '')}`),
  ];
  if (!lines.length) lines.push('* Maintenance release.');
  return `= ${version} =\n${lines.join('\n')}`;
}

/**
 * Prepend a new = X.Y.Z = entry to the readme.txt == Changelog == section.
 * Skips if the version heading already exists (idempotent).
 */
function syncReadmeChangelog(version, categorised) {
  let content;
  try {
    content = fs.readFileSync(README, 'utf8');
  } catch {
    return; // readme.txt not present in this context (e.g. standalone script run)
  }
  const marker  = '== Changelog ==';
  const idx = content.indexOf(marker);
  if (idx === -1) return;

  const afterMarker = content.slice(idx + marker.length);
  if (afterMarker.includes(`= ${version} =`)) {
    console.log(`changelog-release: readme.txt already has = ${version} =, skipping`);
    return;
  }

  const entry = renderReadmeEntry(version, categorised);
  const updated = content.slice(0, idx + marker.length) + '\n\n' + entry + afterMarker;
  fs.writeFileSync(README, updated, 'utf8');
  console.log(`changelog-release: readme.txt == Changelog == updated with = ${version} =`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const version = resolveVersion();
  const today = arg('date') || new Date().toISOString().split('T')[0];

  // Find the previous tag so we know which commits are new.
  const latestTag = git('describe', '--tags', '--abbrev=0');
  let prevTag = null;
  if (latestTag) {
    if (version && latestTag.replace(/^v/, '') === version) {
      // We're running after the tag was pushed — look for the tag before it.
      prevTag = git('describe', '--tags', '--abbrev=0', `${latestTag}^`) || null;
    } else {
      prevTag = latestTag;
    }
  }

  const commits   = collectCommits(prevTag);
  const { added, fixed, changed } = categorise(commits);
  const generated = renderSection({ added, fixed, changed });

  const content = fs.readFileSync(CHANGELOG, 'utf8');
  const { before, body, after } = parseUnreleased(content);

  if (!version) {
    // Populate-only mode: refresh [Unreleased] with auto-generated entries.
    const newBody = mergeBody(body, generated);
    const updated = `${before}## [Unreleased]${newBody}${after}`;
    fs.writeFileSync(CHANGELOG, updated, 'utf8');
    console.log('changelog-release: [Unreleased] refreshed');
    return;
  }

  // Promote mode: move [Unreleased] → [X.Y.Z] - date
  const mergedBody = mergeBody(body, generated);
  const versionHeader = `## [${version}] - ${today}`;
  const newContent =
    `${before}## [Unreleased]\n\n${versionHeader}${mergedBody}${after}`;

  fs.writeFileSync(CHANGELOG, newContent, 'utf8');
  console.log(`changelog-release: [Unreleased] → [${version}] - ${today}`);

  // Mirror the same entry into readme.txt == Changelog == for WP.org.
  syncReadmeChangelog(version, { added, fixed, changed });
}

main();
