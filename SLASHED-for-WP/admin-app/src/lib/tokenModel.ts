/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Token model — the configurator's first-class understanding of *how tokens
 * relate to each other*, derived from the framework-authored manifest metadata
 * (`role`, `aliasOf`, `namespace`, `value`) rather than re-guessed from names.
 *
 * The audit found the studio treats every token as an equal, free-standing
 * string: it does not know which tokens are user-settable SOURCES, which are
 * one-to-one ALIASES, and which are generated OUTPUTS; nor which tokens depend
 * on which. That lets a user "freeze" a derived output or a generated scale
 * step and silently disconnect it from the system that produces it, with no
 * warning anywhere but the two scale panels.
 *
 * This module centralises that knowledge so every surface (All-tokens rows,
 * the future Changes panel, scale cards) can speak the same language:
 *
 *   • role        — source | alias | output
 *   • alias target — the single token an alias/relink points at
 *   • dependency graph — dependsOn / usedBy across the whole catalogue
 *   • token state — how a given override relates to the framework default:
 *                    default | custom | relinked | detached | invalid
 *   • scale families — the generative ladders (text/display/space/radius/
 *                    border-width/motion) and detection of step overrides that
 *                    shadow their source knobs
 *   • validation  — best-effort rejection of CSS-breaking / empty values
 *
 * Everything here is pure and headless-safe: value validation upgrades to real
 * `CSS.supports()` checks in a browser but degrades to structural checks under
 * jsdom / Node so it can be unit-tested and run inside the WP plugin.
 */

import type { SlashedToken } from "../types";

// ---------------------------------------------------------------------------
// References & aliasing
// ---------------------------------------------------------------------------

const VAR_REF_RE = /var\(\s*(--sf-[\w-]+)/g;
// A *pure* single-token reference: the whole value is exactly `var(--sf-x)`
// (an optional fallback is allowed). This is what makes a token a true alias —
// a one-to-one re-export — as opposed to a compound value that merely *uses*
// other tokens (color-mix(), calc(), a border shorthand, …).
const PURE_VAR_RE = /^var\(\s*(--sf-[\w-]+)\s*(?:,[\s\S]*)?\)$/;

/** Reject unbalanced function syntax before classifying a value as an alias. */
function hasBalancedParens(value: string): boolean {
  let depth = 0;
  for (const char of value) {
    if (char === "(") depth += 1;
    if (char === ")" && --depth < 0) return false;
  }
  return depth === 0;
}

/** Every distinct `--sf-*` token referenced (via `var()`) inside a value. */
export function referencesIn(value: string | null | undefined): string[] {
  if (!value) return [];
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  VAR_REF_RE.lastIndex = 0;
  while ((m = VAR_REF_RE.exec(value)) !== null) out.add(m[1]);
  return [...out];
}

/** The single token a pure `var(--sf-x)` value points at, else null. */
export function pureVarTarget(value: string | null | undefined): string | null {
  if (!value || !hasBalancedParens(value)) return null;
  const v = value.trim();
  const m = PURE_VAR_RE.exec(v);
  if (!m) return null;
  // PURE_VAR_RE's fallback group is greedy, so it can span past the var()'s own
  // closing paren (e.g. `var(--sf-a, x) var(--sf-b)` matches with target --sf-a).
  // A genuine single-var alias closes the leading `var(` at the very end of the
  // string; if the first paren-depth-0 close is not the last char, it's compound.
  let depth = 0;
  for (let i = 0; i < v.length; i++) {
    if (v[i] === "(") depth += 1;
    else if (v[i] === ")" && --depth === 0) return i === v.length - 1 ? m[1] : null;
  }
  return m[1];
}

/**
 * The token an alias re-exports. Prefers the framework-declared `aliasOf`;
 * falls back to a pure single-`var()` default value. Returns null for sources
 * and compound outputs.
 */
export function aliasTargetOf(token: SlashedToken): string | null {
  if (token.aliasOf) return token.aliasOf;
  return pureVarTarget(token.value);
}

// ---------------------------------------------------------------------------
// Role: source | alias | output
// ---------------------------------------------------------------------------

export type TokenRole = "source" | "alias" | "output";

/**
 * Whether a token is an INPUT you set (`source`), a one-to-one re-export of
 * another token (`alias`), or a derived OUTPUT you read (`output`).
 *
 * Built on the manifest's own `role` (knob vs consumption) and `aliasOf`, so it
 * never drifts from the framework: a pure re-export is an alias; a consumption
 * value that composes multiple tokens is an output; everything else is a
 * settable source.
 */
export function roleOf(token: SlashedToken): TokenRole {
  if (aliasTargetOf(token)) return "alias";
  if (token.role === "consumption") return "output";
  return "source";
}

export const ROLE_LABEL: Record<TokenRole, string> = {
  source: "Source",
  alias: "Alias",
  output: "Output",
};

// ---------------------------------------------------------------------------
// Dependency graph
// ---------------------------------------------------------------------------

export interface DependencyGraph {
  /** token → the tokens it references in its default value. */
  dependsOn: Record<string, string[]>;
  /** token → the tokens whose default value references it. */
  usedBy: Record<string, string[]>;
}

/**
 * Build the whole-catalogue dependency graph from token default values. This is
 * the piece the audit found missing: it lets any surface answer "what feeds
 * this token?" and "what breaks if I freeze it?".
 */
export function buildDependencyGraph(tokens: SlashedToken[]): DependencyGraph {
  const known = new Set(tokens.map((t) => t.name));
  const dependsOn: Record<string, string[]> = {};
  const usedBy: Record<string, string[]> = {};

  for (const t of tokens) {
    const refs = referencesIn(t.value).filter((r) => r !== t.name && known.has(r));
    dependsOn[t.name] = refs;
    for (const r of refs) {
      (usedBy[r] ??= []).push(t.name);
    }
  }
  // Stable, deterministic ordering for predictable UI + diffs.
  for (const k of Object.keys(usedBy)) usedBy[k].sort();
  return { dependsOn, usedBy };
}

// ---------------------------------------------------------------------------
// Generative scale families
// ---------------------------------------------------------------------------

export interface ScaleFamily {
  id: string;
  label: string;
  /** Source knobs the framework computes the ladder from. */
  sources: string[];
  /** Generated step tokens; a concrete override here shadows the sources. */
  steps: string[];
}

const STEP_KEYS = ["2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl", "4xl"] as const;
const stepTokens = (prefix: string) => STEP_KEYS.map((s) => `--sf-${prefix}-${s}`);

/**
 * The framework's generative ladders. Sources mirror persistence.ts's
 * derived-scale engine (the same formula the CSS and WP PHP emitter use), so
 * shadow detection here matches what the live preview actually computes.
 */
export const SCALE_FAMILIES: ScaleFamily[] = [
  {
    id: "text",
    label: "Type scale",
    sources: [
      "--sf-text-base-min", "--sf-text-base-max",
      "--sf-text-ratio-min", "--sf-text-ratio-max",
      "--sf-text-scale", "--sf-fluid-min-vw", "--sf-fluid-max-vw",
    ],
    steps: stepTokens("text"),
  },
  {
    id: "display",
    label: "Display scale",
    sources: [
      "--sf-text-display-base-min", "--sf-text-display-base-max",
      "--sf-text-ratio-min", "--sf-text-ratio-max",
      "--sf-text-display-scale", "--sf-fluid-min-vw", "--sf-fluid-max-vw",
    ],
    steps: ["--sf-text-display-s", "--sf-text-display-m", "--sf-text-display-l"],
  },
  {
    id: "space",
    label: "Spacing scale",
    sources: [
      "--sf-space-base-min", "--sf-space-base-max",
      "--sf-space-ratio-min", "--sf-space-ratio-max",
      "--sf-space-scale", "--sf-fluid-min-vw", "--sf-fluid-max-vw",
    ],
    steps: stepTokens("space"),
  },
  {
    id: "radius",
    label: "Radius scale",
    sources: ["--sf-radius-scale"],
    steps: [
      ...stepTokens("radius"),
      "--sf-radius-none", "--sf-radius-full", "--sf-radius-pill", "--sf-radius-outer",
    ],
  },
  {
    id: "border-width",
    label: "Border-width scale",
    sources: ["--sf-border-scale"],
    steps: ["--sf-border-width-1", "--sf-border-width-2", "--sf-border-width-3", "--sf-border-width-4"],
  },
  {
    id: "motion",
    label: "Duration scale",
    sources: ["--sf-motion-scale"],
    // Only catalogue tokens are listed. The framework's derived engine also
    // scales --sf-animation-delay-N, but those are compute-only (not real
    // manifest tokens), so a user can never store an override that shadows
    // them — they're deliberately excluded from step detection.
    steps: [
      "--sf-duration-instant", "--sf-duration-fast", "--sf-duration-normal",
      "--sf-duration-slow", "--sf-duration-slower", "--sf-duration-none",
      "--sf-theme-transition-duration",
    ],
  },
];

const SCALE_STEP_SET = new Set(SCALE_FAMILIES.flatMap((f) => f.steps));
const SCALE_STEP_TO_FAMILY: Record<string, ScaleFamily> = {};
for (const f of SCALE_FAMILIES) for (const s of f.steps) SCALE_STEP_TO_FAMILY[s] = f;

/** True when a token is a generated step of one of the scale families. */
export function isGeneratedScaleStep(name: string): boolean {
  return SCALE_STEP_SET.has(name);
}

export interface ScaleShadow {
  family: ScaleFamily;
  /** Steps stored as concrete overrides — these freeze the ladder. */
  shadowedSteps: string[];
  /** Source knobs the user has also overridden (now partly/fully inert). */
  overriddenSources: string[];
}

/**
 * For each family, which generated steps are shadowed by concrete overrides —
 * generalising the old text/space-only detector to radius, border-width and
 * motion too (a gap the audit flagged). Only families with at least one
 * shadowed step are returned.
 */
export function scaleShadows(overrides: Record<string, string>): ScaleShadow[] {
  const out: ScaleShadow[] = [];
  for (const family of SCALE_FAMILIES) {
    // A relink or expression that still references a scale source continues to
    // follow that scale; only a value disconnected from all sources pins a step.
    const shadowedSteps = family.steps.filter((step) => {
      const value = overrides[step];
      return value !== undefined && !referencesIn(value).some((ref) => family.sources.includes(ref));
    });
    if (shadowedSteps.length === 0) continue;
    const overriddenSources = family.sources.filter((s) => s in overrides);
    out.push({ family, shadowedSteps, overriddenSources });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// Characters that would break out of a `--token: value;` declaration or a CSS
// comment — the same class themeFile.ts / codec.ts already refuse. Rejecting
// them here stops an invalid value from ever entering the active override map
// (and fixes the `--sf-x: ;` empty-value export hole).
const CSS_BREAKING_RE = /[;{}]|\/\*|\*\//;
const CONTROL_CHAR_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const MAX_CODEC_BYTES = 65_535;

/**
 * Whether a value can be safely written into a `--token: value;` declaration
 * and survive export. This is the authoritative "unsafe → will be dropped"
 * gate — it mirrors exactly what codec.ts / themeFile.ts refuse (empty values
 * and CSS-breaking characters), so a value flagged unsafe here is genuinely the
 * value that would be stripped on export. Deliberately does NOT judge semantic
 * correctness (e.g. "notacolor" for a colour token): that renders as nothing
 * but is not *dropped*, so it is a softer signal handled by validateTokenValue.
 */
export function isStructurallySafe(value: string): boolean {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (v === "") return false;
  // Mirror every rejection the export path (codec.ts / themeFile.ts) enforces:
  // CSS-breaking characters, control characters, and the share-link byte limit.
  // Anything that would be dropped or refused on export must read as unsafe here
  // so the Changes panel never labels it Custom/Detached/Re-linked.
  if (CSS_BREAKING_RE.test(v) || CONTROL_CHAR_RE.test(v)) return false;
  return new TextEncoder().encode(v).byteLength <= MAX_CODEC_BYTES;
}

/** Map a token's `syntax` metadata to a real CSS property we can probe. */
function probePropertyForSyntax(syntax: string | null | undefined): string | null {
  const s = (syntax ?? "").toLowerCase();
  if (!s) return null;
  if (s.includes("<color>")) return "color";
  if (s.includes("<length>") || s.includes("<length-percentage>")) return "width";
  if (s.includes("<percentage>")) return "width";
  // <integer> is integer-only, so probe z-index; <number> allows fractionals,
  // so probe opacity (z-index would reject "1.4"). z-index also accepts `auto`,
  // which is not valid <integer>/<number> — validateTokenValue rejects that
  // keyword explicitly below.
  if (s.includes("<integer>")) return "z-index";
  if (s.includes("<number>")) return "opacity";
  if (s.includes("<time>")) return "transition-duration";
  if (s.includes("<angle>")) return "rotate";
  return null;
}

/**
 * Best-effort *semantic* validation of an override value for a token. Applies
 * the structural safety check first, then — in a browser, for non-expression
 * values — probes `CSS.supports()` against a property matching the token's
 * declared syntax. Under Node/jsdom it stops at the structural check.
 *
 * This is a softer, advisory signal (used by the value editor to warn "this
 * doesn't look like a valid <color>"); it is NOT what decides the `invalid`
 * token state, which uses {@link isStructurallySafe} so the "will be dropped on
 * export" copy stays truthful.
 */
export function validateTokenValue(token: SlashedToken, value: string): ValidationResult {
  if (typeof value !== "string") return { valid: false, reason: "not a string" };
  const v = value.trim();
  if (v === "") return { valid: false, reason: "empty value" };
  if (CSS_BREAKING_RE.test(v)) return { valid: false, reason: "contains CSS-breaking characters" };
  if (CONTROL_CHAR_RE.test(v)) return { valid: false, reason: "contains control characters" };
  if (new TextEncoder().encode(v).byteLength > MAX_CODEC_BYTES) return { valid: false, reason: "exceeds export size limit" };
  if (!hasBalancedParens(v)) return { valid: false, reason: "unbalanced parentheses" };

  const syntax = (token.syntax ?? "").toLowerCase();
  // `auto` is valid z-index syntax, but not a <number> or <integer> token.
  if ((syntax.includes("<number>") || syntax.includes("<integer>")) && v.toLowerCase() === "auto") {
    return { valid: false, reason: `not a valid ${token.syntax}` };
  }

  const hasFn = /\b(?:var|calc|clamp|min|max|env)\s*\(/.test(v);
  if (!hasFn && typeof CSS !== "undefined" && typeof CSS.supports === "function") {
    const prop = probePropertyForSyntax(token.syntax);
    if (prop) {
      try {
        if (!CSS.supports(prop, v)) {
          return { valid: false, reason: `not a valid ${token.syntax}` };
        }
      } catch {
        /* CSS.supports can throw on exotic input — treat as inconclusive. */
      }
    }
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Token state
// ---------------------------------------------------------------------------

/**
 * How a token's current override relates to the framework default.
 *
 *   default   — no override; the framework value (possibly an alias) is in use.
 *   custom    — a settable source overridden with a concrete value. Expected.
 *   relinked  — overridden with a pure `var(--sf-x)`; re-pointed at another
 *               token (deliberate re-inheritance).
 *   detached  — a concrete override on an OUTPUT, an ALIAS, or a generated
 *               scale STEP: it freezes the value and disconnects it from the
 *               system that would otherwise produce it. The situation the audit
 *               calls out as easy to create and impossible to notice.
 *   invalid   — the override value fails validation.
 */
export type TokenState = "default" | "custom" | "relinked" | "detached" | "invalid";

export function tokenState(token: SlashedToken, overrides: Record<string, string>): TokenState {
  const ov = overrides[token.name];
  if (ov === undefined) return "default";
  const syntax = (token.syntax ?? "").toLowerCase();
  const numericAuto = (syntax.includes("<number>") || syntax.includes("<integer>")) && ov.trim().toLowerCase() === "auto";
  if (!isStructurallySafe(ov) || !hasBalancedParens(ov) || numericAuto) return "invalid";
  if (pureVarTarget(ov)) return "relinked";
  const role = roleOf(token);
  if (role === "output" || role === "alias" || isGeneratedScaleStep(token.name)) {
    return "detached";
  }
  return "custom";
}

export const STATE_LABEL: Record<TokenState, string> = {
  default: "Default",
  custom: "Custom",
  relinked: "Re-linked",
  detached: "Detached",
  invalid: "Invalid",
};

/**
 * True when a token's *default* effective value flows from another token — i.e.
 * it is an alias or references a scale step by default. Used to show "Inherits
 * from …" affordances on a token still in its default state.
 */
export function inheritsByDefault(token: SlashedToken): boolean {
  return aliasTargetOf(token) !== null || referencesIn(token.value).length > 0;
}

// ---------------------------------------------------------------------------
// Change summary — the model behind the Changes panel
// ---------------------------------------------------------------------------

/** A single active override, classified by its consequence. */
export interface ChangeEntry {
  name: string;
  /** The catalogue token, or null when the override key isn't a known token. */
  token: SlashedToken | null;
  /** The override value currently applied. */
  value: string;
  /** How this override relates to the framework default. */
  state: TokenState | "unknown";
}

/**
 * All active overrides grouped by *consequence* rather than by panel — the
 * organising idea of the Changes panel. `detached` and `invalid` are the ones a
 * user most needs to see (they silently disconnect a token from the system or
 * can't be applied), so they lead; `unknown` collects override keys that aren't
 * tokens in this framework build (e.g. imported from a newer/older version).
 */
export interface ChangeSummary {
  invalid: ChangeEntry[];
  detached: ChangeEntry[];
  relinked: ChangeEntry[];
  custom: ChangeEntry[];
  unknown: ChangeEntry[];
  total: number;
}

const EMPTY_GROUPS = (): Omit<ChangeSummary, "total"> => ({
  invalid: [], detached: [], relinked: [], custom: [], unknown: [],
});

/**
 * Classify every active override into consequence buckets. Entries within a
 * bucket are sorted by name for stable, diff-friendly rendering.
 */
export function summarizeChanges(
  tokens: SlashedToken[],
  overrides: Record<string, string>,
): ChangeSummary {
  const byName = new Map(tokens.map((t) => [t.name, t]));
  const groups = EMPTY_GROUPS();

  for (const [name, value] of Object.entries(overrides)) {
    const token = byName.get(name) ?? null;
    if (!token) {
      groups.unknown.push({ name, token: null, value, state: "unknown" });
      continue;
    }
    const state = tokenState(token, overrides);
    const entry: ChangeEntry = { name, token, value, state };
    // A token in its default state can't be an override; guard anyway.
    if (state === "default") continue;
    groups[state].push(entry);
  }

  for (const key of Object.keys(groups) as (keyof typeof groups)[]) {
    groups[key].sort((a, b) => a.name.localeCompare(b.name));
  }

  const total =
    groups.invalid.length + groups.detached.length + groups.relinked.length +
    groups.custom.length + groups.unknown.length;

  return { ...groups, total };
}
