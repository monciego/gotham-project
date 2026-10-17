import { type QueryClient, type QueryKey, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAlfredStore } from "@/stores/alfred";
import { say } from "./alfred";
import { api } from "./api";
import { celebrate } from "./celebrate";
import { patchHabit, queryKeys } from "./queries";
import type { ApiEnvelope, Dashboard, Habit, HabitCheckIn, HabitDetail, HabitInput } from "./types";

export const arsenalKeys = {
  all: ["arsenal"] as const,
  list: () => ["arsenal", "list"] as const,
  today: () => ["arsenal", "today"] as const,
  detail: (id: number) => ["arsenal", "detail", id] as const,
};

const MILESTONE_LINES = { 7: "streak7", 30: "streak30", 100: "streak100" } as const;

async function get<T>(url: string): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(url);
  return data.data;
}

/** Every habit, active and archived, with today's state. */
export function useArsenal() {
  return useQuery({ queryKey: arsenalKeys.list(), queryFn: () => get<Habit[]>("/arsenal") });
}

/** Today's habits: active, due, and meant for the current mode. */
export function useArsenalToday({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({ queryKey: arsenalKeys.today(), queryFn: () => get<Habit[]>("/arsenal/today"), enabled });
}

export function useHabit(id: number) {
  return useQuery({ queryKey: arsenalKeys.detail(id), queryFn: () => get<HabitDetail>(`/arsenal/${id}`) });
}

/* Cache helpers ------------------------------------------------------------ */

type Rollback = { rollback?: () => void };

/** Changes one habit wherever it's cached: lists, its detail page and HQ. */
function patchEverywhere(queryClient: QueryClient, id: number, changes: Partial<Habit>) {
  const patch = (habits?: Habit[]) => habits?.map((habit) => (habit.id === id ? { ...habit, ...changes } : habit));

  queryClient.setQueryData<Habit[]>(arsenalKeys.list(), patch);
  queryClient.setQueryData<Habit[]>(arsenalKeys.today(), patch);
  queryClient.setQueryData<HabitDetail>(
    arsenalKeys.detail(id),
    (detail) => detail && { ...detail, habit: { ...detail.habit, ...changes } },
  );
  queryClient.setQueryData<Dashboard>(queryKeys.dashboard, (dashboard) => dashboard && patchHabit(dashboard, id, changes));
}

/** Applies an optimistic change and returns a function that undoes it. */
async function optimistic(queryClient: QueryClient, apply: () => void): Promise<() => void> {
  const keys: QueryKey[] = [arsenalKeys.all, queryKeys.dashboard];
  await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey })));
  const snapshot = keys.flatMap((queryKey) => queryClient.getQueriesData({ queryKey }));

  apply();

  return () => snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

/** Streaks, XP, alerts and HQ all move with a check-in. */
function refreshAround(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: arsenalKeys.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  void queryClient.invalidateQueries({ queryKey: queryKeys.me });
  void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
}

/**
 * Alfred marks streak milestones. Ordinary check-ins stay quiet; XP, levels
 * and trophies arrive as rewards (RewardsHost).
 */
function announce(result: HabitCheckIn) {
  const { milestone, habit } = result;
  if (!milestone) return;

  void celebrate();
  useAlfredStore.getState().say({
    mood: "proud",
    title: say(MILESTONE_LINES[milestone as keyof typeof MILESTONE_LINES] ?? "streak7", 0),
    message: `${habit.name}: ${milestone} ${habit.streak_unit} in a row.`,
  });
}

/* Habits ------------------------------------------------------------------- */

export function useCreateHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: HabitInput) => {
      const { data } = await api.post<ApiEnvelope<Habit>>("/arsenal", input);
      return data.data;
    },
    onSettled: () => refreshAround(queryClient),
  });
}

export function useUpdateHabit(id: number) {
  const queryClient = useQueryClient();

  return useMutation<Habit, Error, Partial<HabitInput>, Rollback>({
    mutationFn: async (changes) => {
      const { data } = await api.put<ApiEnvelope<Habit>>(`/arsenal/${id}`, changes);
      return data.data;
    },
    onMutate: async (changes) => ({
      rollback: await optimistic(queryClient, () => patchEverywhere(queryClient, id, changes)),
    }),
    onError: (_error, _changes, context) => context?.rollback?.(),
    onSuccess: (habit) => patchEverywhere(queryClient, id, habit),
    onSettled: () => refreshAround(queryClient),
  });
}

export function useDeleteHabit(id: number) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, void, Rollback>({
    mutationFn: () => api.delete(`/arsenal/${id}`),
    onMutate: async () => ({
      rollback: await optimistic(queryClient, () => {
        const remove = (habits?: Habit[]) => habits?.filter((habit) => habit.id !== id);
        queryClient.setQueryData<Habit[]>(arsenalKeys.list(), remove);
        queryClient.setQueryData<Habit[]>(arsenalKeys.today(), remove);
      }),
    }),
    onError: (_error, _variables, context) => context?.rollback?.(),
    onSuccess: () => queryClient.removeQueries({ queryKey: arsenalKeys.detail(id) }),
    onSettled: () => refreshAround(queryClient),
  });
}

/* Check-ins ---------------------------------------------------------------- */

function useCheckIn<TInput>(
  request: (id: number, input: TInput) => Promise<HabitCheckIn>,
  optimisticChanges: (input: TInput) => Partial<Habit>,
) {
  const queryClient = useQueryClient();

  return useMutation<HabitCheckIn, Error, { id: number } & TInput, Rollback>({
    mutationFn: ({ id, ...input }) => request(id, input as TInput),
    onMutate: async ({ id, ...input }) => ({
      rollback: await optimistic(queryClient, () =>
        patchEverywhere(queryClient, id, optimisticChanges(input as TInput)),
      ),
    }),
    onError: (_error, _variables, context) => context?.rollback?.(),
    onSuccess: (result) => {
      patchEverywhere(queryClient, result.habit.id, result.habit);
      announce(result);
    },
    onSettled: () => refreshAround(queryClient),
  });
}

async function post(url: string, body?: object): Promise<HabitCheckIn> {
  const { data } = await api.post<ApiEnvelope<HabitCheckIn>>(url, body);
  return data.data;
}

/** Measurable habits pass `value`; without one, the target is logged. */
export function useCompleteHabit() {
  return useCheckIn(
    (id, input: { value?: number | null; note?: string | null }) => post(`/arsenal/${id}/complete`, input),
    ({ value }) => ({ completed: true, skipped: false, streak_at_risk: false, ...(value != null && { value }) }),
  );
}

export function useSkipHabit() {
  return useCheckIn(
    (id, input: { reason?: string | null }) => post(`/arsenal/${id}/skip`, input),
    () => ({ skipped: true, completed: false, streak_at_risk: false }),
  );
}

/** Clears today's check-in, completed or skipped. */
export function useUndoCheckIn() {
  return useCheckIn(
    async (id) => {
      const { data } = await api.delete<ApiEnvelope<HabitCheckIn>>(`/arsenal/${id}/complete`);
      return data.data;
    },
    () => ({ completed: false, skipped: false, value: null }),
  );
}
