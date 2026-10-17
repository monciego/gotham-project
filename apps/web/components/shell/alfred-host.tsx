"use client";

import { AlfredPanel } from "@/components/alfred/alfred-panel";
import { useAlfredStore } from "@/stores/alfred";

/** Shows whatever Alfred was last asked to say (see stores/alfred.ts), on every page. */
export function AlfredHost() {
  const toast = useAlfredStore((state) => state.toast);
  const dismiss = useAlfredStore((state) => state.dismiss);

  return <AlfredPanel message={toast} onDismiss={dismiss} onAction={dismiss} />;
}
