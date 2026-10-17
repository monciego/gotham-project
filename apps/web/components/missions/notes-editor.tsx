"use client";

import { Textarea } from "@gotham/ui/components/ui/textarea";
import { useState } from "react";
import { SectionCard } from "@/components/section-card";
import { useUpdateMission } from "@/lib/mission-queries";

/** Notes save when the field loses focus. */
export function NotesEditor({ missionId, notes }: { missionId: number; notes: string | null }) {
  const update = useUpdateMission(missionId);
  const [value, setValue] = useState(notes ?? "");

  function save() {
    if (value.trim() !== (notes ?? "").trim()) {
      update.mutate({ notes: value.trim() || null });
    }
  }

  const status = update.isPending ? "Saving…" : update.isError ? "Didn't save" : update.isSuccess ? "Saved" : "";

  return (
    <SectionCard
      title="NOTES"
      action={
        <span className={update.isError ? "text-xs text-destructive" : "text-xs text-muted-foreground"} aria-live="polite">
          {status}
        </span>
      }
    >
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={save}
        placeholder="Anything worth remembering, sir."
        aria-label="Notes"
        rows={4}
      />
    </SectionCard>
  );
}
