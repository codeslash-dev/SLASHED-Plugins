import type { BasicDomain } from "../types";

export const BASIC_BY_DOMAIN: Record<string, BasicDomain> = {
  typography: {
    groups: [
      {
        title: "Fonts",
        controls: [
          { token: "--sf-font-body",    label: "Body font",    help: "Font stack for body text — the default for everything." },
          { token: "--sf-font-heading", label: "Heading font", help: "Font stack for headings. Defaults to the body font." },
          { token: "--sf-font-mono",    label: "Code font",    help: "Font stack for code blocks and tabular figures." },
        ],
      },
      {
        title: "Text defaults",
        controls: [
          { token: "--sf-leading-normal",      label: "Body line height", help: "Default line height for body text." },
          { token: "--sf-font-weight-heading",  label: "Heading weight",  help: "Font weight applied to headings." },
        ],
      },
    ],
  },
  spacing: {
    groups: [
      {
        title: "Rhythm",
        controls: [
          { token: "--sf-section-pad",   label: "Section padding",   help: "Vertical padding of page sections." },
          { token: "--sf-content-gap",   label: "Content rhythm",    help: "Vertical gap between blocks of flowing content." },
          { token: "--sf-gutter",        label: "Gutter",            help: "Horizontal breathing room at the viewport edges." },
          { token: "--sf-component-pad", label: "Component padding", help: "Default inner padding of components such as cards and fields." },
        ],
      },
    ],
  },
  layout: {
    groups: [
      {
        title: "Content widths",
        controls: [
          { token: "--sf-container-default", label: "Content width",    help: "Maximum width of the main content container." },
          { token: "--sf-container-prose",   label: "Reading width",    help: "Maximum line length for long-form reading." },
          { token: "--sf-container-narrow",  label: "Narrow container", help: "Width of narrow columns and asides." },
          { token: "--sf-container-wide",    label: "Wide container",   help: "Maximum width of full-bleed sections." },
        ],
      },
      {
        title: "Global anchors",
        controls: [
          { token: "--sf-header-height", label: "Header height", help: "Height reserved for the site header." },
          { token: "--sf-touch-target",  label: "Touch target",  help: "Minimum hit area of interactive elements." },
        ],
      },
    ],
  },
  borders: {
    groups: [
      {
        title: "Corner radius",
        controls: [
          { token: "--sf-radius-s", label: "Small radius",  help: "Corner rounding for small elements — badges, inputs, chips." },
          { token: "--sf-radius-m", label: "Medium radius", help: "Corner rounding for medium elements — buttons, cards." },
          { token: "--sf-radius-l", label: "Large radius",  help: "Corner rounding for large surfaces — panels, dialogs." },
        ],
      },
      {
        title: "Strokes",
        controls: [
          { token: "--sf-border-width-1", label: "Border width",  help: "Default border thickness." },
          { token: "--sf-divider-width",  label: "Divider width", help: "Thickness of horizontal rules and dividers." },
          { token: "--sf-color-border",   label: "Border color",  help: "Default border color — adapts to light and dark mode." },
        ],
      },
    ],
  },
  shadows: {
    groups: [
      {
        title: "Elevation",
        controls: [
          { token: "--sf-shadow-s",  label: "Elevation 1 (subtle)",   help: "Smallest lift — inputs, list rows." },
          { token: "--sf-shadow-m",  label: "Elevation 2 (raised)",   help: "Default card / button elevation." },
          { token: "--sf-shadow-l",  label: "Elevation 3 (floating)", help: "Popovers, dropdowns, sticky elements." },
          { token: "--sf-shadow-xl", label: "Elevation 4 (overlay)",  help: "Dialogs and modal surfaces." },
        ],
      },
    ],
  },
};

export function basicControlTokens(domainId: string): string[] {
  const def = BASIC_BY_DOMAIN[domainId];
  if (!def) return [];
  return def.groups.flatMap((g) => g.controls.map((c) => c.token));
}

export function basicTokenNames(): string[] {
  return Object.keys(BASIC_BY_DOMAIN).flatMap((id) => basicControlTokens(id));
}
