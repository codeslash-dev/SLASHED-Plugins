import type { PowerKnob } from "../types";

export const KNOBS_BY_DOMAIN: Record<string, PowerKnob[]> = {
  colors: [
    {
      name: "--sf-contrast-bias",
      label: "Contrast bias",
      help: "Shifts the lightness threshold used by text-on-color pairing toward darker (negative) or lighter (positive) text.",
      default: 0, min: -1, max: 1, step: 0.05, driving: 3,
    },
    {
      name: "--sf-contrast-threshold",
      label: "Contrast threshold",
      help: "OKLCH lightness above which a swatch is considered 'light' (gets dark text). Below = light text.",
      default: 0.6, min: 0, max: 1, step: 0.01, driving: 11,
    },
    {
      name: "--sf-focus-ring-width",
      label: "Focus ring width",
      help: "Thickness of the focus ring on every interactive element.",
      default: 2, min: 0, max: 6, step: 0.5, unit: "px", driving: 1,
    },
  ],
  typography: [
    {
      name: "--sf-text-scale",
      label: "Text scale",
      help: "Multiplier applied to the entire fluid text ramp (2xs … 2xl).",
      default: 1, min: 0.5, max: 2, step: 0.05, driving: 9,
    },
    {
      name: "--sf-text-display-scale",
      label: "Display scale",
      help: "Multiplier applied to the display ramp (display-s, display-m, display-l).",
      default: 1, min: 0.5, max: 2, step: 0.05, driving: 3,
    },
  ],
  spacing: [
    {
      name: "--sf-space-scale",
      label: "Space scale",
      help: "Multiplier applied to every fluid spacing step. One drag moves 45 tokens.",
      default: 1, min: 0.5, max: 2, step: 0.05, driving: 45,
    },
    {
      name: "--sf-section-scale",
      label: "Section scale",
      help: "Multiplier applied to section paddings only.",
      default: 1, min: 0.5, max: 2, step: 0.05, driving: 6,
    },
  ],
  borders: [
    {
      name: "--sf-radius-scale",
      label: "Radius scale",
      help: "Multiplier applied to every radius step (set to 0 for sharp brutalist corners).",
      default: 1, min: 0, max: 2, step: 0.05, driving: 8,
    },
  ],
  shadows: [
    {
      name: "--sf-shadow-strength",
      label: "Shadow strength",
      help: "Base shadow opacity. Auto-boosted +0.17 in dark mode. Slider sets the light-mode base.",
      default: 0.08, min: 0, max: 0.5, step: 0.01, driving: 14,
      encode: (v) => `calc(${v} + var(--sf-is-dark) * 0.17)`,
      decode: (raw) => {
        const m = /^calc\(\s*([\d.e+-]+)/.exec(String(raw));
        return m ? parseFloat(m[1]) : NaN;
      },
    },
  ],
  motion: [
    {
      name: "--sf-motion-scale",
      label: "Motion scale",
      help: "Speed multiplier on every duration. Set to 0 to effectively disable motion.",
      default: 1, min: 0, max: 2, step: 0.05, driving: 13,
    },
  ],
};
