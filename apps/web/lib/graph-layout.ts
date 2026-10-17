import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { GraphData, GraphEdge, GraphNode } from "./types";

export type Point = { x: number; y: number };

/** A laid-out map: where each node sits, who its neighbours are, and which have none. */
export type GraphModel = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  byId: Map<string, GraphNode>;
  positions: Map<string, Point>;
  neighbours: Map<string, Set<string>>;
  isolated: Set<string>;
};

/** ForceAtlas2 stops here at the latest. */
const MAX_ITERATIONS = 500;

/** The finished layout spans this many world units, so node sizes read as pixels at zoom 1. */
const SPAN = 900;

/** Tighter pulls for structure (a mission to its case), looser for the Intel cloud. */
const EDGE_WEIGHTS: Record<GraphEdge["type"], number> = {
  belongs_to: 3,
  depends_on: 2,
  correlated: 0.6,
};

/** A stable spot from the node's id, so the same data always starts from the same layout. */
function seeded(id: string): Point {
  let hash = 2166136261;
  for (const char of id) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  const angle = ((hash >>> 0) % 3600) / 10;
  const radius = 50 + ((hash >>> 12) % 200);
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}

/**
 * Lays the map out with ForceAtlas2: nodes repel, edges attract, and
 * well-connected nodes (cases) are heavier and become cluster centres.
 * Nodes kept from `previous` start where they were, so a filter change
 * doesn't scramble the map.
 */
export function layoutGraph(data: GraphData, previous?: Map<string, Point>): GraphModel {
  const graph = new Graph({ type: "undirected", multi: false });
  const byId = new Map<string, GraphNode>();
  const neighbours = new Map<string, Set<string>>();

  for (const node of data.nodes) {
    byId.set(node.id, node);
    neighbours.set(node.id, new Set());
    graph.addNode(node.id, { ...(previous?.get(node.id) ?? seeded(node.id)), size: node.size / 2 });
  }

  const edges = data.edges.filter((edge) => byId.has(edge.source) && byId.has(edge.target));
  for (const edge of edges) {
    neighbours.get(edge.source)!.add(edge.target);
    neighbours.get(edge.target)!.add(edge.source);
    if (!graph.hasEdge(edge.source, edge.target)) {
      graph.addEdge(edge.source, edge.target, { weight: EDGE_WEIGHTS[edge.type] });
    }
  }

  if (graph.order > 1) {
    const inferred = forceAtlas2.inferSettings(graph);
    forceAtlas2.assign(graph, {
      // Big maps settle sooner; small ones get the full run.
      iterations: Math.min(MAX_ITERATIONS, Math.max(150, 30_000 / graph.order)),
      getEdgeWeight: "weight",
      settings: { ...inferred, adjustSizes: true, gravity: 1.5, scalingRatio: 12, slowDown: 2 },
    });
  }

  return {
    nodes: data.nodes,
    edges,
    byId,
    positions: normalise(graph),
    neighbours,
    isolated: new Set([...neighbours].filter(([, set]) => set.size === 0).map(([id]) => id)),
  };
}

/** Centres the layout on 0,0 and scales it to SPAN. */
function normalise(graph: Graph): Map<string, Point> {
  const points = new Map<string, Point>();
  graph.forEachNode((id, attributes) => points.set(id, { x: attributes.x as number, y: attributes.y as number }));
  if (points.size === 0) return points;

  const xs = [...points.values()].map((point) => point.x);
  const ys = [...points.values()].map((point) => point.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = SPAN / Math.max(maxX - minX, maxY - minY, 1);
  const [cx, cy] = [(minX + maxX) / 2, (minY + maxY) / 2];

  for (const [id, point] of points) {
    points.set(id, { x: (point.x - cx) * scale, y: (point.y - cy) * scale });
  }
  return points;
}

/** The node and everything one edge away. */
export function withNeighbours(model: GraphModel, id: string): string[] {
  return [id, ...(model.neighbours.get(id) ?? [])];
}

/** Everything reachable from the node: its whole cluster. */
export function cluster(model: GraphModel, id: string): string[] {
  const seen = new Set([id]);
  const queue = [id];
  while (queue.length > 0) {
    for (const next of model.neighbours.get(queue.shift()!) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return [...seen];
}

/** Where the node goes in the app. */
export function nodeRoute(node: GraphNode): string {
  const section = { case: "cases", mission: "missions", arsenal: "arsenal", intel: "intel" }[node.type];
  return `/${section}/${node.data.id}`;
}

export const NODE_TYPE_LABELS: Record<GraphNode["type"], { label: string; generic: string; singular: string }> = {
  case: { label: "Cases", generic: "Projects", singular: "Case" },
  mission: { label: "Missions", generic: "Tasks", singular: "Mission" },
  arsenal: { label: "Arsenal", generic: "Habits", singular: "Habit" },
  intel: { label: "Intel", generic: "Journal entries", singular: "Entry" },
};
