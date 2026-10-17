"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** How often unsaved changes are written to localStorage. */
const SAVE_EVERY_MS = 30_000;

export type DraftStatus = "idle" | "unsaved" | "saving" | "saved";

export type Draft<T> = { values: T; savedAt: number };

function read<T>(key: string): Draft<T> | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as Draft<T> | null;
  } catch {
    return null;
  }
}

/**
 * Keeps a draft of a form in localStorage: every 30 seconds while there are
 * changes. `found` is a draft left from an earlier visit, newer than `since`.
 */
export function useDraft<T>(key: string, getValues: () => T, since = 0) {
  const [status, setStatus] = useState<DraftStatus>("idle");
  const [found, setFound] = useState<Draft<T> | null>(null);
  const changed = useRef(false);

  useEffect(() => {
    const draft = read<T>(key);
    if (draft && draft.savedAt > since) setFound(draft);
  }, [key, since]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!changed.current) return;
      changed.current = false;
      setStatus("saving");
      try {
        localStorage.setItem(key, JSON.stringify({ values: getValues(), savedAt: Date.now() }));
      } catch {
        // Storage unavailable: the form still works, it just isn't backed up.
      }
      // Long enough to read "Saving...".
      setTimeout(() => setStatus("saved"), 600);
    }, SAVE_EVERY_MS);
    return () => clearInterval(timer);
  }, [key, getValues]);

  const markChanged = useCallback(() => {
    changed.current = true;
    setStatus("unsaved");
  }, []);

  /** After a real save, or when the draft is thrown away. */
  const clear = useCallback(() => {
    changed.current = false;
    setFound(null);
    setStatus("idle");
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing stored.
    }
  }, [key]);

  return { status, found, dismissFound: () => setFound(null), markChanged, clear };
}
