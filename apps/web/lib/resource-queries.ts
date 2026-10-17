import { keepPreviousData, type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAlfredStore } from "@/stores/alfred";
import { api } from "./api";
import { celebrate } from "./celebrate";
import { queryKeys } from "./queries";
import type {
  ApiEnvelope,
  BudgetMonth,
  BudgetRecommendation,
  Contribution,
  Paginated,
  ResourceCategories,
  ResourceSummary,
  SavingsGoal,
  SavingsGoalInput,
  Transaction,
  TransactionInput,
  TransactionType,
} from "./types";

export type TransactionFilters = {
  type: TransactionType | "";
  category: string;
  account: string;
  from: string;
  to: string;
  search: string;
  sort: "date" | "amount";
  direction: "asc" | "desc";
  /** "1" for transactions not yet put toward a goal. */
  unlinked?: "1" | "";
};

export const resourceKeys = {
  all: ["resources"] as const,
  transactions: () => ["resources", "transactions"] as const,
  transactionPage: (params: Record<string, string | number>) => ["resources", "transactions", params] as const,
  summary: (month: string) => ["resources", "summary", month] as const,
  categories: () => ["resources", "categories"] as const,
  budgets: (month: string) => ["resources", "budgets", month] as const,
  recommendations: (month: string) => ["resources", "recommendations", month] as const,
  goals: () => ["resources", "goals"] as const,
  goal: (id: number) => ["resources", "goals", id] as const,
};

async function get<T>(url: string, params?: Record<string, string | number>): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(url, { params });
  return data.data;
}

/** Drops empty filters so equivalent queries share a cache entry. */
export function transactionParams(filters: Partial<TransactionFilters>): Record<string, string> {
  return Object.fromEntries(Object.entries(filters).filter((entry): entry is [string, string] => !!entry[1]));
}

export function useTransactions(filters: Partial<TransactionFilters>, page = 1, perPage = 20) {
  const params = { ...transactionParams(filters), page, per_page: perPage };

  return useQuery({
    queryKey: resourceKeys.transactionPage(params),
    queryFn: () => get<Paginated<Transaction>>("/resources", params),
    placeholderData: keepPreviousData,
  });
}

/** `month` is YYYY-MM; empty for the user's current month. */
export function useResourceSummary(month = "") {
  return useQuery({
    queryKey: resourceKeys.summary(month),
    queryFn: () => get<ResourceSummary>("/resources/summary", month ? { month } : undefined),
  });
}

export function useResourceCategories() {
  return useQuery({
    queryKey: resourceKeys.categories(),
    queryFn: () => get<ResourceCategories>("/resources/categories"),
    staleTime: 5 * 60_000,
  });
}

export function useBudgets(month = "") {
  return useQuery({
    queryKey: resourceKeys.budgets(month),
    queryFn: () => get<BudgetMonth>("/budgets", month ? { month } : undefined),
    placeholderData: keepPreviousData,
  });
}

/** Fetched on demand, when the Budget page's Auto-recommend is pressed. */
export function useBudgetRecommendations(month: string) {
  return useQuery({
    queryKey: resourceKeys.recommendations(month),
    queryFn: () => get<BudgetRecommendation[]>("/budgets/recommendations", { month }),
    enabled: false,
  });
}

export function useSavingsGoals() {
  return useQuery({
    queryKey: resourceKeys.goals(),
    queryFn: () => get<{ active: SavingsGoal[]; completed: SavingsGoal[] }>("/savings-goals"),
  });
}

/** Totals, budgets, goals, HQ and alerts all follow the transactions. */
function refreshAll(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: resourceKeys.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  void queryClient.invalidateQueries({ queryKey: queryKeys.me });
}

/* Transactions ------------------------------------------------------------- */

export function useSaveTransaction(id?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const { data } = id
        ? await api.put<ApiEnvelope<Transaction>>(`/resources/${id}`, input)
        : await api.post<ApiEnvelope<Transaction>>("/resources", input);
      return data.data;
    },
    onSettled: () => refreshAll(queryClient),
  });
}

/** Deletes one or many. Rows leave every cached page at once and come back on error. */
export function useDeleteTransactions() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, number[], { snapshot: [readonly unknown[], unknown][] }>({
    mutationFn: (ids) =>
      ids.length === 1 ? api.delete(`/resources/${ids[0]}`) : api.post("/resources/bulk-delete", { ids }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: resourceKeys.transactions() });
      const snapshot = queryClient.getQueriesData({ queryKey: resourceKeys.transactions() });
      queryClient.setQueriesData<Paginated<Transaction>>(
        { queryKey: resourceKeys.transactions() },
        (page) =>
          page && {
            ...page,
            items: page.items.filter((item) => !ids.includes(item.id)),
            meta: { ...page.meta, total: page.meta.total - page.items.filter((item) => ids.includes(item.id)).length },
          },
      );
      return { snapshot };
    },
    onError: (_error, _ids, context) => context?.snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data)),
    onSettled: () => refreshAll(queryClient),
  });
}

/** Every page of the filtered transactions as a CSV download. */
export async function exportTransactions(filters: Partial<TransactionFilters>) {
  const { data } = await api.get<Blob>("/resources/export", { params: transactionParams(filters), responseType: "blob" });
  const url = URL.createObjectURL(data);
  const link = Object.assign(document.createElement("a"), { href: url, download: "gotham-resources.csv" });
  link.click();
  URL.revokeObjectURL(url);
}

/* Budgets ------------------------------------------------------------------ */

/** Saves a month's whole set of budgets. */
export function useSaveBudgets(month: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (budgets: { category: string; monthly_limit: number }[]) => api.put("/budgets", { month, budgets }),
    onSettled: () => refreshAll(queryClient),
  });
}

/* Savings goals ------------------------------------------------------------ */

export function useSaveGoal(id?: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SavingsGoalInput) => {
      const { data } = id
        ? await api.put<ApiEnvelope<SavingsGoal>>(`/savings-goals/${id}`, input)
        : await api.post<ApiEnvelope<SavingsGoal>>("/savings-goals", input);
      return data.data;
    },
    onSettled: () => refreshAll(queryClient),
  });
}

export function useDeleteGoal(id: number) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, void, { previous?: { active: SavingsGoal[]; completed: SavingsGoal[] } }>({
    mutationFn: () => api.delete(`/savings-goals/${id}`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: resourceKeys.goals() });
      const previous = queryClient.getQueryData<{ active: SavingsGoal[]; completed: SavingsGoal[] }>(resourceKeys.goals());
      queryClient.setQueryData<{ active: SavingsGoal[]; completed: SavingsGoal[] }>(
        resourceKeys.goals(),
        (goals) =>
          goals && {
            active: goals.active.filter((goal) => goal.id !== id),
            completed: goals.completed.filter((goal) => goal.id !== id),
          },
      );
      return { previous };
    },
    onError: (_error, _variables, context) => queryClient.setQueryData(resourceKeys.goals(), context?.previous),
    onSettled: () => refreshAll(queryClient),
  });
}

export function useContribute(goalId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contribution: Contribution) => {
      const { data } = await api.post<ApiEnvelope<{ goal: SavingsGoal; completed_now: boolean }>>(
        `/savings-goals/${goalId}/contributions`,
        contribution,
      );
      return data.data;
    },
    onSuccess: ({ goal, completed_now }) => {
      if (completed_now) {
        void celebrate();
        useAlfredStore.getState().say({
          mood: "proud",
          title: `Goal reached: ${goal.name}`,
          message: "Every dollar accounted for, sir. Lucius would approve.",
        });
      }
    },
    onSettled: () => refreshAll(queryClient),
  });
}
