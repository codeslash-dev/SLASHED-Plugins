// Data-driven access to the framework API, so the preview gallery enumerates
// the real token/class set (docs/api-index.json → *.generated.json) instead of
// hard-coding lists that drift. New tokens/classes flow in automatically, and
// the coverage gate (scripts/check-preview-coverage.mjs) reuses these lists to
// assert nothing configurable is missing from the preview.

import apiIndex from "../../data/api-index.generated.json";
import classIndex from "../../data/classes.generated.json";

export interface ApiToken {
  name: string;
  tier: "PUBLIC" | "PUBLIC-ADVANCED" | "INTERNAL";
  role?: string;
  namespace?: string;
  category?: string;
  group?: string;
  description?: string;
  note?: string;
  value?: string;
  aliasOf?: string | null;
}

export interface ApiClass {
  name: string;
  selector: string;
  kind: string;
  category?: string;
  group?: string;
  description?: string;
}

export const TOKENS: ApiToken[] = (apiIndex as { tokens: ApiToken[] }).tokens;
export const CLASSES: ApiClass[] = (classIndex as { classes: ApiClass[] }).classes;

export const isPublic = (t: ApiToken) => t.tier === "PUBLIC";
export const isAdvanced = (t: ApiToken) => t.tier === "PUBLIC-ADVANCED";

/** All public tokens whose name matches one of the given substrings. */
export function tokensMatching(...needles: string[]): ApiToken[] {
  return TOKENS.filter(
    (t) => t.tier !== "INTERNAL" && needles.some((n) => t.name.includes(n)),
  );
}

/** Scale steps present for a token family, e.g. familySteps("--sf-space-") →
 *  ["3xs","2xs","xs",…]. Order follows first-seen order in the API index. */
export function familySteps(prefix: string): string[] {
  const out: string[] = [];
  for (const t of TOKENS) {
    if (t.name.startsWith(prefix)) {
      const step = t.name.slice(prefix.length);
      if (step && !step.includes("-") && !out.includes(step)) out.push(step);
    }
  }
  return out;
}

/** Public classes for a given kind (component, layout, macro, utility, …). */
export function classesOfKind(...kinds: string[]): ApiClass[] {
  return CLASSES.filter((c) => kinds.includes(c.kind));
}

/** Base (modifier-less) class selectors of a kind — ".sf-btn" not ".sf-btn--l". */
export function baseSelectors(...kinds: string[]): string[] {
  const seen = new Set<string>();
  for (const c of classesOfKind(...kinds)) {
    const base = c.selector.split("--")[0].split(/[ >.:]/)[0];
    if (base.startsWith(".sf-")) seen.add(base);
  }
  return [...seen];
}

/** Every non-internal token (PUBLIC + PUBLIC-ADVANCED). */
export const PUBLIC_TOKENS: ApiToken[] = TOKENS.filter((t) => t.tier !== "INTERNAL");

/** Tokens bucketed by their API `group`, in first-seen order. Powers the
 *  exhaustive variable reference on the Advanced tab and the coverage gate. */
export function tokensByGroup(): { group: string; tokens: ApiToken[] }[] {
  const order: string[] = [];
  const map = new Map<string, ApiToken[]>();
  for (const t of PUBLIC_TOKENS) {
    const g = t.group || t.category || "Other";
    if (!map.has(g)) { map.set(g, []); order.push(g); }
    map.get(g)!.push(t);
  }
  return order.map((g) => ({ group: g, tokens: map.get(g)! }));
}

/** Classes bucketed by `kind`, in first-seen order. */
export function classesByKind(): { kind: string; classes: ApiClass[] }[] {
  const order: string[] = [];
  const map = new Map<string, ApiClass[]>();
  for (const c of CLASSES) {
    if (!map.has(c.kind)) { map.set(c.kind, []); order.push(c.kind); }
    map.get(c.kind)!.push(c);
  }
  return order.map((k) => ({ kind: k, classes: map.get(k)! }));
}
