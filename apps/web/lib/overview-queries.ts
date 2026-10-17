import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { queryKeys } from "./queries";
import type { ApiEnvelope, Insights, Overview, OverviewPeriodName, WeeklyReport } from "./types";

/** `start` and `end` (Y-m-d) only for custom periods. */
export type OverviewParams = { period: OverviewPeriodName; start?: string; end?: string };

export const overviewKeys = {
  all: ["overview"] as const,
  data: (params: OverviewParams) => ["overview", "data", params] as const,
  insights: ["overview", "insights"] as const,
  report: ["overview", "report"] as const,
  reports: ["overview", "reports"] as const,
};

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(url, { params });
  return data.data;
}

export function useOverview(params: OverviewParams) {
  return useQuery({
    queryKey: overviewKeys.data(params),
    queryFn: () => get<Overview>("/overview", params),
    // Keeps the charts on screen while another period loads.
    placeholderData: keepPreviousData,
  });
}

export function useInsights() {
  return useQuery({
    queryKey: overviewKeys.insights,
    queryFn: () => get<Insights>("/overview/insights"),
    // The API caches them for a day.
    staleTime: 60 * 60_000,
  });
}

export function useRefreshInsights() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiEnvelope<Insights>>("/overview/insights/generate");
      return data.data;
    },
    onSuccess: (insights) => {
      queryClient.setQueryData(overviewKeys.insights, insights);
      // A new energy pattern can move focus blocks.
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/** This week so far. */
export function useWeeklyReport() {
  return useQuery({
    queryKey: overviewKeys.report,
    queryFn: () => get<WeeklyReport>("/overview/report", { period: "week" }),
  });
}

/** Reports saved on Sunday nights, newest first. */
export function useWeeklyReports(enabled: boolean) {
  return useQuery({
    queryKey: overviewKeys.reports,
    queryFn: () => get<WeeklyReport[]>("/overview/reports"),
    enabled,
  });
}
