import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFocusStore } from "@/stores/focus";
import { api } from "./api";
import { celebrate } from "./celebrate";
import { missionKeys } from "./mission-queries";
import { queryKeys } from "./queries";
import type { ApiEnvelope, FocusCompletion, FocusSession } from "./types";

export const focusKeys = {
  all: ["focus-sessions"] as const,
  detail: (id: number) => ["focus-sessions", id] as const,
};

/** When a running session's countdown reaches 0, in epoch ms. */
export function sessionEndsAt(session: FocusSession): number {
  return new Date(session.start_time).getTime() + session.duration_minutes * 60_000;
}

/** Sessions change a mission's status and time, HQ's focus stats, and sometimes XP and alerts. */
function refreshAround(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: missionKeys.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  void queryClient.invalidateQueries({ queryKey: queryKeys.me });
  void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
}

export function useFocusSession(id: number) {
  return useQuery({
    queryKey: focusKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<ApiEnvelope<FocusSession>>(`/focus-sessions/${id}`);
      return data.data;
    },
  });
}

/** Starts a session (ending any other) and tracks it in the focus store. */
export function useStartFocusSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ missionId, minutes = 25 }: { missionId?: number | null; minutes?: number }) => {
      const { data } = await api.post<ApiEnvelope<FocusSession>>("/focus-sessions", {
        mission_id: missionId ?? null,
        duration_minutes: minutes,
      });
      return data.data;
    },
    onSuccess: (session) => {
      queryClient.setQueryData(focusKeys.detail(session.id), session);
      useFocusStore.getState().track(session.id, sessionEndsAt(session));
    },
    onSettled: () => refreshAround(queryClient),
  });
}

export function useCompleteFocusSession(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (distractions: number) => {
      const { data } = await api.post<ApiEnvelope<FocusCompletion>>(`/focus-sessions/${id}/complete`, {
        distractions,
      });
      return data.data;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(focusKeys.detail(id), result.session);
      useFocusStore.getState().clear();
      if (result.achievements.length || result.level_up) {
        void celebrate();
      }
    },
    onSettled: () => refreshAround(queryClient),
  });
}

export function useAbandonFocusSession(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (distractions: number) => {
      const { data } = await api.post<ApiEnvelope<FocusSession>>(`/focus-sessions/${id}/abandon`, {
        distractions,
      });
      return data.data;
    },
    onSuccess: (session) => {
      queryClient.setQueryData(focusKeys.detail(id), session);
      useFocusStore.getState().clear();
    },
    onSettled: () => refreshAround(queryClient),
  });
}

export function useRateEnergy(id: number) {
  const queryClient = useQueryClient();

  return useMutation<FocusSession, Error, number, { previous?: FocusSession }>({
    mutationFn: async (energy) => {
      const { data } = await api.patch<ApiEnvelope<FocusSession>>(`/focus-sessions/${id}/energy`, {
        energy_after: energy,
      });
      return data.data;
    },
    onMutate: async (energy) => {
      await queryClient.cancelQueries({ queryKey: focusKeys.detail(id) });
      const previous = queryClient.getQueryData<FocusSession>(focusKeys.detail(id));
      queryClient.setQueryData<FocusSession>(
        focusKeys.detail(id),
        (session) => session && { ...session, energy_after: energy },
      );
      return { previous };
    },
    onError: (_error, _energy, context) => queryClient.setQueryData(focusKeys.detail(id), context?.previous),
    onSuccess: (session) => queryClient.setQueryData(focusKeys.detail(id), session),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: missionKeys.all }),
  });
}
