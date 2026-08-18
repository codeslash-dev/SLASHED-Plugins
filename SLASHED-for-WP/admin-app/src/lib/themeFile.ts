/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Theme-file import/export for the configurator.
 *
 * A theme file is the third persistence form, alongside localStorage
 * (savedThemes.ts) and the share link (codec.ts). Unlike those two it is a
 * FILE: keyed by token name, sorted, pretty-printed — something you commit next
 * to the CSS it themes and review in a pull request.
 *
 * This is a browser-side mirror of scripts/lib/theme-file.js. The two are kept
 * honest by tests/themeFile.test.ts, which runs both implementations over the
 * same fixtures and asserts identical results. A runtime import of the Node
 * module is deliberately avoided: the `@framework-css` alias is remapped by the
 * WordPress plugin to a vendored dist/ that has no scripts/, so reaching
 * outside this package at runtime would break that build.
 */
import RENAME_MAP from "../data/token-renames.generated.json";

export const THEME_SCHEMA_VERSION = 1;
export const THEME_SCHEMA_URL = "https://slashed.codeslash.dev/schema/theme/v1.json";

const TOKEN_NAME_RE = /^--sf-[a-z0-9-]+$/;
const UNSAFE_VALUE_RE = /[;{}]|\/\*|\*\//;

/**
 * Non-whitespace control characters (C0 + DEL), checked AFTER whitespace has
 * been collapsed — so tab/newline in a legitimately multi-line value normalise
 * away rather than being rejected, matching codec.ts's sanitizeValue(). What
 * remains (ESC, BEL, NUL …) is meaningless in CSS and is rejected.
 */
const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f]/;

export interface ThemeFile {
  schemaVersion: number;
  slashedVersion: string | null;
  name: string | null;
  overrides: Record<string, string>;
}

export interface MigrationReport {
  overrides: Record<string, string>;
  renamed: Array<{ from: string; to: string }>;
  removed: Array<{ name: string; reason: string }>;
  unknown: string[];
  collisions: Array<{ from: string; to: string; kept: string }>;
}

const renames: Record<string, string> = (RENAME_MAP as any).renames ?? {};
const removals: Record<string, string> = (RENAME_MAP as any).removals ?? {};

/** Sort an object's keys — stable, diff-friendly output. */
export function sortKeys(obj: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(obj).sort()) out[key] = obj[key];
  return out;
}

export function validateThemeFile(raw: unknown): { theme: ThemeFile | null; errors: string[] } {
  const errors: string[] = [];
  const fail = (msg: string) => {
    errors.push(msg);
    return { theme: null, errors };
  };

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return fail("theme file must be a JSON object.");
  }

  const { schemaVersion, overrides, name, slashedVersion } = raw as any;

  if (!Number.isInteger(schemaVersion)) return fail("`schemaVersion` is missing or not an integer.");
  if (schemaVersion < 1) return fail(`\`schemaVersion\` must be >= 1 (got ${schemaVersion}).`);
  if (schemaVersion > THEME_SCHEMA_VERSION) {
    return fail(
      `\`schemaVersion\` ${schemaVersion} is newer than this SLASHED understands ` +
        `(max ${THEME_SCHEMA_VERSION}). Upgrade SLASHED to read this file.`,
    );
  }

  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    return fail("`overrides` is missing or not an object.");
  }
  if (name != null && typeof name !== "string") errors.push("`name` must be a string when present.");
  if (typeof name === "string" && CONTROL_CHAR_RE.test(name)) {
    errors.push("`name` contains control characters.");
  }
  if (slashedVersion != null && typeof slashedVersion !== "string") {
    errors.push("`slashedVersion` must be a string when present.");
  }

  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
    if (!TOKEN_NAME_RE.test(key)) {
      errors.push(`overrides["${key}"]: not a well-formed --sf-* token name.`);
      continue;
    }
    if (typeof value !== "string") {
      errors.push(`overrides["${key}"]: value must be a string (got ${typeof value}).`);
      continue;
    }
    if (UNSAFE_VALUE_RE.test(value)) {
      errors.push(`overrides["${key}"]: value contains CSS-breaking characters (; { } or comment markers).`);
      continue;
    }
    // Collapse whitespace exactly as codec.ts's sanitizeValue() does, so the
    // two paths cannot disagree about what a value means.
    const normalised = value.replace(/\s+/g, " ").trim();
    if (CONTROL_CHAR_RE.test(normalised)) {
      errors.push(`overrides["${key}"]: value contains control characters.`);
      continue;
    }
    if (normalised === "") {
      // An empty override is not a reset — generateCSS() would emit
      // `--sf-x: ;`, a broken declaration that shadows the real token with
      // nothing. codec.ts already drops empty values on encode and decode.
      errors.push(`overrides["${key}"]: value is empty. Remove the entry to leave the token at its default.`);
      continue;
    }
    clean[key] = normalised;
  }

  if (errors.length) return { theme: null, errors };

  return {
    theme: {
      schemaVersion,
      slashedVersion: typeof slashedVersion === "string" ? slashedVersion : null,
      name: typeof name === "string" ? name : null,
      overrides: clean,
    },
    errors: [],
  };
}

export function parseThemeFile(text: string): { theme: ThemeFile | null; errors: string[] } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err: any) {
    return { theme: null, errors: [`not valid JSON (${err.message}).`] };
  }
  return validateThemeFile(raw);
}

/**
 * Migrate an override set onto the current token API. Never discards an
 * override it does not recognise — unknown names are reported and kept.
 */
export function migrateOverrides(
  overrides: Record<string, string>,
  opts: { live?: Set<string> } = {},
): MigrationReport {
  const out: Record<string, string> = {};
  const renamed: MigrationReport["renamed"] = [];
  const removed: MigrationReport["removed"] = [];
  const unknown: string[] = [];
  const collisions: MigrationReport["collisions"] = [];

  for (const key of Object.keys(overrides).sort()) {
    const value = overrides[key];

    if (Object.prototype.hasOwnProperty.call(removals, key)) {
      removed.push({ name: key, reason: removals[key] });
      continue;
    }

    const target = renames[key];
    if (target) {
      if (Object.prototype.hasOwnProperty.call(overrides, target)) {
        collisions.push({ from: key, to: target, kept: overrides[target] });
        continue;
      }
      // Two different old names can resolve to the same live token (the map
      // contains such pairs). Without this branch the later key would silently
      // overwrite the earlier one. Sorted iteration makes first-claim-wins
      // deterministic.
      if (Object.prototype.hasOwnProperty.call(out, target)) {
        collisions.push({ from: key, to: target, kept: out[target] });
        continue;
      }
      out[target] = value;
      renamed.push({ from: key, to: target });
      continue;
    }

    if (opts.live && !opts.live.has(key)) unknown.push(key);
    out[key] = value;
  }

  return { overrides: sortKeys(out), renamed, removed, unknown, collisions };
}

export function serializeThemeFile(theme: {
  overrides: Record<string, string>;
  name?: string;
  slashedVersion?: string;
}): string {
  const doc = {
    $schema: THEME_SCHEMA_URL,
    schemaVersion: THEME_SCHEMA_VERSION,
    ...(theme.slashedVersion ? { slashedVersion: theme.slashedVersion } : {}),
    ...(theme.name ? { name: theme.name } : {}),
    overrides: sortKeys(theme.overrides ?? {}),
  };
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/**
 * Read a user-selected file and return the migrated override set plus a
 * human-readable summary of what changed on the way in.
 */
export async function importThemeFile(
  file: File,
  live?: Set<string>,
): Promise<{ overrides: Record<string, string> | null; name: string | null; errors: string[]; notes: string[] }> {
  const text = await file.text();
  const { theme, errors } = parseThemeFile(text);
  if (!theme) return { overrides: null, name: null, errors, notes: [] };

  const result = migrateOverrides(theme.overrides, { live });
  const notes: string[] = [];
  for (const { from, to } of result.renamed) notes.push(`renamed ${from} → ${to}`);
  for (const { from, to } of result.collisions) notes.push(`dropped ${from} (${to} already set)`);
  for (const { name, reason } of result.removed) notes.push(`removed ${name} — ${reason}`);
  for (const name of result.unknown) notes.push(`unknown ${name} (kept)`);

  return { overrides: result.overrides, name: theme.name, errors: [], notes };
}
