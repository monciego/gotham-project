import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type {
  AlfredMessage,
  ApiEnvelope,
  Dashboard,
  HabitCheckIn,
  HabitToday,
  User,
} from "./types";

export const queryKeys = {
  me: ["me"],
  dashboard: ["dashboard"],
  alerts: ["alfred-messages"],
} as const;

async function get<T>(url: string): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(url);
  return data.data;
}

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => get<User>("/auth/me"),
    staleTime: 5 * 60_000,
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => get<Dashboard>("/dashboard"),
  });
}

export function useUnreadAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: () => get<{ messages: AlfredMessage[]; unread_count: number }>("/alfred-messages"),
    refetchInterval: 60_000,
  });
}

/** Applies a change to one habit wherever HQ shows it. */
export function patchHabit(dashboard: Dashboard, id: number, changes: Partial<HabitToday>): Dashboard {
  const patch = (habits: HabitToday[]) =>
    habits.map((habit) => (habit.id === id ? { ...habit, ...changes } : habit));

  return {
    ...dashboard,
    morning_brief: { ...dashboard.morning_brief, habits: patch(dashboard.morning_brief.habits) },
    todays_arsenal: patch(dashboard.todays_arsenal),
  };
}

/** Checks a habit off for today, or undoes it. The checkbox flips immediately and reverts on error. */
export function useToggleHabit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const url = `/arsenal/${id}/complete`;
      const { data } = completed
        ? await api.post<ApiEnvelope<HabitCheckIn>>(url)
        : await api.delete<ApiEnvelope<HabitCheckIn>>(url);
      return data.data;
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dashboard });
      const previous = queryClient.getQueryData<Dashboard>(queryKeys.dashboard);
      queryClient.setQueryData<Dashboard>(
        queryKeys.dashboard,
        (dashboard) => dashboard && patchHabit(dashboard, id, { completed }),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.dashboard, context.previous);
      }
    },
    onSuccess: ({ habit }) => {
      queryClient.setQueryData<Dashboard>(
        queryKeys.dashboard,
        (dashboard) => dashboard && patchHabit(dashboard, habit.id, habit),
      );
    },
    // Refreshes the streak stat. The quote is fixed per day, so refetching doesn't change it.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: ["arsenal"] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}

function useAlertMutation(action: "dismiss" | "act") {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.post(`/alfred-messages/${id}/${action}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.dashboard });
      const previous = queryClient.getQueryData<Dashboard>(queryKeys.dashboard);
      queryClient.setQueryData<Dashboard>(
        queryKeys.dashboard,
        (dashboard) =>
          dashboard && {
            ...dashboard,
            alfred_alerts: dashboard.alfred_alerts.filter((alert) => alert.id !== id),
          },
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.dashboard, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
  });
}

export const useDismissAlert = () => useAlertMutation("dismiss");

/** The user followed one of the alert's actions. */
export const useActOnAlert = () => useAlertMutation("act");
