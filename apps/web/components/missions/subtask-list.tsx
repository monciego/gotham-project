"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@gotham/ui/components/ui/button";
import { Input } from "@gotham/ui/components/ui/input";
import { cn } from "@gotham/ui/lib/utils";
import { Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { SectionCard } from "@/components/section-card";
import {
  useAddSubtask,
  useDeleteSubtask,
  useReorderSubtasks,
  useUpdateSubtask,
} from "@/lib/mission-queries";
import type { Subtask } from "@/lib/types";

type RowProps = {
  subtask: Subtask;
  onToggle: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
};

function SubtaskRow({ subtask, onToggle, onRename, onDelete }: RowProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(subtask.title);
  // Negative ids are optimistic placeholders the server hasn't saved yet.
  const saved = subtask.id > 0;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: subtask.id,
    disabled: !saved,
  });

  function finishEditing() {
    setEditing(false);
    const trimmed = title.trim();
    if (trimmed && trimmed !== subtask.title) {
      onRename(trimmed);
    } else {
      setTitle(subtask.title);
    }
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("group flex items-center gap-2 rounded-lg py-1.5 pr-1", isDragging && "relative z-10 bg-accent")}
    >
      <button
        type="button"
        aria-label={`Reorder ${subtask.title}`}
        className="cursor-grab touch-none rounded p-0.5 text-muted-foreground opacity-60 group-hover:opacity-100 active:cursor-grabbing"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        role="checkbox"
        aria-checked={subtask.completed}
        aria-label={subtask.title}
        disabled={!saved}
        onClick={onToggle}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded border transition-colors duration-200",
          subtask.completed ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50 hover:border-primary",
        )}
      >
        {subtask.completed && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
      </button>

      {editing ? (
        <Input
          autoFocus
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={finishEditing}
          onKeyDown={(event) => {
            if (event.key === "Enter") finishEditing();
            if (event.key === "Escape") {
              setTitle(subtask.title);
              setEditing(false);
            }
          }}
          aria-label="Subtask title"
          className="h-7 flex-1"
        />
      ) : (
        <button
          type="button"
          onClick={() => saved && setEditing(true)}
          title="Click to rename"
          className={cn(
            "min-w-0 flex-1 truncate text-left text-sm",
            subtask.completed && "text-muted-foreground line-through",
          )}
        >
          {subtask.title}
        </button>
      )}

      <button
        type="button"
        onClick={onDelete}
        disabled={!saved}
        aria-label={`Delete ${subtask.title}`}
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </li>
  );
}

export function SubtaskList({ missionId, subtasks }: { missionId: number; subtasks: Subtask[] }) {
  const add = useAddSubtask(missionId);
  const update = useUpdateSubtask(missionId);
  const remove = useDeleteSubtask(missionId);
  const reorder = useReorderSubtasks(missionId);
  const [draft, setDraft] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sorted = [...subtasks].sort((a, b) => a.order - b.order || a.id - b.id);
  const done = sorted.filter((subtask) => subtask.completed).length;
  const percent = sorted.length ? Math.round((done / sorted.length) * 100) : 0;

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = sorted.map((subtask) => subtask.id).filter((id) => id > 0);
    reorder.mutate(arrayMove(ids, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id))));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (title) {
      add.mutate(title);
      setDraft("");
    }
  }

  return (
    <SectionCard
      title="SUBTASKS"
      action={
        sorted.length > 0 && (
          <span className="font-mono text-xs text-muted-foreground">
            {done}/{sorted.length} · {percent}%
          </span>
        )
      }
    >
      {sorted.length > 0 && (
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map((subtask) => subtask.id)} strategy={verticalListSortingStrategy}>
          <ul className="-ml-1">
            {sorted.map((subtask) => (
              <SubtaskRow
                key={subtask.id}
                subtask={subtask}
                onToggle={() => update.mutate({ id: subtask.id, completed: !subtask.completed })}
                onRename={(title) => update.mutate({ id: subtask.id, title })}
                onDelete={() => remove.mutate(subtask.id)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {(add.isError || update.isError || remove.isError || reorder.isError) && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          That didn&apos;t save, sir. I&apos;ve put things back as they were.
        </p>
      )}

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a step"
          aria-label="New subtask"
          maxLength={255}
        />
        <Button type="submit" variant="outline" disabled={!draft.trim()}>
          <Plus aria-hidden />
          Add
        </Button>
      </form>
    </SectionCard>
  );
}
