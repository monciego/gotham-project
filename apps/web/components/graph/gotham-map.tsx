"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { Camera, Crosshair, Eye, Maximize, Minus, Network, Plus, Waypoints, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { NativeSelect } from "@/components/forms/native-select";
import { Switch } from "@/components/forms/switch";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { say } from "@/lib/alfred";
import { todayIso } from "@/lib/format";
import { cluster, type GraphModel, layoutGraph, NODE_TYPE_LABELS, nodeRoute, type Point, withNeighbours } from "@/lib/graph-layout";
import { useGraph } from "@/lib/graph-queries";
import type { GraphFilters, GraphNode, GraphNodeType } from "@/lib/types";
import { useGraphStore } from "@/stores/graph";
import { GraphCanvas, type GraphCanvasHandle } from "./graph-canvas";
import { NodeDetailPanel } from "./node-detail-panel";

const NODE_TYPES: GraphNodeType[] = ["case", "mission", "arsenal", "intel"];
const INTEL_DAYS = [7, 14, 30, 60];
const INTRO_KEY = "gotham-map-intro-seen";
/** NodeDetailPanel's width (max-w-80). */
const DRAWER_WIDTH = 320;

const MISSION_STATUSES: { value: GraphFilters["missionStatus"]; label: string }[] = [
  { value: "all", label: "All status" },
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

/**
 * The Gotham Map: everything in the user's life as one network, on the
 * Overview page. Filters on the left, the map in the middle, the selected
 * node's details in a drawer on the right.
 */
export function GothamMap() {
  const router = useRouter();
  const { filters, selectedId, highlighted, updateFilters, setSelected, highlight, resetHighlight } = useGraphStore();
  // Filter changes settle for 300ms before the map is fetched and laid out again.
  const debounced = useDebouncedValue(filters, 300);
  const { data, isPending, isError, refetch } = useGraph(debounced);
  const canvas = useRef<GraphCanvasHandle>(null);
  const positions = useRef<Map<string, Point> | undefined>(undefined);
  const [menu, setMenu] = useState<{ node: GraphNode; at: Point } | null>(null);
  const [intro, setIntro] = useState(false);

  // Laid out once per response; nodes that stay keep their place.
  const model = useMemo<GraphModel | null>(() => (data ? layoutGraph(data, positions.current) : null), [data]);
  useEffect(() => {
    if (model) positions.current = model.positions;
  }, [model]);

  const selected = (selectedId && model?.byId.get(selectedId)) || null;
  const isolatedMissions = model ? model.nodes.filter((node) => node.type === "mission" && model.isolated.has(node.id)) : [];
  const empty = model !== null && model.nodes.length === 0;

  // The one-time welcome, once there's something to see.
  useEffect(() => {
    if (!model || empty) return;
    try {
      if (!localStorage.getItem(INTRO_KEY)) setIntro(true);
    } catch {
      // No storage: no intro.
    }
  }, [model, empty]);

  // Escape clears the selection and any highlight.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenu(null);
      setSelected(null);
      resetHighlight();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setSelected, resetHighlight]);

  // A selection that the new filters removed closes.
  useEffect(() => {
    if (model && selectedId && !model.byId.has(selectedId)) setSelected(null);
  }, [model, selectedId, setSelected]);

  function dismissIntro() {
    setIntro(false);
    try {
      localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // As above.
    }
  }

  function select(id: string | null) {
    setMenu(null);
    setSelected(id);
    if (id === null) resetHighlight();
  }

  function selectAndCenter(id: string) {
    select(id);
    canvas.current?.centerOn(id);
  }

  function showIsolated() {
    const ids = isolatedMissions.map((node) => node.id);
    if (ids.length === 0) return;
    highlight(ids);
    canvas.current?.fit(ids);
  }

  async function exportPng() {
    const blob = await canvas.current?.toBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: `gotham-map-${todayIso()}.png` }).click();
    URL.revokeObjectURL(url);
  }

  function toggleType(type: GraphNodeType) {
    const types = filters.types.includes(type) ? filters.types.filter((item) => item !== type) : [...filters.types, type];
    updateFilters({ types });
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border lg:h-[70vh] lg:flex-row">
      {/* Filters, legend and stats. */}
      <aside className="w-full shrink-0 overflow-y-auto [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] border-b border-border bg-card p-4 lg:w-[280px] lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-lg">
            🦇
          </span>
          <h3 className="font-mono text-sm font-semibold tracking-[0.25em] text-primary">GOTHAM MAP</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{say("mapSubtitle", 0)}</p>

        <PanelHeading>SHOW / HIDE</PanelHeading>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Node types">
          {NODE_TYPES.map((type) => {
            const on = filters.types.includes(type);
            return (
              <button
                key={type}
                type="button"
                aria-pressed={on}
                onClick={() => toggleType(type)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors duration-200",
                  on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {NODE_TYPE_LABELS[type].label}
              </button>
            );
          })}
        </div>

        <PanelHeading>MISSIONS</PanelHeading>
        <NativeSelect
          aria-label="Mission status"
          value={filters.missionStatus}
          onChange={(event) => updateFilters({ missionStatus: event.target.value as GraphFilters["missionStatus"] })}
          className="w-full"
        >
          {MISSION_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
        <div className="mt-3 flex items-center justify-between gap-3">
          <label htmlFor="map-show-completed" className="text-sm">
            Show completed
          </label>
          <Switch
            id="map-show-completed"
            checked={filters.showCompleted}
            onChange={(showCompleted) => updateFilters({ showCompleted })}
          />
        </div>

        <PanelHeading>INTEL</PanelHeading>
        <div className="flex items-center justify-between text-sm">
          <span>Last {filters.intelDays} days</span>
        </div>
        <input
          type="range"
          min={0}
          max={INTEL_DAYS.length - 1}
          step={1}
          value={Math.max(0, INTEL_DAYS.indexOf(filters.intelDays))}
          onChange={(event) => updateFilters({ intelDays: INTEL_DAYS[Number(event.target.value)]! })}
          aria-label="Days of Intel"
          aria-valuetext={`${filters.intelDays} days`}
          className="mt-2 w-full accent-primary"
        />
        <div className="flex justify-between font-mono text-[0.65rem] text-muted-foreground">
          {INTEL_DAYS.map((days) => (
            <span key={days}>{days}</span>
          ))}
        </div>

        <Legend />

        <PanelHeading>STATS</PanelHeading>
        <dl className="grid gap-1.5 text-sm">
          <Stat label="Nodes" value={model?.nodes.length} />
          <Stat label="Connections" value={model?.edges.length} />
        </dl>
        <button
          type="button"
          onClick={showIsolated}
          disabled={isolatedMissions.length === 0}
          className="mt-1.5 flex w-full items-center justify-between rounded-md text-sm transition-colors enabled:hover:text-primary disabled:cursor-default"
          title={isolatedMissions.length === 0 ? say("mapNoIsolated", 0) : "Highlight them on the map"}
        >
          <span className="text-muted-foreground">Isolated missions</span>
          <span className={cn("font-mono", isolatedMissions.length > 0 && "text-destructive underline decoration-dotted")}>
            {model ? isolatedMissions.length : "–"}
          </span>
        </button>
      </aside>

      {/* The map. */}
      <div className="relative h-[60vh] min-w-0 flex-1 lg:h-auto" onClick={() => setMenu(null)}>
        {model && !empty && (
          <GraphCanvas
            ref={canvas}
            model={model}
            selectedId={selectedId}
            highlighted={highlighted}
            onSelect={select}
            onContextMenu={(node, at) => setMenu({ node, at })}
            rightInset={selected ? DRAWER_WIDTH : 0}
          />
        )}

        {isPending && (
          <div className="absolute inset-0 grid place-items-center bg-background">
            <p className="animate-pulse font-mono text-sm tracking-[0.2em] text-muted-foreground">{say("mapLoading", 0)}</p>
          </div>
        )}

        {isError && !model && (
          <div className="absolute inset-0 grid place-items-center bg-background p-6 text-center">
            <div>
              <p className="text-muted-foreground">{say("mapError", 0)}</p>
              <Button variant="outline" className="mt-3" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          </div>
        )}

        {empty && (
          <div className="absolute inset-0 grid place-items-center bg-background p-6 text-center">
            <div className="max-w-sm">
              <Network className="mx-auto size-8 text-muted-foreground" aria-hidden />
              <p className="mt-3 text-muted-foreground">
                {debounced.types.length === NODE_TYPES.length ? say("mapEmpty", 0) : say("mapFiltered", 0)}
              </p>
            </div>
          </div>
        )}

        {model && !empty && (
          <>
            <div className="absolute top-3 right-3 flex gap-1 rounded-lg border border-border bg-card/90 p-1 backdrop-blur" role="toolbar" aria-label="Map controls">
              <ToolButton label="Zoom in" onClick={() => canvas.current?.zoomBy(1.3)}>
                <Plus />
              </ToolButton>
              <ToolButton label="Zoom out" onClick={() => canvas.current?.zoomBy(1 / 1.3)}>
                <Minus />
              </ToolButton>
              <ToolButton label="Fit all nodes" onClick={() => canvas.current?.fit()}>
                <Maximize />
              </ToolButton>
              <ToolButton
                label="Center on selected"
                disabled={!selected}
                onClick={() => selected && canvas.current?.centerOn(selected.id)}
              >
                <Crosshair />
              </ToolButton>
              <ToolButton label="Export as PNG" onClick={exportPng}>
                <Camera />
              </ToolButton>
            </div>

            {highlighted.length > 0 && (
              <button
                type="button"
                onClick={resetHighlight}
                className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1 text-xs backdrop-blur hover:bg-accent"
              >
                <X className="size-3" aria-hidden />
                Clear highlight
              </button>
            )}

            {intro && (
              <div role="note" className="absolute bottom-10 left-3 max-w-xs rounded-lg border border-primary/40 bg-card/95 p-3 text-sm shadow-lg backdrop-blur">
                <p>{say("mapIntro", 0)}</p>
                <button type="button" onClick={dismissIntro} className="mt-2 text-xs text-primary hover:underline">
                  Understood, Alfred
                </button>
              </div>
            )}

            <p className="pointer-events-none absolute right-3 bottom-2 hidden text-[0.7rem] text-muted-foreground sm:block">
              Scroll to zoom · Drag to pan · Click to inspect
            </p>
          </>
        )}

        {menu && model && (
          <ContextMenu
            menu={menu}
            onView={() => router.push(nodeRoute(menu.node))}
            onHighlight={() => {
              highlight(withNeighbours(model, menu.node.id));
              setMenu(null);
            }}
            onFocusCluster={() => {
              const ids = cluster(model, menu.node.id);
              highlight(ids);
              canvas.current?.fit(ids);
              setMenu(null);
            }}
          />
        )}

        <AnimatePresence>
          {selected && model && (
            <NodeDetailPanel key={selected.id} node={selected} model={model} onSelect={selectAndCenter} onClose={() => select(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PanelHeading({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 mb-2 font-mono text-[0.65rem] tracking-[0.2em] text-muted-foreground">{children}</p>;
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono">{value ?? "–"}</dd>
    </div>
  );
}

function ToolButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button type="button" variant="ghost" size="icon-sm" aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}

function ContextMenu({
  menu,
  onView,
  onHighlight,
  onFocusCluster,
}: {
  menu: { node: GraphNode; at: Point };
  onView: () => void;
  onHighlight: () => void;
  onFocusCluster: () => void;
}) {
  const items = [
    { label: `View ${NODE_TYPE_LABELS[menu.node.type].singular.toLowerCase()}`, icon: Eye, run: onView },
    { label: "Highlight connections", icon: Waypoints, run: onHighlight },
    { label: "Focus on this cluster", icon: Crosshair, run: onFocusCluster },
  ];

  return (
    <div
      role="menu"
      aria-label={menu.node.label}
      onClick={(event) => event.stopPropagation()}
      className="absolute z-20 min-w-52 rounded-lg border border-border bg-popover p-1 shadow-xl"
      style={{ left: menu.at.x, top: menu.at.y }}
    >
      <p className="truncate px-2 py-1.5 text-xs text-muted-foreground">{menu.node.label}</p>
      {items.map(({ label, icon: Icon, run }, index) => (
        <button
          key={label}
          type="button"
          role="menuitem"
          autoFocus={index === 0}
          onClick={run}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
        >
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {label}
        </button>
      ))}
    </div>
  );
}

/** What the shapes and lines mean. Swatches are drawn the way the canvas draws them. */
function Legend() {
  const nodes = [
    { size: 16, color: "#D4AF37", label: "Cases", detail: "Projects" },
    { size: 11, color: "#3B82F6", label: "Missions", detail: "Tasks" },
    { size: 8, color: "#10B981", label: "Arsenal", detail: "Habits" },
    { size: 6, color: "#F59E0B", label: "Intel", detail: "Journal entries" },
  ];
  const edges = [
    { dash: "", color: "rgba(212,175,55,0.7)", label: "Belongs to a case" },
    { dash: "5 3", color: "#6B7280", label: "Depends on" },
    { dash: "1 3", color: "#10B981", label: "Habit and entry, same day" },
  ];
  const priorities = [
    { color: "#DC2626", label: "Critical" },
    { color: "#F97316", label: "High" },
    { color: "#3B82F6", label: "Medium" },
    { color: "#6B7280", label: "Low" },
  ];

  return (
    <>
      <PanelHeading>LEGEND</PanelHeading>
      <ul className="grid gap-1.5 text-sm">
        {nodes.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span className="grid w-5 place-items-center">
              <span className="rounded-full" style={{ width: item.size, height: item.size, backgroundColor: item.color }} />
            </span>
            {item.label} <span className="text-muted-foreground">· {item.detail}</span>
          </li>
        ))}
      </ul>
      <ul className="mt-3 grid gap-1.5 text-sm">
        {edges.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <svg width="20" height="6" aria-hidden className="shrink-0">
              <line x1="1" y1="3" x2="19" y2="3" stroke={item.color} strokeWidth="2" strokeDasharray={item.dash} strokeLinecap="round" />
            </svg>
            {item.label}
          </li>
        ))}
      </ul>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {priorities.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </li>
        ))}
      </ul>
      <ul className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <span className="size-3 shrink-0 rounded-full border-2 border-[#DC2626]" />
          Red ring: postponed 3+ times
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 shrink-0 rounded-full border border-dashed border-[#6B7280]" />
          Dashed halo: no connections
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3 shrink-0 rounded-full border-[3px] border-foreground/70 bg-[#3B82F6]" />
          Thick border: more focus time
        </li>
      </ul>
    </>
  );
}
