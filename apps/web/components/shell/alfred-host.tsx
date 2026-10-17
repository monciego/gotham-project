"use client";

import { AlfredPanel } from "@/components/alfred/alfred-panel";
import { HelpDialog } from "@/components/alfred/help-dialog";
import { criticalMessage, useAlfredAction, useAlfredMessages, useDismissMessage } from "@/lib/alfred-queries";
import type { AlfredAction } from "@/lib/types";
import { useAlfredStore } from "@/stores/alfred";

/**
 * Alfred's panel on every page: whatever he was just asked to say (a toast,
 * stores/alfred.ts), or else the first unread critical message, which stays
 * until it's dismissed or acted on.
 */
export function AlfredHost() {
  const toast = useAlfredStore((state) => state.toast);
  const dismissToast = useAlfredStore((state) => state.dismiss);
  const { data } = useAlfredMessages();
  const dismiss = useDismissMessage();
  const act = useAlfredAction();
  const critical = criticalMessage(data);

  function handleAction(action: AlfredAction) {
    if (toast) {
      dismissToast();
      return;
    }
    if (!critical) return;

    if (action.href) {
      act.mutate({ id: critical.id, action: "link" });
    } else if (action.action === "dismiss") {
      dismiss.mutate(critical.id);
    } else if (action.action) {
      act.mutate({ id: critical.id, action: action.action });
    }
  }

  const message = toast ?? (critical && { ...critical, key: `message-${critical.id}` });

  return (
    <>
      <AlfredPanel
        message={message ?? null}
        busy={act.isPending}
        onDismiss={() => (toast ? dismissToast() : critical && dismiss.mutate(critical.id))}
        onAction={handleAction}
      />
      <HelpDialog />
    </>
  );
}
