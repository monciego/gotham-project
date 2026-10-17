import { type QueryClient, keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAlfredStore } from "@/stores/alfred";
import { api } from "./api";
import { missionKeys } from "./mission-queries";
import { queryKeys } from "./queries";
import type { ApiEnvelope, CalendarEntry, OperationInput } from "./types";

export type CalendarRange = { start: string; end: string };

export const operationKeys = {
  all: ["operations"] as const,
  range: (range: CalendarRange) => ["operations", "range", range.start, range.end] as const,
};

/** Everything on the calendar in the visible range. */
export function useOperations(range: CalendarRange | null) {
  return useQuery({
    queryKey: operationKeys.range(range ?? { start: "", end: "" }),
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<CalendarEntry[]>>("/operations", { params: range! });
      return data.data;
    },
    enabled: range !== null,
    placeholderData: keepPreviousData,
  });
}

type Snapshot = [readonly unknown[], CalendarEntry[] | undefined][];

/** Changes cached entries in every visible range; returns what to restore on error. */
async function patchEntries(
  queryClient: QueryClient,
  update: (entries: CalendarEntry[]) => CalendarEntry[],
): Promise<Snapshot> {
  await queryClient.cancelQueries({ queryKey: operationKeys.all });
  const snapshot = queryClient.getQueriesData<CalendarEntry[]>({ queryKey: operationKeys.all });
  queryClient.setQueriesData<CalendarEntry[]>({ queryKey: operationKeys.all }, (entries) => entries && update(entries));
  return snapshot;
}

function restore(queryClient: QueryClient, snapshot?: Snapshot) {
  snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

/** Linked missions take their due time from the calendar. */
function refresh(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: operationKeys.all });
  void queryClient.invalidateQueries({ queryKey: missionKeys.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
}

export function useSaveOperation(id?: number | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OperationInput) => {
      const { data } = id
        ? await api.put<ApiEnvelope<CalendarEntry>>(`/operations/${id}`, input)
        : await api.post<ApiEnvelope<CalendarEntry>>("/operations", input);
      return data.data;
    },
    onSettled: () => refresh(queryClient),
  });
}

/**
 * Drag and resize. New times are for the series, so a recurring event moves
 * as a whole. One-off events move in the cache at once.
 */
export function useMoveOperation() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { entry: CalendarEntry; start: string; end: string; display: { start: string; end: string } }, { snapshot?: Snapshot }>({
    mutationFn: ({ entry, start, end }) =>
      api.put(`/operations/${entry.operation_id}`, { all_day: entry.all_day, start, end }),
    onMutate: async ({ entry, display }) => ({
      snapshot: entry.recurring
        ? undefined
        : await patchEntries(queryClient, (entries) =>
            entries.map((item) => (item.id === entry.id ? { ...item, ...display, series_start: display.start, series_end: display.end } : item)),
          ),
    }),
    onError: (error, _variables, context) => {
      restore(queryClient, context?.snapshot);
      useAlfredStore.getState().say({ mood: "concerned", title: "That didn't move, sir.", message: error.message });
    },
    onSettled: () => refresh(queryClient),
  });
}

export function useDeleteOperation() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, number, { snapshot: Snapshot }>({
    mutationFn: (id) => api.delete(`/operations/${id}`),
    onMutate: async (id) => ({
      snapshot: await patchEntries(queryClient, (entries) => entries.filter((entry) => entry.operation_id !== id)),
    }),
    onError: (_error, _id, context) => restore(queryClient, context?.snapshot),
    onSettled: () => refresh(queryClient),
  });
}

/** A 2-hour focus block at Alfred's suggested time. */
export function useFocusBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { date?: string; mission_id?: number | null } = {}) => {
      const { data } = await api.post<ApiEnvelope<{ operation: CalendarEntry; reason: string; moved: boolean }>>("/operations/focus-block", input);
      return { ...data.data, message: data.message };
    },
    onSuccess: ({ message }) =>
      useAlfredStore.getState().say({ mood: "encouraging", title: "Focus block set, sir.", message }),
    onSettled: () => refresh(queryClient),
  });
}
