"use client";

import { Dialog, DialogContent, DialogTitle } from "@gotham/ui/components/ui/dialog";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { cn } from "@gotham/ui/lib/utils";
import { Clock, CornerDownLeft, Loader2, Play, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { say } from "@/lib/alfred";
import { useStartFocusSession } from "@/lib/focus-queries";
import { MIN_SEARCH_LENGTH, recentSearches, rememberSearch, useSearch } from "@/lib/search-queries";
import { modifierLabel } from "@/lib/shortcuts";
import type { SearchGroup, SearchResult } from "@/lib/types";
import { useAlfredStore } from "@/stores/alfred";
import { useCommandStore } from "@/stores/command";

/** Each group's heading, in the order shown, and how many results it shows. */
const GROUPS: { key: SearchGroup; label: string; icon: string }[] = [
  { key: "missions", label: "Missions", icon: "🎯" },
  { key: "arsenal", label: "Arsenal", icon: "⚡" },
  { key: "intel", label: "Intel", icon: "📓" },
  { key: "cases", label: "Cases", icon: "📂" },
  { key: "operations", label: "Operations", icon: "📅" },
];
const PER_GROUP = 3;

type Item =
  | { kind: "result"; id: string; result: SearchResult; icon: string }
  | { kind: "recent"; id: string; query: string }
  | { kind: "action"; id: string; label: string; icon: typeof Plus; run: () => void };

/** Ctrl/⌘ K: search everything, jump to it, or start something. */
export function CommandPalette() {
  const open = useCommandStore((state) => state.open === "search");
  const close = useCommandStore((state) => state.close);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-sm"
        className="top-[12vh] max-h-[76vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {/* Mounted only while open, so each opening starts fresh. */}
        {open && <Palette onClose={close} />}
      </DialogContent>
    </Dialog>
  );
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recent] = useState(recentSearches);
  const [navigating, startTransition] = useTransition();
  const debounced = useDebouncedValue(query, 300);
  const searching = query.trim().length >= MIN_SEARCH_LENGTH;
  const { data, isFetching, isError } = useSearch(searching ? debounced : "");
  const startSession = useStartFocusSession();
  const listRef = useRef<HTMLDivElement>(null);

  function go(href: string) {
    onClose();
    startTransition(() => router.push(href));
  }

  const actions: Item[] = [
    { kind: "action", id: "new-mission", label: "Create Mission", icon: Plus, run: () => go("/missions/new") },
    {
      kind: "action",
      id: "focus",
      label: "Start Focus Session",
      icon: Play,
      run: () =>
        startSession.mutate(
          {},
          {
            onSuccess: (session) => go(`/focus/${session.id}`),
            onError: (error) =>
              useAlfredStore.getState().say({ mood: "concerned", title: say("sessionStartFailed", 0), message: error.message }),
          },
        ),
    },
  ];

  // Results only count once they answer the current query, so stale ones aren't selectable after it's cleared.
  const results = searching && data ? data : null;
  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({ ...group, items: (results?.results[group.key] ?? []).slice(0, PER_GROUP) })).filter(
        (group) => group.items.length > 0,
      ),
    [results],
  );

  const items: Item[] = [
    ...(searching
      ? groups.flatMap((group) =>
          group.items.map((result): Item => ({ kind: "result", id: `${result.type}-${result.id}`, result, icon: group.icon })),
        )
      : recent.map((recentQuery): Item => ({ kind: "recent", id: `recent-${recentQuery}`, query: recentQuery }))),
    ...actions,
  ];
  const activeIndex = Math.min(active, items.length - 1);
  const activeItem = items[activeIndex];

  useEffect(() => {
    if (!activeItem) return;
    listRef.current?.querySelector(`[data-item="${CSS.escape(activeItem.id)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeItem]);

  function select(item: Item) {
    if (item.kind === "result") {
      rememberSearch(query);
      go(item.result.route);
    } else if (item.kind === "recent") {
      setQuery(item.query);
      setActive(0);
    } else {
      item.run();
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + items.length) % items.length);
    } else if (event.key === "Enter" && activeItem) {
      event.preventDefault();
      select(activeItem);
    }
  }

  const itemProps = (item: Item) => ({
    id: `${listId}-${item.id}`,
    "data-item": item.id,
    role: "option" as const,
    "aria-selected": item === activeItem,
    onMouseMove: () => item !== activeItem && setActive(items.indexOf(item)),
    onClick: () => select(item),
    className: cn(
      "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150",
      item === activeItem ? "bg-accent text-accent-foreground" : "text-foreground",
    ),
  });

  const firstLoad = searching && !results && !isError;
  const busy = navigating || startSession.isPending;

  return (
    <div className="flex max-h-[76vh] flex-col" onKeyDown={onKeyDown}>
      <DialogTitle className="sr-only">Search Gotham</DialogTitle>
      <div className="flex items-center gap-3 border-b border-border px-4">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          autoFocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          placeholder={say("searchPrompt", 0)}
          aria-label="Search missions, habits, Intel, cases and operations"
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={activeItem ? `${listId}-${activeItem.id}` : undefined}
          className="h-12 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
        />
        {(isFetching || busy) && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />}
        <kbd className="hidden rounded border border-border px-1.5 font-mono text-[0.65rem] text-muted-foreground sm:block">
          ESC
        </kbd>
      </div>

      <div ref={listRef} id={listId} role="listbox" aria-label="Results" className="flex-1 overflow-y-auto p-2">
        {firstLoad && (
          <div className="grid gap-2 p-1" aria-hidden>
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 px-2 py-1.5">
                <Skeleton className="size-5 rounded" />
                <div className="grid flex-1 gap-1.5">
                  <Skeleton className="h-3.5 w-2/5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {searching && isError && <p className="px-3 py-8 text-center text-sm text-muted-foreground">{say("searchFailed", 0)}</p>}

        {searching && results && groups.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">{say("searchEmpty", 0)}</p>
        )}

        {searching &&
          groups.map((group) => (
            <div key={group.key} role="group" aria-label={group.label} className="mb-1">
              <p className="px-3 pt-2 pb-1 font-mono text-[0.65rem] tracking-[0.2em] text-muted-foreground">
                {group.label.toUpperCase()}
              </p>
              {group.items.map((result) => {
                const item = items.find((candidate) => candidate.kind === "result" && candidate.result === result)!;
                return (
                  <div key={item.id} {...itemProps(item)}>
                    <span aria-hidden className="text-base leading-none">
                      {group.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{result.title}</span>
                      {result.snippet && (
                        <span className="block truncate text-xs text-muted-foreground">{result.snippet}</span>
                      )}
                    </span>
                    {result.meta && (
                      <span className="hidden shrink-0 font-mono text-[0.7rem] text-muted-foreground sm:block">
                        {result.meta}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

        {!searching && recent.length > 0 && (
          <div role="group" aria-label="Recent searches" className="mb-1">
            <p className="px-3 pt-2 pb-1 font-mono text-[0.65rem] tracking-[0.2em] text-muted-foreground">RECENT</p>
            {items
              .filter((item) => item.kind === "recent")
              .map((item) => (
                <div key={item.id} {...itemProps(item)}>
                  <Clock className="size-4 text-muted-foreground" aria-hidden />
                  <span className="truncate">{item.query}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div role="group" aria-label="Quick actions" className="border-t border-border p-2">
        {items
          .filter((item) => item.kind === "action")
          .map((item) => (
            <div key={item.id} {...itemProps(item)}>
              <item.icon className="size-4 text-primary" aria-hidden />
              <span className="flex-1">{item.label}</span>
              {item === activeItem && <CornerDownLeft className="size-3.5 text-muted-foreground" aria-hidden />}
            </div>
          ))}
        <p className="px-3 pt-1.5 text-[0.7rem] text-muted-foreground">
          ↑↓ to move · Enter to open · {modifierLabel()} / for all shortcuts
        </p>
      </div>
    </div>
  );
}
