import type { StylePreset } from "../types";

export const CORNER_PRESETS: StylePreset[] = [
  { id: "default", label: "Default", patch: { "--sf-radius-scale": null } },
  { id: "sharp",   label: "Sharp",   patch: { "--sf-radius-scale": "0" } },
  { id: "subtle",  label: "Subtle",  patch: { "--sf-radius-scale": "0.5" } },
  { id: "rounded", label: "Rounded", patch: { "--sf-radius-scale": "1" } },
  { id: "pill",    label: "Pill",    patch: { "--sf-radius-scale": "2" } },
];

export const SHADOW_PRESETS: StylePreset[] = [
  { id: "default", label: "Default", patch: { "--sf-shadow-strength": null } },
  { id: "none",    label: "None",    patch: { "--sf-shadow-strength": "0" } },
  { id: "subtle",  label: "Subtle",  patch: { "--sf-shadow-strength": "calc(0.04 + var(--sf-is-dark) * 0.08)" } },
  { id: "soft",    label: "Soft",    patch: { "--sf-shadow-strength": "calc(0.08 + var(--sf-is-dark) * 0.12)" } },
  { id: "strong",  label: "Strong",  patch: { "--sf-shadow-strength": "calc(0.18 + var(--sf-is-dark) * 0.22)" } },
];
