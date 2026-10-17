"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@gotham/ui/components/ui/dialog";
import { isMac, modifierLabel, SHORTCUTS } from "@/lib/shortcuts";
import { useCommandStore } from "@/stores/command";

/** Ctrl/⌘ /: every shortcut in one table. */
export function ShortcutsDialog() {
  const open = useCommandStore((state) => state.open === "shortcuts");
  const close = useCommandStore((state) => state.close);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            {open && isMac() ? "⌘ or Ctrl, whichever you prefer, sir. macOS keeps ⌘H and ⌘M for itself." : "At your fingertips, sir."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <table className="w-full text-sm">
            <thead className="sr-only">
              <tr>
                <th>Action</th>
                <th>Keys</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {SHORTCUTS.map((shortcut) => (
                <tr key={shortcut.key}>
                  <td className="py-2">{shortcut.label}</td>
                  <td className="py-2 text-right">
                    <Keys keys={[modifierLabel(), shortcut.key.toUpperCase()]} />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-2">Close any dialog</td>
                <td className="py-2 text-right">
                  <Keys keys={["Esc"]} />
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Keys({ keys }: { keys: string[] }) {
  return (
    <span className="inline-flex gap-1">
      {keys.map((key) => (
        <kbd
          key={key}
          className="min-w-6 rounded border border-border bg-muted px-1.5 py-0.5 text-center font-mono text-xs text-muted-foreground"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
