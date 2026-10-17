"use client";

import { useRouter } from "next/navigation";
import { ModeSwitcher } from "@/components/shell/mode-switcher";
import { useKeyboard, type KeyBindings } from "@/hooks/use-keyboard";
import { SHORTCUTS } from "@/lib/shortcuts";
import { useCommandStore } from "@/stores/command";
import { CommandPalette } from "./command-palette";
import { FocusPickerDialog } from "./focus-picker-dialog";
import { ShortcutsDialog } from "./shortcuts-dialog";

/** The global keyboard shortcuts (lib/shortcuts.ts) and the overlays they open. */
export function CommandHost() {
  const router = useRouter();
  const toggle = useCommandStore((state) => state.toggle);
  const close = useCommandStore((state) => state.close);

  const bindings: KeyBindings = Object.fromEntries(
    SHORTCUTS.map((shortcut) => [
      shortcut.key,
      () => {
        if (shortcut.overlay) {
          toggle(shortcut.overlay);
        } else {
          close();
          router.push(shortcut.href);
        }
      },
    ]),
  );
  useKeyboard(bindings);

  return (
    <>
      <CommandPalette />
      <ShortcutsDialog />
      <FocusPickerDialog />
      <ModeSwitcher />
    </>
  );
}
