import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { ApiEnvelope, SearchResponse } from "./types";

export const MIN_SEARCH_LENGTH = 2;

export const searchKeys = {
  all: ["search"] as const,
  query: (q: string) => ["search", q] as const,
};

/** GET /search, once the (already debounced) query is long enough. The last results stay while the next load. */
export function useSearch(query: string) {
  const q = query.trim();

  return useQuery({
    queryKey: searchKeys.query(q),
    queryFn: async () => (await api.get<ApiEnvelope<SearchResponse>>("/search", { params: { q } })).data.data,
    enabled: q.length >= MIN_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

const RECENT_KEY = "gotham-recent-searches";
const RECENT_LIMIT = 5;

/** The last five searches that led somewhere, newest first. */
export function recentSearches(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === "string").slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

export function rememberSearch(query: string) {
  const q = query.trim();
  if (q.length < MIN_SEARCH_LENGTH) return;

  const next = [q, ...recentSearches().filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private windows); recent searches are a nicety.
  }
}
