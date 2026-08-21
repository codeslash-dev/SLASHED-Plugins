/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Token → domain (panel) classification — the single, deterministic source of
 * truth used by the sidebar badges, the category Reset, the command palette,
 * Home counts and the All-tokens list.
 *
 * Previously this was substring matching over a hand-kept pattern list. Because
 * fragments overlapped (e.g. "color" is a substring of --sf-focus-ring-color,
 * "-bg-" of --sf-color-bg--active, "shadow" of --sf-drop-shadow-*), a token
 * could match several domains at once. The order of the pattern object then
 * silently decided the winner, and the All-tokens tab filtered by the raw
 * patterns while the badge/Reset used first-match `domainOf()` — so the two
 * routinely disagreed about which tokens "belong" to a panel.
 *
 * This version classifies on the framework-authored `namespace` (the segment
 * after `--sf-`), which is precise and one-to-one with a domain. The map lives
 * in src/data/domain-map.json and is shared verbatim with the build-time
 * curation guard (scripts/check-curation.mjs), so runtime and CI can never
 * drift. A namespace maps to exactly one domain; the few genuinely mixed
 * namespaces are resolved per-token in the map's `exceptions`.
 */
import MAP from '../data/domain-map.json';
import apiIndex from '../data/api-index.generated.json';
import type { ApiIndex } from '../types';

const NAMESPACE_DOMAIN = (MAP as { namespaces: Record<string, string> }).namespaces;
const EXCEPTIONS = (MAP as { exceptions: Record<string, string> }).exceptions;

/** The domain used when a token matches no known namespace. */
export const FALLBACK_DOMAIN = 'misc';

/** All domain ids a token can classify into, in canonical panel order. */
export const DOMAINS = [
  'colors', 'typography', 'spacing', 'layout', 'borders', 'depth',
  'motion', 'macros', 'components', 'misc', 'wcag',
] as const;

export type Domain = (typeof DOMAINS)[number];

// Authoritative name → namespace, taken from the baked manifest. Lets us use
// the framework's own namespace assignment for every shipping token, and fall
// back to name inference only for keys that aren't in the catalogue (legacy /
// imported / renamed overrides).
const NAME_TO_NAMESPACE: Record<string, string> = {};
for (const t of (apiIndex as ApiIndex).tokens ?? []) {
  NAME_TO_NAMESPACE[t.name] = t.namespace ?? inferNamespace(t.name);
}

/** The `--sf-<namespace>-…` segment of a token name. */
export function inferNamespace(tokenName: string): string {
  const m = /^--sf-([a-z0-9]+)/.exec(tokenName);
  return m ? m[1] : '';
}

/**
 * The domain a token is *explicitly* classified into, or null when its
 * namespace is unknown (i.e. it would only land in the Misc fallback). The
 * curation guard treats a null here for a public knob as an orphan.
 */
export function classifyKnown(tokenName: string): Domain | null {
  const exc = EXCEPTIONS[tokenName];
  if (exc) return exc as Domain;
  const ns = NAME_TO_NAMESPACE[tokenName] ?? inferNamespace(tokenName);
  const domain = NAMESPACE_DOMAIN[ns];
  return (domain as Domain) ?? null;
}

/** Return the domain key for a given token name, falling back to "misc". */
export function domainOf(tokenName: string): Domain {
  return classifyKnown(tokenName) ?? FALLBACK_DOMAIN;
}
