"use client";

import { Button, buttonVariants } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Check,
  Clock,
  Flag,
  ListTree,
  Pencil,
  RotateCcw,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { say } from "@/lib/alfred";
import { formatDueDate, formatMinutes } from "@/lib/format";
import { useCompleteMission, useMission, useUpdateMission } from "@/lib/mission-queries";
import { useAlfredStore } from "@/stores/alfred";
import { AbandonDialog } from "./abandon-dialog";
import { BreakdownDialog } from "./breakdown-dialog";
import { DependenciesSection } from "./dependencies-section";
import { FocusHistory } from "./focus-history";
import { MissionNotFound } from "./mission-not-found";
import { MissionDetailSkeleton } from "./mission-skeletons";
import { NotesEditor } from "./notes-editor";
import { PriorityBadge } from "./priority-badge";
import { QuickStartButton } from "@/components/focus/quick-start-button";
import { OperationDialog } from "@/components/operations/operation-dialog";
import { StatusBadge } from "./status-badge";
import { SubtaskList } from "./subtask-list";

/** Alfred gets firm after this many postponements. */
const POSTPONE_WARNING = 2;

type Dialog = "breakdown" | "schedule" | "abandon" | null;

export function MissionDetailView({ id, openBreakdown }: { id: number; openBreakdown: boolean }) {
  const { data: mission, isPending, isError } = useMission(id);
  const complete = useCompleteMission(id);
  const reopen = useUpdateMission(id);
  // Alfred's "Break it down" alert links here with ?breakdown=1.
  const [dialog, setDialog] = useState<Dialog>(openBreakdown ? "breakdown" : null);

  if (isPending) return <MissionDetailSkeleton />;
  if (isError) return <MissionNotFound />;

  const open = mission.status === "not_started" || mission.status === "in_progress";
  const postponedOften = mission.times_postponed > POSTPONE_WARNING;
  const closeDialog = (next: boolean) => !next && setDialog(null);

  return (
    <div className="grid gap-6">
      <Link
        href="/missions"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Missions
      </Link>

      <header className="grid gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <PriorityBadge priority={mission.priority} />
          <StatusBadge status={mission.status} />
          {mission.case && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {mission.case.name}
            </span>
          )}
        </div>
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{mission.title}</h2>
        {mission.description && <p className="text-muted-foreground">{mission.description}</p>}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span className={cn("flex items-center gap-1.5", mission.is_overdue && "text-priority-critical")}>
            <CalendarDays className="size-4" aria-hidden />
            {mission.is_overdue && "Overdue · "}
            {formatDueDate(mission.due_date)}
            {mission.due_time && ` at ${mission.due_time}`}
          </span>
          {mission.estimated_minutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              {formatMinutes(mission.estimated_minutes)} estimated
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Timer className="size-4" aria-hidden />
            {formatMinutes(mission.total_focus_minutes)} invested
          </span>
        </div>
        {mission.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {mission.tags.map((tag) => (
              <span key={tag} className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}
      </header>

      {open && postponedOften && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-priority-critical/50 bg-priority-critical/10 p-4 text-red-300"
        >
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          <p className="font-medium">You&apos;ve postponed this {mission.times_postponed} times, sir.</p>
        </div>
      )}

      {open && postponedOften && mission.past_self_message && (
        <figure className="rounded-xl border border-primary/40 bg-primary/5 p-5">
          <figcaption className="text-sm text-primary">{say("pastSelf", 0)}</figcaption>
          <blockquote className="mt-2 text-lg italic">&ldquo;{mission.past_self_message}&rdquo;</blockquote>
        </figure>
      )}

      {mission.status === "abandoned" && mission.abandon_reason && (
        <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          Abandoned: {mission.abandon_reason}
        </p>
      )}

      {open && mission.active_session && (
        <Link
          href={`/focus/${mission.active_session.id}`}
          className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4 transition-colors duration-200 hover:bg-primary/10"
        >
          <span className="flex items-center gap-2 font-medium">
            <Timer className="size-4 text-primary" aria-hidden />
            A focus session is running on this mission.
          </span>
          <span className="font-mono text-xs tracking-[0.2em] text-primary">RETURN TO FOCUS</span>
        </Link>
      )}

      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">WHY THIS MATTERS</h3>
        <p className="mt-2 text-lg leading-relaxed">{mission.why_it_matters}</p>
      </section>

      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Mission actions">
        {open ? (
          <>
            {!mission.active_session && (
              <QuickStartButton missionId={mission.id} variant="default" size="lg" />
            )}
            <Button variant="outline" size="lg" onClick={() => setDialog("breakdown")}>
              <ListTree aria-hidden />
              Break It Down
            </Button>
            <Button variant="outline" size="lg" onClick={() => setDialog("schedule")}>
              <CalendarClock aria-hidden />
              Schedule
            </Button>
            <Link href={`/missions/${mission.id}/edit`} className={buttonVariants({ variant: "outline", size: "lg" })}>
              <Pencil aria-hidden />
              Edit
            </Link>
            <Button
              variant="outline"
              size="lg"
              className="text-emerald-400"
              disabled={complete.isPending}
              onClick={() => complete.mutate()}
            >
              <Check aria-hidden />
              Complete
            </Button>
            <Button variant="ghost" size="lg" className="text-muted-foreground" onClick={() => setDialog("abandon")}>
              <Flag aria-hidden />
              Abandon
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="lg"
              disabled={reopen.isPending}
              onClick={() => reopen.mutate({ status: "not_started" })}
            >
              <RotateCcw aria-hidden />
              Reopen
            </Button>
            <Link href={`/missions/${mission.id}/edit`} className={buttonVariants({ variant: "outline", size: "lg" })}>
              <Pencil aria-hidden />
              Edit
            </Link>
          </>
        )}
      </div>
      {complete.isError && (
        <p role="alert" className="-mt-3 text-sm text-destructive">
          {complete.error.message}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid content-start gap-6 lg:col-span-2">
          <SubtaskList missionId={mission.id} subtasks={mission.subtasks} />
          <NotesEditor key={mission.id} missionId={mission.id} notes={mission.notes} />
        </div>
        <div className="grid content-start gap-6">
          <FocusHistory mission={mission} />
          <DependenciesSection mission={mission} />
        </div>
      </div>

      <BreakdownDialog mission={mission} open={dialog === "breakdown"} onOpenChange={closeDialog} />
      {/* Time-blocks the mission on the calendar; the event's start becomes its due time. */}
      <OperationDialog
        open={dialog === "schedule"}
        onOpenChange={closeDialog}
        initial={{ title: mission.title, missionId: mission.id }}
        onSaved={() =>
          useAlfredStore.getState().say({
            mood: "encouraging",
            title: "Time blocked, sir.",
            message: "It's on the calendar. I'll hold you to it.",
            actions: [{ label: "Open Operations", href: "/operations" }],
          })
        }
      />
      <AbandonDialog missionId={mission.id} open={dialog === "abandon"} onOpenChange={closeDialog} />
    </div>
  );
}
