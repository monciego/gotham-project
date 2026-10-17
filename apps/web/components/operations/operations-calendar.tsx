"use client";

import type { DateSelectArg, DatesSetArg, EventClickArg, EventDropArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type EventResizeDoneArg } from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Button } from "@gotham/ui/components/ui/button";
import { Loader2, Plus, Target } from "lucide-react";
import { useRef, useState } from "react";
import { type CalendarRange, useFocusBlock, useMoveOperation, useOperations } from "@/lib/operation-queries";
import type { CalendarEntry } from "@/lib/types";
import { EventPopover } from "./event-popover";
import { type DialogInitial, OperationDialog } from "./operation-dialog";
import { addDays, entryColor } from "./operation-meta";

const DAY_MS = 86_400_000;

/** Whole days from one "YYYY-MM-DD…" to another. */
function dayDiff(from: string, to: string): number {
  return Math.round((Date.parse(`${to.slice(0, 10)}T00:00:00Z`) - Date.parse(`${from.slice(0, 10)}T00:00:00Z`)) / DAY_MS);
}

function toEvent(entry: CalendarEntry): EventInput {
  const color = entryColor(entry);

  return {
    id: entry.id,
    title: entry.title,
    start: entry.start,
    end: entry.end,
    allDay: entry.all_day,
    // A tint of the color, with the color itself as the edge (and the dot in month view).
    backgroundColor: `${color}${entry.kind === "focus_block" ? "40" : "2e"}`,
    borderColor: color,
    textColor: "#ededed",
    classNames: entry.kind === "focus_block" ? ["fc-focus-block"] : [],
    editable: entry.editable,
    // Habits sort after events on a day (see eventOrder).
    extendedProps: { entry, order: entry.kind === "habit" ? 1 : 0 },
  };
}

export function OperationsCalendar({ initialDate }: { initialDate?: string }) {
  const calendar = useRef<FullCalendar>(null);
  const [range, setRange] = useState<CalendarRange | null>(null);
  const [view, setView] = useState("dayGridMonth");
  const [dialog, setDialog] = useState<DialogInitial | null>(null);
  const [popover, setPopover] = useState<{ entry: CalendarEntry; anchor: { x: number; y: number } } | null>(null);
  const { data: entries, isFetching } = useOperations(range);
  const move = useMoveOperation();
  const focusBlock = useFocusBlock();

  function onDatesSet(info: DatesSetArg) {
    setRange({ start: info.startStr, end: info.endStr });
    setView(info.view.type);
  }

  function onSelect(info: DateSelectArg) {
    info.view.calendar.unselect();
    setPopover(null);
    // A day picked in month view means a timed event that day, not an all-day one.
    const monthDay = info.allDay && info.view.type === "dayGridMonth" && dayDiff(info.startStr, info.endStr) === 1;
    if (monthDay) {
      const start = new Date(info.start);
      start.setHours(9, 0, 0, 0);
      setDialog({ start, end: new Date(start.getTime() + 60 * 60_000) });
    } else {
      setDialog({ start: info.start, end: info.end, allDay: info.allDay });
    }
  }

  function onEventClick(info: EventClickArg) {
    info.jsEvent.preventDefault();
    setPopover({ entry: info.event.extendedProps.entry as CalendarEntry, anchor: { x: info.jsEvent.clientX, y: info.jsEvent.clientY } });
  }

  /** Drag or resize: the series moves by the same amount, and takes the new length. */
  function onMove(info: EventDropArg | EventResizeDoneArg) {
    const entry = info.event.extendedProps.entry as CalendarEntry;
    const { event, oldEvent } = info;
    if (!event.start || !oldEvent.start || entry.operation_id === null) {
      info.revert();
      return;
    }

    let start: string;
    let end: string;
    let display: { start: string; end: string };

    if (entry.all_day) {
      const length = event.endStr ? dayDiff(event.startStr, event.endStr) : 1;
      start = addDays(entry.series_start ?? entry.start, dayDiff(oldEvent.startStr, event.startStr));
      end = addDays(start, length);
      display = { start: event.startStr.slice(0, 10), end: addDays(event.startStr.slice(0, 10), length) };
    } else {
      const length = (event.end ?? new Date(event.start.getTime() + 60 * 60_000)).getTime() - event.start.getTime();
      const seriesStart = new Date(Date.parse(entry.series_start ?? entry.start) + event.start.getTime() - oldEvent.start.getTime());
      start = seriesStart.toISOString();
      end = new Date(seriesStart.getTime() + length).toISOString();
      display = { start: event.start.toISOString(), end: new Date(event.start.getTime() + length).toISOString() };
    }

    move.mutate({ entry, start, end, display }, { onError: () => info.revert() });
  }

  function blockFocusTime() {
    focusBlock.mutate(
      {},
      {
        onSuccess: ({ operation }) => {
          const api = calendar.current?.getApi();
          const start = new Date(operation.start);
          api?.gotoDate(start);
          // In week and day views, bring it into sight (an hour of context above).
          api?.scrollToTime(`${String(Math.max(0, start.getHours() - 1)).padStart(2, "0")}:00:00`);
        },
      },
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          Operations
          {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setDialog({})}>
            <Plus aria-hidden />
            New Event
          </Button>
          <Button onClick={blockFocusTime} disabled={focusBlock.isPending}>
            {focusBlock.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Target aria-hidden />}
            Block Focus Time
          </Button>
        </div>
      </div>
      {focusBlock.isError && <p className="text-sm text-destructive">{focusBlock.error.message}</p>}

      <div className="gotham-calendar rounded-xl border border-border bg-card p-3 md:p-4">
        <FullCalendar
          ref={calendar}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={initialDate}
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" }}
          buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day", list: "Agenda" }}
          events={entries?.map(toEvent) ?? []}
          datesSet={onDatesSet}
          selectable
          select={onSelect}
          eventClick={onEventClick}
          editable
          eventDrop={onMove}
          eventResize={onMove}
          // All-day and timed are different shapes; dragging between them isn't supported.
          eventAllow={(drop, dragged) => drop.allDay === dragged?.allDay}
          forceEventDuration
          nowIndicator
          // With height "auto", `true` wouldn't limit anything; a busy day shows 3 and "+N more".
          dayMaxEvents={3}
          eventOrder="order,start,-duration,allDay,title"
          // Week and day show all 24 hours in a scrolling grid, opened at 07:00.
          height={view.startsWith("timeGrid") ? 720 : "auto"}
          scrollTime="07:00:00"
          eventTimeFormat={{ hour: "numeric", minute: "2-digit", meridiem: "short" }}
          noEventsText="Nothing scheduled, sir."
        />
      </div>

      {popover && (
        <EventPopover
          entry={popover.entry}
          anchor={popover.anchor}
          onClose={() => setPopover(null)}
          onEdit={() => {
            setDialog({ entry: popover.entry });
            setPopover(null);
          }}
        />
      )}

      <OperationDialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)} initial={dialog ?? {}} />
    </div>
  );
}
