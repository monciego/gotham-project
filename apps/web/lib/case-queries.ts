import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAlfredStore } from "@/stores/alfred";
import { say } from "./alfred";
import { api } from "./api";
import { celebrate, celebrateCaseMark } from "./celebrate";
import { missionKeys } from "./mission-queries";
import { queryKeys } from "./queries";
import type {
  ApiEnvelope,
  Case,
  CaseCompletion,
  CaseDetail,
  CaseInput,
  CaseMark,
  CaseMilestone,
} from "./types";

export const caseKeys = {
  all: ["cases"] as const,
  list: () => ["cases", "list"] as const,
  detail: (id: number) => ["cases", "detail", id] as const,
};

type Rollback = { rollback?: () => void };

async function get<T>(url: string): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(url);
  return data.data;
}

/** Every case. The list page filters by status on the client; there are never many. */
export function useCases() {
  return useQuery({
    queryKey: caseKeys.list(),
    queryFn: () => get<Case[]>("/cases"),
  });
}

export function useCase(id: number) {
  return useQuery({
    queryKey: caseKeys.detail(id),
    queryFn: () => get<CaseDetail>(`/cases/${id}`),
  });
}

/** Snapshots the case detail, applies a change, and returns an undo. */
async function optimisticDetail(queryClient: QueryClient, id: number, update: (detail: CaseDetail) => CaseDetail) {
  const key = caseKeys.detail(id);
  await queryClient.cancelQueries({ queryKey: key });
  const snapshot = queryClient.getQueryData<CaseDetail>(key);
  queryClient.setQueryData<CaseDetail>(key, (detail) => detail && update(detail));
  return () => queryClient.setQueryData(key, snapshot);
}

/** Case names and progress show on missions and HQ too. */
function refreshAfterChange(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: caseKeys.all });
  void queryClient.invalidateQueries({ queryKey: missionKeys.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
}

/* Cases ------------------------------------------------------------------- */

export function useCreateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CaseInput) => {
      const { data } = await api.post<ApiEnvelope<CaseDetail>>("/cases", input);
      return data.data;
    },
    onSuccess: (detail) => {
      queryClient.setQueryData(caseKeys.detail(detail.id), detail);
      void queryClient.invalidateQueries({ queryKey: caseKeys.all });
    },
  });
}

export function useUpdateCase(id: number) {
  const queryClient = useQueryClient();

  return useMutation<CaseDetail, Error, Partial<CaseInput>, Rollback>({
    mutationFn: async (changes) => {
      const { data } = await api.put<ApiEnvelope<CaseDetail>>(`/cases/${id}`, changes);
      return data.data;
    },
    onMutate: async (changes) => ({
      rollback: await optimisticDetail(queryClient, id, (detail) => ({ ...detail, ...changes })),
    }),
    onError: (_error, _changes, context) => context?.rollback?.(),
    onSuccess: (detail) => queryClient.setQueryData(caseKeys.detail(id), detail),
    onSettled: () => refreshAfterChange(queryClient),
  });
}

export function useDeleteCase(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.delete(`/cases/${id}`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: caseKeys.detail(id) });
      refreshAfterChange(queryClient);
    },
  });
}

/** Manual cases only. Celebrates a mark the new value passes. */
export function useSetCaseProgress(id: number) {
  const queryClient = useQueryClient();

  return useMutation<{ case: CaseDetail; milestone: CaseMark | null }, Error, number, Rollback>({
    mutationFn: async (progress) => {
      const { data } = await api.patch<ApiEnvelope<{ case: CaseDetail; milestone: CaseMark | null }>>(
        `/cases/${id}/progress`,
        { progress },
      );
      return data.data;
    },
    onMutate: async (progress) => ({
      rollback: await optimisticDetail(queryClient, id, (detail) => ({ ...detail, progress })),
    }),
    onError: (_error, _progress, context) => context?.rollback?.(),
    onSuccess: ({ case: detail, milestone }) => {
      queryClient.setQueryData(caseKeys.detail(id), detail);
      if (milestone) celebrateCaseMark(id, detail.name, milestone);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: caseKeys.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

export function useCompleteCase(id: number) {
  const queryClient = useQueryClient();

  return useMutation<CaseCompletion, Error, void>({
    mutationFn: async () => {
      const { data } = await api.post<ApiEnvelope<CaseCompletion>>(`/cases/${id}/complete`);
      return data.data;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(caseKeys.detail(id), result.case);
      void celebrate();

      const rewards = [
        result.xp_awarded ? `+${result.xp_awarded} XP` : null,
        result.level_up ? `Level ${result.current_level}` : null,
      ].filter(Boolean);
      const trophies = result.achievements.map((trophy) => trophy.name);

      useAlfredStore.getState().say({
        mood: "proud",
        title: say("caseClosed", 0),
        message: [result.case.name, rewards.join(" · "), trophies.length ? `Trophy earned: ${trophies.join(", ")}.` : null]
          .filter(Boolean)
          .join(" "),
        actions: trophies.length ? [{ label: "View trophies", href: "/trophies" }] : [],
      });

      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
    onSettled: () => refreshAfterChange(queryClient),
  });
}

/* Milestones -------------------------------------------------------------- */

type MilestoneChanges = { id: number; name?: string; target_date?: string; completed?: boolean };

function sortMilestones(milestones: CaseMilestone[]): CaseMilestone[] {
  return [...milestones].sort((a, b) => a.target_date.localeCompare(b.target_date) || a.id - b.id);
}

export function useAddMilestone(caseId: number) {
  const queryClient = useQueryClient();

  return useMutation<CaseMilestone, Error, { name: string; target_date: string }, Rollback>({
    mutationFn: async (input) => {
      const { data } = await api.post<ApiEnvelope<CaseMilestone>>(`/cases/${caseId}/milestones`, input);
      return data.data;
    },
    onMutate: async (input) => ({
      rollback: await optimisticDetail(queryClient, caseId, (detail) => ({
        ...detail,
        // A temporary negative id until the server's version replaces it.
        milestones: sortMilestones([
          ...detail.milestones,
          { id: -Date.now(), ...input, completed: false, completed_at: null, is_overdue: false },
        ]),
      })),
    }),
    onError: (_error, _input, context) => context?.rollback?.(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) }),
  });
}

export function useUpdateMilestone(caseId: number) {
  const queryClient = useQueryClient();

  return useMutation<CaseMilestone, Error, MilestoneChanges, Rollback>({
    mutationFn: async ({ id, ...changes }) => {
      const { data } = await api.put<ApiEnvelope<CaseMilestone>>(`/cases/${caseId}/milestones/${id}`, changes);
      return data.data;
    },
    onMutate: async ({ id, ...changes }) => ({
      rollback: await optimisticDetail(queryClient, caseId, (detail) => ({
        ...detail,
        milestones: sortMilestones(
          detail.milestones.map((milestone) =>
            milestone.id === id
              ? { ...milestone, ...changes, ...(changes.completed !== undefined && { is_overdue: false }) }
              : milestone,
          ),
        ),
      })),
    }),
    onError: (_error, _changes, context) => context?.rollback?.(),
    onSuccess: (milestone, { completed }) => {
      if (completed) {
        useAlfredStore.getState().say({ mood: "proud", title: "Milestone reached, sir.", message: milestone.name });
        // Trophies for milestones arrive as Alfred messages.
        void queryClient.invalidateQueries({ queryKey: queryKeys.me });
        void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) }),
  });
}

export function useDeleteMilestone(caseId: number) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, number, Rollback>({
    mutationFn: (id) => api.delete(`/cases/${caseId}/milestones/${id}`),
    onMutate: async (id) => ({
      rollback: await optimisticDetail(queryClient, caseId, (detail) => ({
        ...detail,
        milestones: detail.milestones.filter((milestone) => milestone.id !== id),
      })),
    }),
    onError: (_error, _id, context) => context?.rollback?.(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: caseKeys.detail(caseId) }),
  });
}
