"use client";

import { Search } from "lucide-react";
import { useSyncExternalStore } from "react";
import { modifierLabel } from "@/lib/shortcuts";
import { useCommandStore } from "@/stores/command";

const noop = () => () => {};

/** Opens the command palette; shows its shortcut once we know the platform. */
export function SearchButton() {
  const show = useCommandStore((state) => state.show);
  const modifier = useSyncExternalStore(noop, modifierLabel, () => null);

  return (
    <button
      type="button"
      onClick={() => show("search")}
      aria-label="Search"
      className="flex h-8 items-center gap-2 rounded-lg border border-border px-2 text-sm text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground md:w-52 md:px-3"
    >
      <Search className="size-4" aria-hidden />
      <span className="hidden flex-1 text-left md:inline">Search…</span>
      {modifier && (
        <kbd className="hidden rounded border border-border px-1 font-mono text-[0.65rem] md:inline">{modifier} K</kbd>
      )}
    </button>
  );
}
