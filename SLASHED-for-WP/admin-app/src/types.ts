/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SlashedToken {
  name: string;
  id?: number;
  tier?: "PUBLIC" | "PUBLIC-ADVANCED" | "INTERNAL";
  role?: string;
  namespace?: string;
  category?: string;
  group?: string;
  description?: string;
  note?: string | null;
  value: string;
  aliasOf?: string | null;
  registered?: boolean;
  syntax?: string | null;
}

// SL-017/024: types for the two consumed-generated-JSON shapes and codec.ts's
// options objects, replacing `any` at their 7 call sites.

/** A token entry as it appears in data/api-index.generated.json's `tokens` array. */
export interface ApiIndexToken extends SlashedToken {
  fallbackOnly?: boolean;
  optional?: boolean;
  layer?: string | null;
  bundles?: string[];
}

/** Shape of data/api-index.generated.json (configurator/scripts/sync-api.mjs's output). */
export interface ApiIndex {
  _sync?: Record<string, unknown>;
  tokens: ApiIndexToken[];
}

/** A class entry as it appears in data/classes.generated.json's `classes` array. */
export interface SlashedClass {
  name: string;
  selector: string;
  kind: string;
  category: string;
  group?: string;
  description?: string;
  optional?: boolean;
  layer?: string | null;
}

/** Shape of data/classes.generated.json (configurator/scripts/sync-api.mjs's output). */
export interface ClassIndex {
  _sync?: Record<string, unknown>;
  classes: SlashedClass[];
}

/** A registry entry as it appears in data/token-registry.generated.json's `tokens` array. */
export interface TokenRegistryEntry {
  id: number;
  name: string;
  removed?: boolean;
}

/** Shape of data/token-registry.generated.json, consumed by codec.ts's encode/decode. */
export interface TokenRegistry {
  _meta?: Record<string, unknown>;
  tokens: TokenRegistryEntry[];
}

/** Options accepted by codec.ts's decode(). */
export interface DecodeOptions {
  sanitize?: (value: string) => string;
  isKnown?: (tokenName: string) => boolean;
}

/**
 * Options accepted by codec.ts's readShareFromHash() / readShareFromHashIfPresent().
 * Deliberately omits `sanitize` (unlike DecodeOptions): these are the public
 * share-link entry points and always force sanitizeValue as a CSS-injection
 * safeguard, so a caller-supplied sanitize is never honoured.
 */
export type ShareOptions = Pick<DecodeOptions, "isKnown">;

export interface SlashedCategory {
  id: string;
  label: string;
  icon: string;
  blurb: string;
  intro?: string;
  scaleIntro?: string;
  namespaces?: string[] | string;
  patterns?: RegExp[];
  brandColors?: boolean;
  essentials?: string[];
  basicGenerators?: string[];
  tool?: string;
}

export interface SavedSlot {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  overrides: Record<string, string>;
}

// Live-preview tabs. Single source of truth is lib/preview (PreviewTab); this
// alias keeps the historical name used across the shell components.
export type PreviewTemplate = import("./lib/preview").PreviewTab;

export interface ConfiguratorState {
  domain: string;
  query: string;
  showInternal: boolean;
  onlyModified: boolean;
  usageFilter: string;
  previewTheme: "light" | "dark";
  previewMotion: "normal" | "slow" | "none";
  previewWidth: "fluid" | "mobile" | "tablet" | "desktop";
  previewTemplate: PreviewTemplate;
  outputMode: "layer" | "root";
  bundle: string;
}

export interface HistoryState {
  past: string[];
  future: string[];
}

export interface PowerKnob {
  name: string;
  label: string;
  help: string;
  default: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  driving?: number;
  encode?: (v: number) => string;
  decode?: (raw: string) => number;
}

export interface BasicControl {
  token: string;
  label: string;
  help: string;
}

export interface BasicGroup {
  title: string;
  controls: BasicControl[];
}

export interface BasicDomain {
  groups: BasicGroup[];
}
