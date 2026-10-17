import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { ApiEnvelope, GraphData, GraphFilters } from "./types";

export const graphKeys = {
  all: ["graph"] as const,
  filtered: (filters: GraphFilters) => ["graph", filters] as const,
};

/** The query string for GET /graph. Axios sends arrays as `types[]=…`, which Laravel reads. */
function params(filters: GraphFilters) {
  return {
    types: filters.types,
    ...(filters.missionStatus !== "all" && { status: [filters.missionStatus] }),
    show_completed: filters.showCompleted ? 1 : 0,
    days: filters.intelDays,
  };
}

/** The Gotham Map for these filters. The previous map stays up while the next one loads. */
export function useGraph(filters: GraphFilters) {
  return useQuery({
    queryKey: graphKeys.filtered(filters),
    queryFn: async () => (await api.get<ApiEnvelope<GraphData>>("/graph", { params: params(filters) })).data.data,
    placeholderData: keepPreviousData,
  });
}
