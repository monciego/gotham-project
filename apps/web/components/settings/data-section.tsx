"use client";

import { Button } from "@gotham/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gotham/ui/components/ui/dialog";
import { Input } from "@gotham/ui/components/ui/input";
import { Download, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Field } from "@/components/forms/field";
import { say } from "@/lib/alfred";
import { ApiError } from "@/lib/api";
import { exportData, useDeleteAccount } from "@/lib/settings-queries";
import { SaveStatus, SettingsSection } from "./settings-section";

const CONFIRMATION = "DELETE";

export function DataSection() {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    setStatus(null);
    try {
      await exportData();
      setStatus({ tone: "success", text: say("exportStarted", 0) });
    } catch (error) {
      setStatus({ tone: "error", text: error instanceof Error ? error.message : say("error", 0) });
    } finally {
      setExporting(false);
    }
  }

  return (
    <SettingsSection id="data" title="Data" description="Your records belong to you.">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
          Export all data
        </Button>
        <SaveStatus status={status} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        A ZIP with one JSON file per feature: missions, cases, habits, Intel, resources, calendar, focus sessions, trophies and more.
      </p>

      <div className="mt-6 rounded-lg border border-destructive/40 p-4">
        <p className="text-sm font-medium text-destructive">Danger zone</p>
        <p className="mt-1 text-sm text-muted-foreground">{say("deleteAccountWarning", 0)}</p>
        <Button
          type="button"
          className="mt-3 bg-destructive text-white hover:bg-destructive/85"
          onClick={() => setDeleting(true)}
        >
          <Trash2 aria-hidden />
          Delete account
        </Button>
      </div>

      <DeleteAccountDialog open={deleting} onOpenChange={setDeleting} />
    </SettingsSection>
  );
}

function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const remove = useDeleteAccount();
  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const confirmed = typed === CONFIRMATION && password.length > 0;

  function close(next: boolean) {
    if (remove.isPending) return;
    if (!next) {
      setTyped("");
      setPassword("");
      setError(null);
    }
    onOpenChange(next);
  }

  function handleDelete(event: React.FormEvent) {
    event.preventDefault();
    if (!confirmed) return;
    setError(null);
    remove.mutate(password, {
      // The proxy has cleared the cookie; a full load leaves nothing of the account in memory.
      onSuccess: () => window.location.assign("/login"),
      onError: (failure) =>
        setError(failure instanceof ApiError ? (failure.errors.password?.[0] ?? failure.message) : say("error", 0)),
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleDelete} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>{say("deleteAccountWarning", 0)}</DialogDescription>
          </DialogHeader>

          <Field id="delete-confirm" label={`Type ${CONFIRMATION} to confirm`}>
            <Input
              id="delete-confirm"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono"
            />
          </Field>
          <Field id="delete-password" label="Your password" error={error ?? undefined}>
            <Input
              id="delete-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              aria-invalid={!!error}
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)} disabled={remove.isPending}>
              Keep my account
            </Button>
            <Button
              type="submit"
              className="bg-destructive text-white hover:bg-destructive/85"
              disabled={!confirmed || remove.isPending}
            >
              {remove.isPending && <Loader2 className="animate-spin" aria-hidden />}
              Delete forever
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
