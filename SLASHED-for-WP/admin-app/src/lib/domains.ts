import RAW from '../data/domain-patterns.json';

/** Token name substrings that define each domain's scope. Single source of truth: src/data/domain-patterns.json */
export const DOMAIN_PATTERNS: Record<string, string[]> = RAW as unknown as Record<string, string[]>;

/** Return the domain key for a given token name, falling back to "misc". */
export function domainOf(tokenName: string): string {
  for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS)) {
    if (domain === "misc") continue;
    if (patterns.some(p => tokenName.includes(p))) return domain;
  }
  return "misc";
}
