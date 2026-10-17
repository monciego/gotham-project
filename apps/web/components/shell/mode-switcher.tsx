"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@gotham/ui/components/ui/dialog";
import { useCommandStore } from "@/stores/command";
import { useMe } from "@/lib/queries";
import { ModeCards } from "./mode-cards";
import { useSwitchMode } from "@/lib/settings-queries";

/** The mode selector, opened from the mode pill in the header or sidebar. */
export function ModeSwitcher() {
  const open = useCommandStore((state) => state.open === "mode");
  const close = useCommandStore((state) => state.close);
  const { data: user } = useMe();
  const switchMode = useSwitchMode();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Life mode</DialogTitle>
          <DialogDescription>How shall we approach things, sir? Alfred adjusts to match.</DialogDescription>
        </DialogHeader>
        {user && (
          <ModeCards
            value={user.current_mode}
            detailed
            onChange={(mode) => {
              close();
              if (mode !== user.current_mode) switchMode.mutate(mode);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
