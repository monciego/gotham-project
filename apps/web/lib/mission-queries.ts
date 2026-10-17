import {
  type InfiniteData,
  keepPreviousData,
  type QueryClient,
  type QueryKey,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAlfredStore } from "@/stores/alfred";
import { say } from "./alfred";
import { api } from "./api";
import { celebrate, celebrateCaseMark } from "./celebrate";
import { queryKeys } from "./queries";
import type {
  ApiEnvelope,
  EarnedTrophy,
  Mission,
  MissionCompletion,
  MissionDetail,
  MissionInput,
  MissionStatus,
  Paginated,
  Priority,
  Subtask,
} from "./types";

export type MissionView = "today" | "upcoming" | "overdue" | "all";

export type MissionSort = "due_date" | "priority" | "times_postponed";

export type MissionFilters = {
  view: MissionView;
  status: MissionStatus | "";
  priority: Priority | "";
  search: string;
  sort: MissionSort;
};

export const missionKeys = {
  all: ["missions"] as const,
  lists: () => ["missions", "list"] as const,
  list: (params: Record<string, string>) => ["missions", "list", params] as const,
  detail: (id: number) => ["missions", "detail", id] as const,
  options: () => ["missions", "options"] as const,
};

type ListData = InfiniteData<Paginated<Mission>>;

async function get<T>(url: string, params?: Record<string, string | number>): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(url, { params });
  return data.data;
}

/** Drops empty filters so equivalent lists share a cache entry. */
function listParams(filters: MissionFilters): Record<string, string> {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));
}

export function useMissions(filters: MissionFilters) {
  const params = listParams(filters);

  return useInfiniteQuery({
    queryKey: missionKeys.list(params),
    queryFn: ({ pageParam }) =>
      get<Paginated<Mission>>("/missions", { ...params, page: pageParam, per_page: 20 }),
    initialPageParam: 1,
    getNextPageParam: ({ meta }) =>
      meta.current_page < meta.last_page ? meta.current_page + 1 : undefined,
    // Keeps the old results on screen while a new filter loads.
    placeholderData: keepPreviousData,
  });
}

export function useMission(id: number) {
  return useQuery({
    queryKey: missionKeys.detail(id),
    queryFn: () => get<MissionDetail>(`/missions/${id}`),
  });
}

/** Open missions, for picking dependencies. */
export function useMissionOptions() {
  return useQuery({
    queryKey: missionKeys.options(),
    queryFn: () =>
      get<Paginated<Mission>>("/missions", { status: "open", per_page: 100 }).then((page) => page.items),
  });
}

/* Optimistic cache helpers ------------------------------------------------ */

/** Snapshots every mission query, applies a change, and returns an undo. */
async function optimistic(queryClient: QueryClient, apply: () => void) {
  await queryClient.cancelQueries({ queryKey: missionKeys.all });
  const snapshot = queryClient.getQueriesData({ queryKey: missionKeys.all });
  apply();
  return () => snapshot.forEach(([key, data]) => queryClient.setQueryData(key as QueryKey, data));
}

function patchLists(queryClient: QueryClient, update: (missions: Mission[]) => Mission[]) {
  queryClient.setQueriesData<ListData>({ queryKey: missionKeys.lists() }, (data) =>
    data && {
      ...data,
      pages: data.pages.map((page) => ({ ...page, items: update(page.items) })),
    },
  );
}

function patchMission(queryClient: QueryClient, id: number, changes: Partial<MissionDetail>) {
  patchLists(queryClient, (missions) =>
    missions.map((mission) => (mission.id === id ? { ...mission, ...changes } : mission)),
  );
  queryClient.setQueryData<MissionDetail>(
    missionKeys.detail(id),
    (detail) => detail && { ...detail, ...changes },
  );
}

function patchDetail(
  queryClient: QueryClient,
  id: number,
  update: (detail: MissionDetail) => MissionDetail,
) {
  queryClient.setQueryData<MissionDetail>(missionKeys.detail(id), (detail) => detail && update(detail));
}

function refreshAfterChange(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: missionKeys.all });
  // caseKeys.all: a case's progress follows its missions (case-queries imports this module).
  void queryClient.invalidateQueries({ queryKey: ["cases"] });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
}

type Rollback = { rollback?: () => void };

/* Missions ---------------------------------------------------------------- */

export function useCreateMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MissionInput) => {
      const { data } = await api.post<ApiEnvelope<MissionDetail>>("/missions", input);
      return data.data;
    },
    onSuccess: (mission) => {
      queryClient.setQueryData(missionKeys.detail(mission.id), mission);
      refreshAfterChange(queryClient);
    },
  });
}

export type MissionChanges = Partial<MissionInput> & { status?: "not_started" | "in_progress" };

export function useUpdateMission(id: number) {
  const queryClient = useQueryClient();

  return useMutation<MissionDetail, Error, MissionChanges, Rollback>({
    mutationFn: async (changes) => {
      const { data } = await api.put<ApiEnvelope<MissionDetail>>(`/missions/${id}`, changes);
      return data.data;
    },
    onMutate: async (changes) => ({
      rollback: await optimistic(queryClient, () => patchMission(queryClient, id, changes)),
    }),
    onError: (_error, _changes, context) => context?.rollback?.(),
    onSuccess: (mission) => patchMission(queryClient, id, mission),
    onSettled: () => refreshAfterChange(queryClient),
  });
}

function announceCompletion(result: MissionCompletion) {
  const { say: alfredSays } = useAlfredStore.getState();
  const rewards = [
    result.xp_awarded ? `+${result.xp_awarded} XP` : null,
    result.level_up ? `Level ${result.current_level}` : null,
  ].filter(Boolean);

  if (result.case_milestone) {
    const { case_id, name, milestone } = result.case_milestone;
    celebrateCaseMark(case_id, name, milestone);
  } else if (result.achievements.length || result.level_up) {
    void celebrate();
  }

  alfredSays({
    mood: "proud",
    title: result.achievements.length
      ? `Trophy earned: ${result.achievements.map((trophy: EarnedTrophy) => trophy.name).join(", ")}`
      : say("missionComplete", 0),
    message: [say("missionCompleteDetail", 0), rewards.join(" · ")].filter(Boolean).join(" "),
    actions: result.achievements.length ? [{ label: "View trophies", href: "/trophies" }] : [],
  });
}

export function useCompleteMission(id: number) {
  const queryClient = useQueryClient();

  return useMutation<MissionCompletion, Error, void, Rollback>({
    mutationFn: async () => {
      const { data } = await api.post<ApiEnvelope<MissionCompletion>>(`/missions/${id}/complete`);
      return data.data;
    },
    onMutate: async () => ({
      rollback: await optimistic(queryClient, () => patchMission(queryClient, id, { status: "completed" })),
    }),
    onError: (_error, _variables, context) => context?.rollback?.(),
    onSuccess: (result) => {
      patchMission(queryClient, id, result.mission);
      announceCompletion(result);
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
    onSettled: () => refreshAfterChange(queryClient),
  });
}

export function useStartMission(id: number) {
  const queryClient = useQueryClient();

  return useMutation<MissionDetail, Error, void, Rollback>({
    mutationFn: async () => {
      const { data } = await api.post<ApiEnvelope<MissionDetail>>(`/missions/${id}/start`);
      return data.data;
    },
    onMutate: async () => ({
      rollback: await optimistic(queryClient, () => patchMission(queryClient, id, { status: "in_progress" })),
    }),
    onError: (_error, _variables, context) => context?.rollback?.(),
    onSuccess: (mission) => patchMission(queryClient, id, mission),
    onSettled: () => refreshAfterChange(queryClient),
  });
}

export function useAbandonMission(id: number) {
  const queryClient = useQueryClient();

  return useMutation<MissionDetail, Error, string, Rollback>({
    mutationFn: async (reason) => {
      const { data } = await api.post<ApiEnvelope<MissionDetail>>(`/missions/${id}/abandon`, { reason });
      return data.data;
    },
    onMutate: async (reason) => ({
      rollback: await optimistic(queryClient, () =>
        patchMission(queryClient, id, { status: "abandoned", abandon_reason: reason }),
      ),
    }),
    onError: (_error, _reason, context) => context?.rollback?.(),
    onSuccess: (mission) => patchMission(queryClient, id, mission),
    onSettled: () => refreshAfterChange(queryClient),
  });
}

export function useDeleteMission(id: number) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, void, Rollback>({
    mutationFn: () => api.delete(`/missions/${id}`),
    onMutate: async () => ({
      rollback: await optimistic(queryClient, () =>
        patchLists(queryClient, (missions) => missions.filter((mission) => mission.id !== id)),
      ),
    }),
    onError: (_error, _variables, context) => context?.rollback?.(),
    onSuccess: () => queryClient.removeQueries({ queryKey: missionKeys.detail(id) }),
    onSettled: () => refreshAfterChange(queryClient),
  });
}

/* Subtasks ---------------------------------------------------------------- */

function useSubtaskMutation<TVariables, TResult>(
  missionId: number,
  request: (variables: TVariables) => Promise<TResult>,
  apply: (subtasks: Subtask[], variables: TVariables) => Subtask[],
) {
  const queryClient = useQueryClient();

  return useMutation<TResult, Error, TVariables, Rollback>({
    mutationFn: request,
    onMutate: async (variables) => ({
      rollback: await optimistic(queryClient, () =>
        patchDetail(queryClient, missionId, (detail) => ({
          ...detail,
          subtasks: apply(detail.subtasks, variables),
        })),
      ),
    }),
    onError: (_error, _variables, context) => context?.rollback?.(),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: missionKeys.detail(missionId) });
      void queryClient.invalidateQueries({ queryKey: missionKeys.lists() });
    },
  });
}

export function useAddSubtask(missionId: number) {
  return useSubtaskMutation(
    missionId,
    (title: string) => api.post(`/missions/${missionId}/subtasks`, { title }),
    // A temporary negative id until the server's version replaces it.
    (subtasks, title) => [...subtasks, { id: -Date.now(), title, completed: false, order: subtasks.length + 1 }],
  );
}

export function useUpdateSubtask(missionId: number) {
  return useSubtaskMutation(
    missionId,
    ({ id, ...changes }: { id: number; title?: string; completed?: boolean }) =>
      api.put(`/missions/${missionId}/subtasks/${id}`, changes),
    (subtasks, { id, ...changes }) =>
      subtasks.map((subtask) => (subtask.id === id ? { ...subtask, ...changes } : subtask)),
  );
}

export function useDeleteSubtask(missionId: number) {
  return useSubtaskMutation(
    missionId,
    (id: number) => api.delete(`/missions/${missionId}/subtasks/${id}`),
    (subtasks, id) => subtasks.filter((subtask) => subtask.id !== id),
  );
}

export function useReorderSubtasks(missionId: number) {
  return useSubtaskMutation(
    missionId,
    (ids: number[]) => api.post(`/missions/${missionId}/subtasks/reorder`, { ids }),
    (subtasks, ids) =>
      ids
        .map((id, order) => {
          const subtask = subtasks.find((item) => item.id === id);
          return subtask && { ...subtask, order };
        })
        .filter((subtask): subtask is Subtask => subtask !== undefined),
  );
}

/* Dependencies ------------------------------------------------------------ */

export function useAddDependency(missionId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dependsOnId: number) =>
      api.post(`/missions/${missionId}/dependencies`, { depends_on_id: dependsOnId }),
    // Both missions' pages change ("blocked by" and "waiting on this").
    onSettled: () => queryClient.invalidateQueries({ queryKey: missionKeys.all }),
  });
}

export function useRemoveDependency(missionId: number) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, number, Rollback>({
    mutationFn: (dependsOnId) => api.delete(`/missions/${missionId}/dependencies/${dependsOnId}`),
    onMutate: async (dependsOnId) => ({
      rollback: await optimistic(queryClient, () =>
        patchDetail(queryClient, missionId, (detail) => ({
          ...detail,
          dependencies: detail.dependencies.filter((dependency) => dependency.id !== dependsOnId),
        })),
      ),
    }),
    onError: (_error, _id, context) => context?.rollback?.(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: missionKeys.all }),
  });
}

/* Kanban ------------------------------------------------------------------ */

type BoardStatus = "not_started" | "in_progress" | "completed";

/** Moves a mission between Kanban columns: start, back to not started, or complete. */
export function useMoveMission() {
  const queryClient = useQueryClient();

  return useMutation<MissionCompletion | MissionDetail, Error, { id: number; to: BoardStatus }, Rollback>({
    mutationFn: async ({ id, to }) => {
      if (to === "completed") {
        const { data } = await api.post<ApiEnvelope<MissionCompletion>>(`/missions/${id}/complete`);
        return data.data;
      }
      const { data } =
        to === "in_progress"
          ? await api.post<ApiEnvelope<MissionDetail>>(`/missions/${id}/start`)
          : await api.put<ApiEnvelope<MissionDetail>>(`/missions/${id}`, { status: to });
      return data.data;
    },
    onMutate: async ({ id, to }) => ({
      rollback: await optimistic(queryClient, () => patchMission(queryClient, id, { status: to })),
    }),
    onError: (_error, _variables, context) => context?.rollback?.(),
    onSuccess: (result, { to }) => {
      if (to === "completed" && "xp_awarded" in result) {
        announceCompletion(result);
        void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      }
    },
    onSettled: () => refreshAfterChange(queryClient),
  });
}
