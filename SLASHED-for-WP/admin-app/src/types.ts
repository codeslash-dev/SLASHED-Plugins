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

export type PreviewTemplate = "marketing" | "components" | "stylescape";

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
