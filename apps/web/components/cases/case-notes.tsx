"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { RICH_TEXT_CLASS, isBlank } from "@/components/intel/rich-text";
import { RichTextEditor } from "@/components/intel/rich-text-editor";
import { useUpdateCase } from "@/lib/case-queries";

export function CaseNotes({ caseId, notes }: { caseId: number; notes: string | null }) {
  const update = useUpdateCase(caseId);
  const [draft, setDraft] = useState<string | null>(null);

  function save() {
    if (draft === null) return;
    update.mutate({ notes: isBlank(draft) ? null : draft }, { onSuccess: () => setDraft(null) });
  }

  return (
    <section aria-labelledby="case-notes-label" className="grid content-start gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 id="case-notes-label" className="font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">
          NOTES
        </h3>
        {draft === null && (
          <Button variant="ghost" size="sm" onClick={() => setDraft(notes ?? "")}>
            <Pencil aria-hidden />
            Edit Notes
          </Button>
        )}
      </div>

      {draft !== null ? (
        <div className="grid gap-3">
          <RichTextEditor id="case-notes" value={draft} onChange={setDraft} />
          {update.isError && (
            <p role="alert" className="text-xs text-destructive">
              {update.error.message}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button disabled={update.isPending} onClick={save}>
              Save notes
            </Button>
          </div>
        </div>
      ) : notes ? (
        // Cleaned by the API (App\Support\RichText) before it was saved.
        <div className={RICH_TEXT_CLASS} dangerouslySetInnerHTML={{ __html: notes }} />
      ) : (
        <p className="text-sm text-muted-foreground">Nothing in the file yet, sir.</p>
      )}
    </section>
  );
}
