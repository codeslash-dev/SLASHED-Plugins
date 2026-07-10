// Live-preview gallery: tab registry + panel↔tab mapping. Each tab mirrors a
// configurator control panel so editing a panel and switching to its tab shows
// exactly what changed; App.svelte can auto-follow the active panel here.

import * as S from "./sections";
export { previewSkinCSS } from "./skin";

export type PreviewTab =
  | "color" | "type" | "space" | "borders" | "shadows"
  | "effects" | "motion" | "layout" | "components" | "macros" | "advanced";

export interface TabDef {
  id: PreviewTab;
  label: string;
  build: () => string;
}

export const TABS: TabDef[] = [
  { id: "color",      label: "Color",      build: S.color },
  { id: "type",       label: "Type",       build: S.type },
  { id: "space",      label: "Spacing",    build: S.space },
  { id: "borders",    label: "Borders",    build: S.borders },
  { id: "shadows",    label: "Shadows",    build: S.shadows },
  { id: "effects",    label: "Effects",    build: S.effects },
  { id: "motion",     label: "Motion",     build: S.motion },
  { id: "layout",     label: "Layout",     build: S.layout },
  { id: "components", label: "Components", build: S.components },
  { id: "macros",     label: "Macros",     build: S.macros },
  { id: "advanced",   label: "All / API",  build: S.advanced },
];

const BY_ID = new Map(TABS.map((t) => [t.id, t]));

export function buildTab(id: PreviewTab): string {
  return (BY_ID.get(id) ?? TABS[0]).build();
}

/** Configurator panel/domain id → the preview tab that visualises it. Used to
 *  auto-switch the preview to match the panel the user is editing. */
export const PANEL_TO_TAB: Record<string, PreviewTab> = {
  colors: "color",
  typography: "type",
  spacing: "space",
  borders: "borders",
  shadows: "shadows",
  effects: "effects",
  motion: "motion",
  layout: "layout",
  components: "components",
  macros: "macros",
  misc: "macros",
  themes: "color",
  wcag: "color",
  cheatsheet: "advanced",
};
