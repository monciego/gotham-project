"use client";

import { BracketCard } from "@gotham/ui/components/bracket-card";
import { Button } from "@gotham/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@gotham/ui/components/ui/dialog";
import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { Check, ChevronDown, Copy, Share2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import { formatMinutes } from "@/lib/format";
import { useWeeklyReport, useWeeklyReports } from "@/lib/overview-queries";
import type { WeeklyReport } from "@/lib/types";
import { shortDate } from "./chart-theme";

function title(report: WeeklyReport): string {
  return `Week of ${shortDate(report.week_start)} – ${shortDate(report.week_end)}`;
}

/** The report as plain text, for copying or sharing. */
function asText(report: WeeklyReport): string {
  const { metrics } = report;
  return [
    `Gotham weekly report · ${title(report)}${report.in_progress ? " (so far)" : ""}`,
    "",
    report.summary,
    "",
    `Focus: ${formatMinutes(metrics.focus_minutes)}`,
    `Missions completed: ${metrics.missions_completed}`,
    metrics.habit_completion_rate !== null ? `Habits: ${metrics.habit_completion_rate}%` : null,
    `XP earned: ${metrics.xp_earned}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function ReportNumbers({ report }: { report: WeeklyReport }) {
  const { metrics } = report;
  const items = [
    { label: "Focus", value: formatMinutes(metrics.focus_minutes) },
    { label: "Missions", value: metrics.missions_completed },
    { label: "Habits", value: metrics.habit_completion_rate === null ? "—" : `${metrics.habit_completion_rate}%` },
    { label: "Mood", value: metrics.average_mood === null ? "—" : `${metrics.average_mood}/5` },
    { label: "XP", value: metrics.xp_earned },
    { label: "Spent", value: `$${metrics.spent.toLocaleString("en-US", { minimumFractionDigits: 2 })}` },
  ];

  return (
    <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {items.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-[11px] text-muted-foreground">{label}</dt>
          <dd className="font-mono text-sm font-semibold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ShareButtons({ report }: { report: WeeklyReport }) {
  const [copied, setCopied] = useState(false);
  // False on the server, so the first render matches; the browser then says whether it can share.
  const canShare = useSyncExternalStore(
    () => () => undefined,
    () => "share" in navigator,
    () => false,
  );

  async function copy() {
    await navigator.clipboard.writeText(asText(report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={copy}>
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? "Copied" : "Copy"}
      </Button>
      {canShare && (
        <Button
          variant="outline"
          size="sm"
          // Dismissing the share sheet rejects; nothing to do then.
          onClick={() => navigator.share({ title: "Gotham weekly report", text: asText(report) }).catch(() => undefined)}
        >
          <Share2 aria-hidden />
          Share
        </Button>
      )}
    </div>
  );
}

function PreviousReports({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: reports, isPending, isError } = useWeeklyReports(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Previous reports</DialogTitle>
          <DialogDescription>Saved every Sunday at 11pm.</DialogDescription>
        </DialogHeader>
        {isPending ? (
          <div className="grid gap-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">I couldn&apos;t fetch the archive, sir.</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reports saved yet, sir. The first arrives on Sunday night.
          </p>
        ) : (
          <ul className="grid gap-4">
            {reports.map((report) => (
              <li key={report.week_start} className="grid gap-3 rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-medium">{title(report)}</h4>
                  <ShareButtons report={report} />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{report.summary}</p>
                <ReportNumbers report={report} />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** This week's report so far, expandable, with the saved ones a click away. */
export function WeeklyReportCard() {
  const { data: report, isPending, isError } = useWeeklyReport();
  const [expanded, setExpanded] = useState(false);
  const [archive, setArchive] = useState(false);

  return (
    <BracketCard id="weekly-report" className="scroll-mt-24 p-5">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="weekly-report-body"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div>
          <h3 className="font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">WEEKLY REPORT</h3>
          <p className="mt-1 font-medium">
            {report ? `${title(report)}${report.in_progress ? " · so far" : ""}` : "This week"}
          </p>
        </div>
        <ChevronDown
          className={`size-5 shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {isPending ? (
        <Skeleton className="mt-4 h-5 w-3/4" />
      ) : isError ? (
        <p className="mt-4 text-sm text-destructive">I couldn&apos;t prepare the report, sir.</p>
      ) : (
        <>
          {!expanded && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{report.summary}</p>}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                id="weekly-report-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="grid gap-5 pt-4">
                  <p className="leading-relaxed">{report.summary}</p>
                  <ReportNumbers report={report} />
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <button type="button" className="text-sm text-primary hover:underline" onClick={() => setArchive(true)}>
                      View Previous Reports
                    </button>
                    <ShareButtons report={report} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <PreviousReports open={archive} onOpenChange={setArchive} />
    </BracketCard>
  );
}
