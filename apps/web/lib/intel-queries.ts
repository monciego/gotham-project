import {
  type InfiniteData,
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "./api";
import { queryKeys } from "./queries";
import type {
  ApiEnvelope,
  IntelDetail,
  IntelEntry,
  IntelFiled,
  IntelInput,
  IntelInsights,
  IntelMood,
  IntelPrompt,
  Paginated,
} from "./types";

export type IntelFilters = { search: string; mood: IntelMood | "" };

export const intelKeys = {
  all: ["intel"] as const,
  lists: () => ["intel", "list"] as const,
  list: (params: Record<string, string>) => ["intel", "list", params] as const,
  detail: (id: number) => ["intel", "detail", id] as const,
  prompt: () => ["intel", "prompt"] as const,
  insights: () => ["intel", "insights"] as const,
};

async function get<T>(url: string, params?: Record<string, string | number>): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(url, { params });
  return data.data;
}

/** Drops empty filters so equivalent lists share a cache entry. */
function params(filters: IntelFilters, extra: Record<string, string> = {}): Record<string, string> {
  return Object.fromEntries(Object.entries({ ...filters, ...extra }).filter(([, value]) => value !== ""));
}

/** Newest first, 20 at a time. */
export function useIntelList(filters: IntelFilters) {
  const query = params(filters);

  return useInfiniteQuery({
    queryKey: intelKeys.list(query),
    queryFn: ({ pageParam }) => get<Paginated<IntelEntry>>("/intel", { ...query, page: pageParam, per_page: 20 }),
    initialPageParam: 1,
    getNextPageParam: ({ meta }) => (meta.current_page < meta.last_page ? meta.current_page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

/** Every entry in a month (YYYY-MM), for the calendar. */
export function useIntelMonth(month: string, filters: IntelFilters) {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const query = params(filters, { from: `${month}-01`, to: `${month}-${lastDay}`, per_page: "31" });

  return useQuery({
    queryKey: intelKeys.list(query),
    queryFn: () => get<Paginated<IntelEntry>>("/intel", query),
    placeholderData: keepPreviousData,
  });
}

export function useIntelEntry(id: number) {
  return useQuery({ queryKey: intelKeys.detail(id), queryFn: () => get<IntelDetail>(`/intel/${id}`) });
}

export function useIntelPrompt() {
  // The prompt follows the day's activity, but needn't chase it while writing.
  return useQuery({ queryKey: intelKeys.prompt(), queryFn: () => get<IntelPrompt>("/intel/prompt"), staleTime: 10 * 60_000 });
}

export function useIntelInsights() {
  return useQuery({ queryKey: intelKeys.insights(), queryFn: () => get<IntelInsights>("/intel/insights") });
}

function useRefresh() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: intelKeys.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function useCreateIntel() {
  const queryClient = useQueryClient();
  const refresh = useRefresh();

  return useMutation({
    mutationFn: async (input: IntelInput) => {
      const { data } = await api.post<ApiEnvelope<IntelFiled>>("/intel", input);
      return data.data;
    },
    // XP, levels and trophies arrive as rewards (RewardsHost).
    onSuccess: ({ entry }) => {
      queryClient.setQueryData<IntelDetail>(intelKeys.detail(entry.id), (detail) => detail && { ...detail, entry });
    },
    onSettled: refresh,
  });
}

export function useUpdateIntel(id: number) {
  const queryClient = useQueryClient();
  const refresh = useRefresh();

  return useMutation<IntelEntry, Error, Partial<IntelInput>, { previous?: IntelDetail }>({
    mutationFn: async (changes) => {
      const { data } = await api.put<ApiEnvelope<IntelEntry>>(`/intel/${id}`, changes);
      return data.data;
    },
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: intelKeys.detail(id) });
      const previous = queryClient.getQueryData<IntelDetail>(intelKeys.detail(id));
      queryClient.setQueryData<IntelDetail>(
        intelKeys.detail(id),
        (detail) => detail && { ...detail, entry: { ...detail.entry, ...changes } },
      );
      return { previous };
    },
    onError: (_error, _changes, context) => queryClient.setQueryData(intelKeys.detail(id), context?.previous),
    onSuccess: (entry) =>
      queryClient.setQueryData<IntelDetail>(intelKeys.detail(id), (detail) => detail && { ...detail, entry }),
    onSettled: refresh,
  });
}

export function useDeleteIntel(id: number) {
  const queryClient = useQueryClient();
  const refresh = useRefresh();

  return useMutation<unknown, Error, void, { snapshot: [readonly unknown[], unknown][] }>({
    mutationFn: () => api.delete(`/intel/${id}`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: intelKeys.lists() });
      const snapshot = queryClient.getQueriesData({ queryKey: intelKeys.lists() });
      const without = (page: Paginated<IntelEntry>) => ({ ...page, items: page.items.filter((entry) => entry.id !== id) });

      queryClient.setQueriesData<Paginated<IntelEntry> | InfiniteData<Paginated<IntelEntry>>>(
        { queryKey: intelKeys.lists() },
        (data) => data && ("pages" in data ? { ...data, pages: data.pages.map(without) } : without(data)),
      );
      return { snapshot };
    },
    onError: (_error, _variables, context) =>
      context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data)),
    onSuccess: () => queryClient.removeQueries({ queryKey: intelKeys.detail(id) }),
    onSettled: refresh,
  });
}
