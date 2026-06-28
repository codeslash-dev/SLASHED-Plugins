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

/** Return the value of a --flag=value CLI argument, or null if absent. */
function arg(flag) {
  const a = process.argv.find(x => x.startsWith(`--${flag}=`));
  return a ? a.slice(flag.length + 3) : null;
}

/** Run a git command and return trimmed stdout, or null on non-zero exit. */
function git(...args) {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) return null;
  return r.stdout.trim();
}

/** Determine the target version from CLI flags; returns null in populate mode. */
function resolveVersion() {
  if (process.argv.includes('--from-tag')) {
    const tag = git('describe', '--tags', '--abbrev=0');
    if (!tag) { console.error('changelog-release: no git tags found'); process.exit(1); }
    // Strip a leading v/V case-insensitively so a mis-cased tag like `V0.4.2`
    // doesn't produce a `= V0.4.2 =` changelog heading.
    return tag.replace(/^v/i, '');
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

/** Strip conventional-commit scope and colon prefix, returning title-cased message. */
function stripScope(subject) {
  // "fix(release): message" → "message" with title-case
  const m = subject.match(/^[^(:]+(?:\([^)]*\))?:\s*(.*)/);
  return m ? capitalise(m[1]) : capitalise(subject);
}

/** Uppercase the first character of a string. */
function capitalise(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Collect non-merge commits reachable from HEAD since the given ref (or all commits). */
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

/** Bucket commits into Added / Fixed / Changed, skipping housekeeping prefixes. */
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

/** Render categorised commit buckets as a markdown changelog section string. */
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

/** Split CHANGELOG.md content around the [Unreleased] section. */
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

/**
 * Merge manual [Unreleased] body with auto-generated commit entries.
 * Manual entries take precedence — auto-fill only when the existing body is empty.
 *
 * @param {string} existing - Current [Unreleased] body from CHANGELOG.md.
 * @param {string} generated - Auto-generated section rendered from commits.
 * @returns {string} The body to write, with leading/trailing newlines.
 */
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
 * Convert a CHANGELOG.md version body (markdown) to WP readme.txt bullet lines.
 *
 * Handles both auto-generated (### Added / ### Fixed / ### Changed sections)
 * and manually written free-form entries so readme.txt always mirrors exactly
 * what was promoted into CHANGELOG.md — not a re-derivation from commits.
 */
function changelogBodyToReadmeLines(body) {
  const lines = [];
  let currentSection = '';

  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) continue;

    const sectionMatch = line.match(/^###\s+(.+)/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    const bulletMatch = line.match(/^([-*]|\d+\.)\s+(.*)/);
    if (bulletMatch) {
      const text = bulletMatch[2].trim();
      lines.push(currentSection ? `* ${currentSection}: ${text}` : `* ${text}`);
      continue;
    }

    // Preserve manually written free-form lines not matching any bullet pattern.
    lines.push(currentSection ? `* ${currentSection}: ${line}` : `* ${line}`);
  }

  return lines.length ? lines : ['* Maintenance release.'];
}

/**
 * Prepend a new = X.Y.Z = entry to the readme.txt == Changelog == section.
 * Uses the authoritative mergedBody from CHANGELOG.md so manual [Unreleased]
 * entries are included — not just auto-generated commit entries.
 * Skips if the version heading already exists (idempotent).
 */
function syncReadmeChangelog(version, mergedBody) {
  let content;
  try {
    content = fs.readFileSync(README, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return; // readme.txt not present (e.g. standalone script run)
    throw err; // re-throw unexpected errors so the release fails visibly
  }
  const marker  = '== Changelog ==';
  const idx = content.indexOf(marker);
  if (idx === -1) return;

  const afterMarker = content.slice(idx + marker.length);
  if (afterMarker.includes(`= ${version} =`)) {
    console.log(`changelog-release: readme.txt already has = ${version} =, skipping`);
    return;
  }

  const bulletLines = changelogBodyToReadmeLines(mergedBody);
  const entry = `= ${version} =\n${bulletLines.join('\n')}`;
  const updated = content.slice(0, idx + marker.length) + '\n\n' + entry + afterMarker;
  fs.writeFileSync(README, updated, 'utf8');
  console.log(`changelog-release: readme.txt == Changelog == updated with = ${version} =`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Entry point. Runs in populate mode (refresh [Unreleased]) or promote mode
 * (move [Unreleased] → [X.Y.Z] and sync readme.txt) depending on CLI flags.
 */
function main() {
  const version = resolveVersion();
  const today = arg('date') || new Date().toISOString().split('T')[0];

  // Find the previous tag so we know which commits are new.
  const latestTag = git('describe', '--tags', '--abbrev=0');
  let prevTag = null;
  if (latestTag) {
    if (version && latestTag.replace(/^v/i, '') === version) {
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
  // Pass mergedBody (the authoritative content written to CHANGELOG.md) so
  // any manual [Unreleased] entries are included, not just auto-generated ones.
  syncReadmeChangelog(version, mergedBody);
}

main();
