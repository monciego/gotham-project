import type { Overlay } from "@/stores/command";

/**
 * Gotham's keyboard shortcuts. Each takes Ctrl, or ⌘ on a Mac; Ctrl works on
 * a Mac too, since macOS keeps ⌘H and ⌘M for itself.
 */
export type Shortcut = {
  key: string;
  label: string;
} & ({ overlay: Overlay; href?: never } | { href: string; overlay?: never });

export const SHORTCUTS: Shortcut[] = [
  { key: "k", label: "Search", overlay: "search" },
  { key: "m", label: "New mission", href: "/missions/new" },
  { key: "h", label: "New habit", href: "/arsenal/new" },
  { key: "j", label: "New Intel entry", href: "/intel/new" },
  { key: "f", label: "Start a focus session", overlay: "focus" },
  { key: "/", label: "Keyboard shortcuts", overlay: "shortcuts" },
];

export function isMac(): boolean {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

/** "⌘" on a Mac, "Ctrl" elsewhere. */
export function modifierLabel(): string {
  return isMac() ? "⌘" : "Ctrl";
}
