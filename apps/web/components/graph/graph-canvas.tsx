"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { GraphModel, Point } from "@/lib/graph-layout";
import type { GraphEdge, GraphNode } from "@/lib/types";

/** What the toolbar and side panel can ask of the canvas. */
export type GraphCanvasHandle = {
  zoomBy: (factor: number) => void;
  /** Fits these nodes in view, or every node. */
  fit: (ids?: string[]) => void;
  centerOn: (id: string) => void;
  /** The map as it looks now, as a PNG. */
  toBlob: () => Promise<Blob | null>;
};

type GraphCanvasProps = {
  model: GraphModel;
  selectedId: string | null;
  /** Lit up while everything else dims (empty: none). Hovering a node does the same for it and its neighbours. */
  highlighted: string[];
  onSelect: (id: string | null) => void;
  onContextMenu: (node: GraphNode, at: Point) => void;
  /** Pixels on the right covered by the detail drawer: fitting and centring keep clear of them. */
  rightInset?: number;
  ref?: React.Ref<GraphCanvasHandle>;
};

type Camera = { x: number; y: number; k: number };

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 6;
/** Labels for every node appear from this zoom; before it, only cases and the nodes in focus. */
const LABEL_ZOOM = 1.6;
const DIM_ALPHA = 0.2;
const POSTPONED_RING = "#DC2626";
const PULSE_MS = 1600;
const FADE_IN_MS = 300;
const CAMERA_MS = 250;

const EDGE_STYLES: Record<GraphEdge["type"], { color: string; dash: number[]; width: number }> = {
  belongs_to: { color: "rgba(212, 175, 55, 0.4)", dash: [], width: 1.5 },
  depends_on: { color: "#6B7280", dash: [6, 4], width: 1.25 },
  correlated: { color: "rgba(16, 185, 129, 0.6)", dash: [1, 4], width: 1.25 },
};

function radius(node: GraphNode): number {
  return node.size / 2;
}

/** On screen, nodes scale with the zoom but never shrink past 70% or grow past 250%, so they stay readable. */
function screenRadius(node: GraphNode, k: number): number {
  return radius(node) * Math.min(Math.max(k, 0.7), 2.5);
}

function postponed(node: GraphNode): boolean {
  return node.type === "mission" && node.times_postponed >= 3;
}

/** The pointer's position within the canvas. */
function relative(canvas: HTMLCanvasElement, event: { clientX: number; clientY: number }): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function ease(t: number): number {
  return 1 - (1 - t) ** 3;
}

/**
 * The Gotham Map, drawn on a canvas: dashed and dotted edges, pulsing rings
 * on avoided missions and focus time as border weight. Scroll zooms, drag
 * pans, a click selects, a double click on empty space fits everything.
 */
export function GraphCanvas({ model, selectedId, highlighted, onSelect, onContextMenu, rightInset = 0, ref }: GraphCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camera = useRef<Camera>({ x: 0, y: 0, k: 1 });
  const cameraTween = useRef<{ from: Camera; to: Camera; start: number } | null>(null);
  const size = useRef({ width: 0, height: 0 });
  const frame = useRef(0);
  const shownAt = useRef(0);
  const drag = useRef<{ start: Point; camera: Camera; moved: boolean } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const inset = useRef(rightInset);
  inset.current = rightInset;

  // The latest props, for the draw loop.
  const state = useRef({ model, selectedId, highlighted, hovered, reduceMotion });
  state.current = { model, selectedId, highlighted, hovered, reduceMotion };

  const toScreen = useCallback((point: Point): Point => {
    const { x, y, k } = camera.current;
    return { x: (point.x - x) * k + size.current.width / 2, y: (point.y - y) * k + size.current.height / 2 };
  }, []);

  const toWorld = useCallback((point: Point): Point => {
    const { x, y, k } = camera.current;
    return { x: (point.x - size.current.width / 2) / k + x, y: (point.y - size.current.height / 2) / k + y };
  }, []);

  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return false;

      const { model, selectedId, highlighted, hovered, reduceMotion } = state.current;
      let animating = false;

      const tween = cameraTween.current;
      if (tween) {
        const t = reduceMotion ? 1 : Math.min(1, (now - tween.start) / CAMERA_MS);
        const e = ease(t);
        camera.current = {
          x: tween.from.x + (tween.to.x - tween.from.x) * e,
          y: tween.from.y + (tween.to.y - tween.from.y) * e,
          k: tween.from.k + (tween.to.k - tween.from.k) * e,
        };
        if (t < 1) animating = true;
        else cameraTween.current = null;
      }

      const fade = reduceMotion ? 1 : Math.min(1, (now - shownAt.current) / FADE_IN_MS);
      if (fade < 1) animating = true;

      const styles = getComputedStyle(document.documentElement);
      const background = styles.getPropertyValue("--background").trim() || "#0a0a0a";
      const foreground = styles.getPropertyValue("--foreground").trim() || "#ededed";
      // next/font renames Inter, so take the family the page actually uses.
      const fontFamily = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
      const { width, height } = size.current;
      const dpr = window.devicePixelRatio || 1;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      // What's in focus: an explicit highlight, else the hovered node and its neighbours.
      const focus = highlighted.length > 0
        ? new Set(highlighted)
        : hovered
          ? new Set([hovered, ...(model.neighbours.get(hovered) ?? [])])
          : null;
      const k = camera.current.k;

      for (const edge of model.edges) {
        const from = model.positions.get(edge.source);
        const to = model.positions.get(edge.target);
        if (!from || !to) continue;
        const style = EDGE_STYLES[edge.type];
        const lit = !focus || (focus.has(edge.source) && focus.has(edge.target));
        const a = toScreen(from);
        const b = toScreen(to);

        context.globalAlpha = fade * (lit ? 1 : DIM_ALPHA);
        context.strokeStyle = style.color;
        context.lineWidth = style.width;
        context.lineCap = "round";
        context.setLineDash(style.dash);
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();

        // depends_on points at the mission it waits on.
        if (edge.type === "depends_on") {
          const target = model.byId.get(edge.target)!;
          const angle = Math.atan2(b.y - a.y, b.x - a.x);
          const reach = screenRadius(target, k) + 3;
          const tip = { x: b.x - Math.cos(angle) * reach, y: b.y - Math.sin(angle) * reach };
          context.setLineDash([]);
          context.fillStyle = style.color;
          context.beginPath();
          context.moveTo(tip.x, tip.y);
          context.lineTo(tip.x - Math.cos(angle - 0.4) * 8, tip.y - Math.sin(angle - 0.4) * 8);
          context.lineTo(tip.x - Math.cos(angle + 0.4) * 8, tip.y - Math.sin(angle + 0.4) * 8);
          context.closePath();
          context.fill();
        }
      }
      context.setLineDash([]);

      const pulse = reduceMotion ? 0.5 : (now % PULSE_MS) / PULSE_MS;
      const labels: { text: string; x: number; y: number; alpha: number; bold: boolean }[] = [];

      for (const node of model.nodes) {
        const position = model.positions.get(node.id);
        if (!position) continue;
        const { x, y } = toScreen(position);
        const r = screenRadius(node, k);
        if (x < -r - 40 || y < -r - 40 || x > width + r + 40 || y > height + r + 60) continue;

        const lit = !focus || focus.has(node.id);
        const base = fade * (lit ? 1 : DIM_ALPHA);
        const muted = node.type === "mission" && node.status === "completed" ? 0.5 : node.type === "intel" ? 0.85 : 1;

        // Avoided missions: a red ring that keeps pulsing outward (static with reduced motion).
        if (postponed(node)) {
          if (!reduceMotion) animating = true;
          context.globalAlpha = base * (1 - pulse) * 0.9;
          context.strokeStyle = POSTPONED_RING;
          context.lineWidth = 2;
          context.beginPath();
          context.arc(x, y, r + 3 + pulse * 9, 0, Math.PI * 2);
          context.stroke();
        }

        // Isolated: a faint dashed halo.
        if (model.isolated.has(node.id)) {
          context.globalAlpha = base * 0.6;
          context.strokeStyle = "#6B7280";
          context.lineWidth = 1;
          context.setLineDash([3, 3]);
          context.beginPath();
          context.arc(x, y, r + 6, 0, Math.PI * 2);
          context.stroke();
          context.setLineDash([]);
        }

        context.globalAlpha = base * muted;
        context.fillStyle = node.color;
        context.beginPath();
        context.arc(x, y, r, 0, Math.PI * 2);
        context.fill();

        // Borders: cases a darker rim; missions thicker the more focus time they've had.
        const border =
          node.type === "case"
            ? { width: Math.max(2, 3 * k), color: "rgba(0, 0, 0, 0.45)" }
            : node.type === "mission" && node.focus_minutes > 0
              ? { width: Math.min(1 + node.focus_minutes / 25, 5), color: foreground }
              : null;
        if (border) {
          context.globalAlpha = base * (node.type === "mission" ? 0.7 : 1);
          context.strokeStyle = border.color;
          context.lineWidth = border.width;
          context.beginPath();
          context.arc(x, y, r - border.width / 2, 0, Math.PI * 2);
          context.stroke();
        }

        if (node.id === selectedId) {
          context.globalAlpha = fade;
          context.strokeStyle = foreground;
          context.lineWidth = 2;
          context.beginPath();
          context.arc(x, y, r + 4, 0, Math.PI * 2);
          context.stroke();
        }

        const inFocus = node.id === hovered || node.id === selectedId || (focus?.has(node.id) ?? false);
        if (node.type === "case" || inFocus || k >= LABEL_ZOOM) {
          labels.push({ text: node.label, x, y: y + r + 13, alpha: base, bold: node.type === "case" || node.id === hovered });
        }
      }

      // Labels last, so no node covers them.
      context.textAlign = "center";
      context.fillStyle = foreground;
      for (const label of labels) {
        context.globalAlpha = label.alpha;
        context.font = `${label.bold ? 600 : 400} 11px ${fontFamily}`;
        const text = label.text.length > 32 ? `${label.text.slice(0, 31)}…` : label.text;
        context.fillText(text, label.x, label.y);
      }
      context.globalAlpha = 1;

      return animating;
    },
    [toScreen],
  );

  const requestDraw = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(function tick(now) {
      frame.current = 0;
      if (draw(now)) frame.current = requestAnimationFrame(tick);
    });
  }, [draw]);

  const bounds = useCallback(
    (ids?: string[]) => {
      const points = (ids ?? [...model.positions.keys()])
        .map((id) => ({ point: model.positions.get(id), node: model.byId.get(id) }))
        .filter((item): item is { point: Point; node: GraphNode } => !!item.point && !!item.node);
      if (points.length === 0) return null;
      const pad = (item: { node: GraphNode }) => radius(item.node) + 30;
      return {
        minX: Math.min(...points.map((item) => item.point.x - pad(item))),
        maxX: Math.max(...points.map((item) => item.point.x + pad(item))),
        minY: Math.min(...points.map((item) => item.point.y - pad(item))),
        maxY: Math.max(...points.map((item) => item.point.y + pad(item))),
      };
    },
    [model],
  );

  const moveCamera = useCallback(
    (to: Camera, animate = true) => {
      const target = { ...to, k: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, to.k)) };
      if (animate) {
        cameraTween.current = { from: camera.current, to: target, start: performance.now() };
      } else {
        cameraTween.current = null;
        camera.current = target;
      }
      requestDraw();
    },
    [requestDraw],
  );

  const fit = useCallback(
    (ids?: string[], animate = true) => {
      const box = bounds(ids);
      const { width, height } = size.current;
      // The visible part: the canvas minus the drawer, when it leaves enough room.
      const covered = width - inset.current > 200 ? inset.current : 0;
      if (!box || width === 0) return;
      const k = Math.min((width - covered) / (box.maxX - box.minX), height / (box.maxY - box.minY), 2.5);
      moveCamera({ x: (box.minX + box.maxX) / 2 + covered / 2 / k, y: (box.minY + box.maxY) / 2, k }, animate);
    },
    [bounds, moveCamera],
  );

  useImperativeHandle(
    ref,
    () => ({
      zoomBy: (factor) => moveCamera({ ...camera.current, k: camera.current.k * factor }),
      fit: (ids) => fit(ids),
      centerOn: (id) => {
        const point = model.positions.get(id);
        if (!point) return;
        const k = Math.max(camera.current.k, 1.4);
        const covered = size.current.width - inset.current > 200 ? inset.current : 0;
        moveCamera({ x: point.x + covered / 2 / k, y: point.y, k });
      },
      toBlob: () =>
        new Promise((resolve) => {
          draw(performance.now());
          if (canvasRef.current) canvasRef.current.toBlob(resolve, "image/png");
          else resolve(null);
        }),
    }),
    [draw, fit, model, moveCamera],
  );

  // Size the canvas to its box, in device pixels.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      const first = size.current.width === 0;
      size.current = { width, height };
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      if (first) fit(undefined, false);
      requestDraw();
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [fit, requestDraw]);

  // A new layout fades in and is fitted to the view.
  useEffect(() => {
    shownAt.current = performance.now();
    fit(undefined, false);
  }, [model, fit]);

  useEffect(() => {
    requestDraw();
  }, [selectedId, highlighted, hovered, reduceMotion, requestDraw]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      // Reset, so a remount (React runs effects twice in development) can schedule again.
      frame.current = 0;
    },
    [],
  );

  function nodeAt(screen: Point): GraphNode | null {
    const world = toWorld(screen);
    const k = camera.current.k;
    let found: GraphNode | null = null;
    let best = Infinity;
    for (const node of model.nodes) {
      const point = model.positions.get(node.id);
      if (!point) continue;
      const distance = Math.hypot(point.x - world.x, point.y - world.y) * k;
      if (distance <= Math.max(screenRadius(node, k), 5) + 3 && distance < best) {
        best = distance;
        found = node;
      }
    }
    return found;
  }

  // Scroll zooms around the cursor. Not a React handler: it must be non-passive to stop the page scrolling.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const at = relative(canvas!, event);
      const before = toWorld(at);
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.current.k * Math.exp(-event.deltaY * 0.0015)));
      camera.current = { k, x: before.x - (at.x - size.current.width / 2) / k, y: before.y - (at.y - size.current.height / 2) / k };
      cameraTween.current = null;
      requestDraw();
    }
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [requestDraw, toWorld]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Gotham Map: ${model.nodes.length} nodes and ${model.edges.length} connections`}
      // Pinned to the container: its own pixel size must never feed back into its layout size.
      className="absolute inset-0 block size-full touch-none select-none"
      style={{ cursor: drag.current?.moved ? "grabbing" : hovered ? "pointer" : "grab" }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { start: relative(event.currentTarget, event), camera: camera.current, moved: false };
      }}
      onPointerMove={(event) => {
        const at = relative(event.currentTarget, event);
        const current = drag.current;
        if (current) {
          const dx = at.x - current.start.x;
          const dy = at.y - current.start.y;
          if (!current.moved && Math.hypot(dx, dy) < 4) return;
          current.moved = true;
          cameraTween.current = null;
          camera.current = { ...current.camera, x: current.camera.x - dx / current.camera.k, y: current.camera.y - dy / current.camera.k };
          requestDraw();
          return;
        }
        const node = nodeAt(at);
        if ((node?.id ?? null) !== hovered) setHovered(node?.id ?? null);
      }}
      onPointerUp={(event) => {
        const current = drag.current;
        drag.current = null;
        if (current && !current.moved) onSelect(nodeAt(relative(event.currentTarget, event))?.id ?? null);
      }}
      onPointerLeave={() => setHovered(null)}
      onDoubleClick={(event) => {
        if (!nodeAt(relative(event.currentTarget, event))) fit();
      }}
      onContextMenu={(event) => {
        const node = nodeAt(relative(event.currentTarget, event));
        if (!node) return;
        event.preventDefault();
        onContextMenu(node, relative(event.currentTarget, event));
      }}
    />
  );
}
