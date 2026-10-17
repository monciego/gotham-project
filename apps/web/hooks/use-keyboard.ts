import { useEffect, useRef } from "react";

/** Keys (lowercase, as `event.key` gives them) mapped to what they do when pressed with Ctrl or ⌘. */
export type KeyBindings = Record<string, (event: KeyboardEvent) => void>;

/**
 * Listens for Ctrl/⌘ + key anywhere on the page. Shift and Alt combinations
 * are left alone, so the browser's and editors' own shortcuts keep working.
 */
export function useKeyboard(bindings: KeyBindings, enabled = true) {
  const latest = useRef(bindings);

  useEffect(() => {
    latest.current = bindings;
  });

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.repeat) return;

      const handler = latest.current[event.key.toLowerCase()];
      if (handler) {
        event.preventDefault();
        handler(event);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
