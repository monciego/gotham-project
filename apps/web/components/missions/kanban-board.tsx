"use client";

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@gotham/ui/lib/utils";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { useMoveMission } from "@/lib/mission-queries";
import type { Mission } from "@/lib/types";
import { MissionCard } from "./mission-card";

const COLUMNS = [
  { status: "not_started", title: "Not Started" },
  { status: "in_progress", title: "In Progress" },
  { status: "completed", title: "Completed" },
] as const;

type ColumnStatus = (typeof COLUMNS)[number]["status"];

function DraggableMission({ mission }: { mission: Mission }) {
  // Completing grants XP once, so completed missions stay put; reopen them from the mission page.
  const locked = mission.status === "completed";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: mission.id,
    disabled: locked,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(isDragging && "opacity-40")}
    >
      <MissionCard
        mission={mission}
        compact
        leading={
          !locked && (
            <button
              type="button"
              aria-label={`Move ${mission.title}`}
              className="relative z-10 -ml-1 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:text-foreground active:cursor-grabbing"
              {...listeners}
              {...attributes}
            >
              <GripVertical className="size-4" aria-hidden />
            </button>
          )
        }
      />
    </div>
  );
}

function Column({ status, title, missions }: { status: ColumnStatus; title: string; missions: Mission[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      aria-label={title}
      className={cn(
        "flex min-h-64 flex-col gap-3 rounded-xl border border-border bg-card/40 p-3 transition-colors duration-200",
        isOver && "border-primary/60 bg-primary/5",
      )}
    >
      <h2 className="flex items-center justify-between px-1 font-mono text-xs font-semibold tracking-[0.2em] text-muted-foreground">
        {title.toUpperCase()}
        <span>{missions.length}</span>
      </h2>
      {missions.map((mission) => (
        <DraggableMission key={mission.id} mission={mission} />
      ))}
    </section>
  );
}

export function KanbanBoard({ missions }: { missions: Mission[] }) {
  const move = useMoveMission();
  const [active, setActive] = useState<Mission | null>(null);
  const sensors = useSensors(
    // A few pixels of movement before dragging starts, so clicks still open the card.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart({ active: dragged }: DragStartEvent) {
    setActive(missions.find((mission) => mission.id === dragged.id) ?? null);
  }

  function handleDragEnd({ active: dragged, over }: DragEndEvent) {
    setActive(null);
    const mission = missions.find((item) => item.id === dragged.id);
    const to = over?.id as ColumnStatus | undefined;
    if (mission && to && to !== mission.status) {
      move.mutate({ id: mission.id, to });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActive(null)}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map(({ status, title }) => (
          <Column
            key={status}
            status={status}
            title={title}
            missions={missions.filter((mission) => mission.status === status)}
          />
        ))}
      </div>
      <DragOverlay>{active && <MissionCard mission={active} compact />}</DragOverlay>
    </DndContext>
  );
}
