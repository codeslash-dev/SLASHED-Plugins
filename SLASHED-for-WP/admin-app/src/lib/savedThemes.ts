/**
 * User-saved themes.
 *
 * A theme is a named snapshot of the current override set, stored in
 * localStorage. Unlike the old curated presets, every theme here is created by
 * the user from their own configuration — the configurator ships no opinionated
 * starting palettes.
 */
import type { SavedSlot } from "../types";

const LS_KEY = "slashed-studio/themes/v1";

export function isStringRecord(value: unknown): value is Record<string, string> {
  return !!value
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.values(value as object).every((v) => typeof v === "string");
}

function isSavedSlot(value: unknown): value is SavedSlot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const slot = value as Partial<SavedSlot>;
  return typeof slot.id === "string"
    && typeof slot.name === "string"
    && typeof slot.icon === "string"
    && typeof slot.blurb === "string"
    && isStringRecord(slot.overrides);
}

function read(): SavedSlot[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedSlot) : [];
  } catch {
    return [];
  }
}

function write(themes: SavedSlot[]): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(themes));
    return true;
  } catch {
    return false;
  }
}

export function listSavedThemes(): SavedSlot[] {
  return read();
}

/** Create a new saved theme from the given overrides. Returns the full list. */
export function saveTheme(name: string, overrides: Record<string, string>): SavedSlot[] {
  const themes = read();
  const trimmed = name.trim() || "Untitled theme";
  const slot: SavedSlot = {
    id: `theme-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    icon: "🎨",
    blurb: `${Object.keys(overrides).length} override${Object.keys(overrides).length === 1 ? "" : "s"}`,
    overrides: { ...overrides },
  };
  const next = [...themes, slot];
  return write(next) ? next : themes;
}

export function deleteTheme(id: string): SavedSlot[] {
  const next = read().filter((t) => t.id !== id);
  return write(next) ? next : read();
}

export function renameTheme(id: string, name: string): SavedSlot[] {
  const next = read().map((t) => (t.id === id ? { ...t, name: name.trim() || t.name } : t));
  return write(next) ? next : read();
}
