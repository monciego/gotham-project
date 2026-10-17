import { create } from "zustand";
import type { GraphFilters } from "@/lib/types";

export const DEFAULT_GRAPH_FILTERS: GraphFilters = {
  types: ["case", "mission", "arsenal", "intel"],
  missionStatus: "all",
  showCompleted: false,
  intelDays: 30,
};

/**
 * The Gotham Map's view state. The graph itself is server state
 * (lib/graph-queries.ts), fetched for these filters.
 */
type GraphState = {
  filters: GraphFilters;
  /** The node whose details are open. */
  selectedId: string | null;
  /** Nodes lit up while everything else dims; empty means nothing is. */
  highlighted: string[];
  updateFilters: (changes: Partial<GraphFilters>) => void;
  setSelected: (id: string | null) => void;
  highlight: (ids: string[]) => void;
  resetHighlight: () => void;
};

export const useGraphStore = create<GraphState>()((set) => ({
  filters: DEFAULT_GRAPH_FILTERS,
  selectedId: null,
  highlighted: [],
  updateFilters: (changes) => set((state) => ({ filters: { ...state.filters, ...changes } })),
  setSelected: (selectedId) => set({ selectedId }),
  highlight: (highlighted) => set({ highlighted }),
  resetHighlight: () => set({ highlighted: [] }),
}));
