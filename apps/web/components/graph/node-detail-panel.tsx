"use client";

import { buttonVariants } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { AlertTriangle, ExternalLink, Flame, Unlink, X } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { CATEGORY_LABELS } from "@/components/arsenal/habit-meta";
import { formatDay } from "@/components/cases/case-meta";
import { CaseProgressBar } from "@/components/cases/case-progress-bar";
import { CaseStatusBadge } from "@/components/cases/case-status-badge";
import { QuickStartButton } from "@/components/focus/quick-start-button";
import { moodOf } from "@/components/intel/moods";
import { PriorityBadge } from "@/components/missions/priority-badge";
import { StatusBadge } from "@/components/missions/status-badge";
import { say } from "@/lib/alfred";
import { formatMinutes } from "@/lib/format";
import { type GraphModel, NODE_TYPE_LABELS, nodeRoute } from "@/lib/graph-layout";
import type { GraphNode } from "@/lib/types";

type NodeDetailPanelProps = {
  node: GraphNode;
  model: GraphModel;
  onSelect: (id: string) => void;
  onClose: () => void;
};

/** The right-hand drawer for the node clicked on the map. */
export function NodeDetailPanel({ node, model, onSelect, onClose }: NodeDetailPanelProps) {
  const isolated = model.isolated.has(node.id);
  const connected = [...(model.neighbours.get(node.id) ?? [])]
    .map((id) => model.byId.get(id))
    .filter((item): item is GraphNode => item !== undefined);

  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      aria-label={`${NODE_TYPE_LABELS[node.type].singular}: ${node.label}`}
      className="absolute inset-y-0 right-0 z-10 flex w-full max-w-80 flex-col border-l border-border bg-card shadow-2xl"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <p className="font-mono text-[0.65rem] tracking-[0.2em] text-muted-foreground">
          {NODE_TYPE_LABELS[node.type].singular.toUpperCase()}
        </p>
        <div className="flex items-center gap-2">
          {isolated && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[0.65rem] text-muted-foreground">
              <Unlink className="size-3" aria-hidden />
              No connections
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {node.type === "case" && <CaseDetails node={node} connected={connected} onSelect={onSelect} />}
        {node.type === "mission" && <MissionDetails node={node} model={model} onSelect={onSelect} />}
        {node.type === "arsenal" && <HabitDetails node={node} connected={connected} />}
        {node.type === "intel" && <IntelDetails node={node} connected={connected} />}
      </div>

      <div className="grid gap-2 border-t border-border p-4">
        {node.type === "mission" && node.status !== "completed" && node.status !== "abandoned" && (
          <QuickStartButton missionId={node.data.id} variant="default" size="default" className="w-full" />
        )}
        <Link href={nodeRoute(node)} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
          <ExternalLink aria-hidden />
          Open {NODE_TYPE_LABELS[node.type].singular}
        </Link>
      </div>
    </motion.aside>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg leading-snug font-semibold tracking-tight">{children}</h3>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 mb-1.5 font-mono text-[0.65rem] tracking-[0.2em] text-muted-foreground">{children}</p>;
}

/** Other nodes, as buttons that move the selection to them. */
function NodeLinks({ nodes, onSelect }: { nodes: GraphNode[]; onSelect: (id: string) => void }) {
  return (
    <ul className="grid gap-1">
      {nodes.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect(item.id)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
          >
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="truncate">{item.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CaseDetails({
  node,
  connected,
  onSelect,
}: {
  node: Extract<GraphNode, { type: "case" }>;
  connected: GraphNode[];
  onSelect: (id: string) => void;
}) {
  const { data } = node;
  const missions = connected.filter((item) => item.type === "mission");

  return (
    <>
      <Title>{data.name}</Title>
      <div className="mt-2">
        <CaseStatusBadge status={data.status} />
      </div>
      <div className="mt-4">
        <CaseProgressBar progress={data.progress} color={node.color} label={`${data.name} progress`} />
        <p className="mt-1.5 text-sm text-muted-foreground">
          <span className="font-mono text-foreground">{data.progress}%</span> · {data.missions_completed}/{data.missions_total}{" "}
          missions complete
        </p>
      </div>
      {data.target_end_date && (
        <p className="mt-2 text-sm text-muted-foreground">Target: {formatDay(data.target_end_date)}</p>
      )}
      <Label>MISSIONS ON THE MAP</Label>
      {missions.length > 0 ? (
        <NodeLinks nodes={missions} onSelect={onSelect} />
      ) : (
        <p className="text-sm text-muted-foreground">{say("mapEmptyCase", 0)}</p>
      )}
    </>
  );
}

function MissionDetails({
  node,
  model,
  onSelect,
}: {
  node: Extract<GraphNode, { type: "mission" }>;
  model: GraphModel;
  onSelect: (id: string) => void;
}) {
  const { data } = node;
  const parent = data.case_id === null ? undefined : model.byId.get(`case-${data.case_id}`);
  const dependencies = data.dependency_ids
    .map((id) => model.byId.get(`mission-${id}`))
    .filter((item): item is GraphNode => item !== undefined);

  return (
    <>
      <Title>{data.title}</Title>
      <div className="mt-2 flex flex-wrap gap-2">
        <PriorityBadge priority={data.priority} />
        <StatusBadge status={data.status} />
      </div>

      {data.times_postponed >= 3 && (
        <div role="note" className="mt-4 flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <p>{say("mapAvoided", 0).replace("{count}", String(data.times_postponed))}</p>
        </div>
      )}

      <Label>WHY</Label>
      <blockquote className="border-l-2 border-primary pl-3 text-sm text-muted-foreground italic">{data.why_it_matters}</blockquote>

      <p className={cn("mt-4 text-sm", data.is_overdue ? "text-destructive" : "text-muted-foreground")}>
        Due {formatDay(data.due_date)}
        {data.is_overdue && " · overdue"}
      </p>
      {data.focus_minutes > 0 && (
        <p className="mt-1 text-sm text-muted-foreground">
          {formatMinutes(data.focus_minutes)} of focus over {data.focus_sessions}{" "}
          {data.focus_sessions === 1 ? "session" : "sessions"}
        </p>
      )}

      {data.past_self_message && (
        <>
          <Label>FROM YOUR PAST SELF</Label>
          <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm">{data.past_self_message}</p>
        </>
      )}

      {parent && (
        <>
          <Label>CASE</Label>
          <NodeLinks nodes={[parent]} onSelect={onSelect} />
        </>
      )}
      {dependencies.length > 0 && (
        <>
          <Label>BLOCKED BY</Label>
          <NodeLinks nodes={dependencies} onSelect={onSelect} />
        </>
      )}
    </>
  );
}

function HabitDetails({ node, connected }: { node: Extract<GraphNode, { type: "arsenal" }>; connected: GraphNode[] }) {
  const { data } = node;
  const entries = connected.filter((item) => item.type === "intel").length;

  return (
    <>
      <Title>{data.name}</Title>
      <span className="mt-2 inline-block rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
        {CATEGORY_LABELS[data.category]}
      </span>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <dt className="text-xs text-muted-foreground">Current streak</dt>
          <dd className="mt-1 flex items-center gap-1 font-mono text-lg">
            <Flame className="size-4 text-orange-400" aria-hidden />
            {data.current_streak}
          </dd>
        </div>
        <div className="rounded-lg border border-border p-3">
          <dt className="text-xs text-muted-foreground">Best streak</dt>
          <dd className="mt-1 font-mono text-lg">{data.best_streak}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">
        {entries > 0
          ? `Correlates with ${entries} journal ${entries === 1 ? "entry" : "entries"}: done on the same day.`
          : "Not done on any day with a journal entry in this range."}
      </p>
    </>
  );
}

function IntelDetails({ node, connected }: { node: Extract<GraphNode, { type: "intel" }>; connected: GraphNode[] }) {
  const { data } = node;
  const mood = data.mood ? moodOf(data.mood) : null;
  const habits = connected.filter((item) => item.type === "arsenal").map((item) => item.label);

  return (
    <>
      <Title>{formatDay(data.date)}</Title>
      {mood && (
        <p className="mt-2 flex items-center gap-2 text-sm">
          <span aria-hidden className="text-xl">
            {mood.emoji}
          </span>
          <span style={{ color: mood.color }}>{mood.label}</span>
        </p>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border p-3">
          <dt className="text-xs text-muted-foreground">Energy</dt>
          <dd className="mt-1 font-mono text-lg">{data.energy_level ?? "–"}/10</dd>
        </div>
        <div className="rounded-lg border border-border p-3">
          <dt className="text-xs text-muted-foreground">Stress</dt>
          <dd className="mt-1 font-mono text-lg">{data.stress_level ?? "–"}/10</dd>
        </div>
      </dl>
      {data.excerpt && <p className="mt-4 text-sm text-muted-foreground">{data.excerpt}</p>}
      <Label>COMPLETED WITH</Label>
      <p className="text-sm">{habits.length > 0 ? habits.join(", ") : <span className="text-muted-foreground">No habits that day.</span>}</p>
    </>
  );
}
