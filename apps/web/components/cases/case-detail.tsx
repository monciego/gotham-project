"use client";

import { Button, buttonVariants } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { ArrowLeft, CheckCircle2, Pencil, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useCase, useUpdateCase } from "@/lib/case-queries";
import { CaseMissions } from "./case-missions";
import { caseColor, formatDay, isOpen } from "./case-meta";
import { CaseNotFound } from "./case-not-found";
import { CaseNotes } from "./case-notes";
import { CaseProgressSection } from "./case-progress-section";
import { CaseDetailSkeleton } from "./case-skeletons";
import { CaseStats } from "./case-stats";
import { CaseStatusBadge } from "./case-status-badge";
import { CompleteCaseDialog } from "./complete-case-dialog";
import { MilestonesSection } from "./milestones-section";

export function CaseDetailView({ id }: { id: number }) {
  const { data: item, isPending, isError } = useCase(id);
  const reopen = useUpdateCase(id);
  const [closing, setClosing] = useState(false);

  if (isPending) return <CaseDetailSkeleton />;
  if (isError) return <CaseNotFound />;

  const open = isOpen(item);
  const ready = item.progress >= 100;

  return (
    <div className="grid gap-6">
      <Link
        href="/cases"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Cases
      </Link>

      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: caseColor(item) }} />
          <CaseStatusBadge status={item.status} />
          {item.category && (
            <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground">{item.category}</span>
          )}
          <span className="text-xs text-muted-foreground">Started {formatDay(item.start_date)}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{item.name}</h2>
          <div className="flex flex-wrap gap-2">
            <Link href={`/cases/${item.id}/edit`} className={buttonVariants({ variant: "outline" })}>
              <Pencil aria-hidden />
              Edit
            </Link>
            {open ? (
              <Button
                variant={ready ? "default" : "outline"}
                className={cn(!ready && "text-emerald-400")}
                onClick={() => setClosing(true)}
              >
                <CheckCircle2 aria-hidden />
                Complete Case
              </Button>
            ) : (
              item.status === "completed" && (
                <Button variant="outline" disabled={reopen.isPending} onClick={() => reopen.mutate({ status: "active" })}>
                  <RotateCcw aria-hidden />
                  Reopen
                </Button>
              )
            )}
          </div>
        </div>
        {item.description && <p className="text-muted-foreground">{item.description}</p>}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span key={tag} className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {open && ready && (
        <button
          type="button"
          onClick={() => setClosing(true)}
          className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4 text-left transition-colors duration-200 hover:bg-primary/10"
        >
          <span className="font-medium">Every mission is done, sir. Shall we close the case?</span>
          <span className="shrink-0 font-mono text-xs tracking-[0.2em] text-primary">CLOSE CASE</span>
        </button>
      )}

      <CaseProgressSection item={item} />
      <CaseStats analytics={item.analytics} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <CaseMissions caseId={item.id} missions={item.missions} open={open} />
        </div>
        <div className="grid content-start gap-6">
          <MilestonesSection caseId={item.id} milestones={item.milestones} />
          <CaseNotes key={item.id} caseId={item.id} notes={item.notes} />
        </div>
      </div>

      <CompleteCaseDialog item={item} open={closing} onOpenChange={setClosing} />
    </div>
  );
}
