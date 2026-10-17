import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAlfredStore } from "@/stores/alfred";
import { api } from "./api";
import { queryKeys } from "./queries";
import type { AlfredActionResult, AlfredMessage, ApiEnvelope } from "./types";

type MessageList = { messages: AlfredMessage[]; unread_count: number };

/** How often new messages are fetched; the API's rounds run hourly. */
const POLL_MS = 5 * 60_000;

async function get<T>(url: string, params?: Record<string, string>): Promise<T> {
  const { data } = await api.get<ApiEnvelope<T>>(url, { params });
  return data.data;
}

/** Not dismissed: unread first, then most urgent (10 at most), with the unread count. */
export function useAlfredMessages() {
  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: () => get<MessageList>("/alfred/messages"),
    refetchInterval: POLL_MS,
  });
}

/** The latest 50, dismissed ones included, for the messages page. */
export function useAllAlfredMessages() {
  return useQuery({
    queryKey: [...queryKeys.alerts, "all"],
    queryFn: () => get<MessageList>("/alfred/messages", { scope: "all" }),
  });
}

/**
 * The message Alfred's panel shows: the first critical one not yet handled.
 * Reading it (in the bell, or asking for help) doesn't put it away.
 */
export function criticalMessage(data: MessageList | undefined): AlfredMessage | null {
  return (
    data?.messages.find((message) => message.priority === "critical" && !message.action_taken && !message.dismissed_at) ?? null
  );
}

/** Applies a change to the cached lists right away and returns an undo. */
async function patchMessages(queryClient: QueryClient, update: (list: MessageList) => MessageList) {
  await queryClient.cancelQueries({ queryKey: queryKeys.alerts });
  const snapshot = queryClient.getQueriesData<MessageList>({ queryKey: queryKeys.alerts });
  queryClient.setQueriesData<MessageList>({ queryKey: queryKeys.alerts }, (list) => list && update(list));
  return () => snapshot.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

const now = () => new Date().toISOString();

function markRead(list: MessageList, id: number, changes: Partial<AlfredMessage> = {}): MessageList {
  const wasUnread = list.messages.some((message) => message.id === id && !message.read_at);
  return {
    unread_count: Math.max(0, list.unread_count - (wasUnread ? 1 : 0)),
    messages: list.messages.map((message) =>
      message.id === id ? { ...message, read_at: message.read_at ?? now(), ...changes } : message,
    ),
  };
}

type Rollback = { rollback?: () => void };

function useMessageMutation(request: (id: number) => Promise<unknown>, changes: Partial<AlfredMessage> = {}) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, number, Rollback>({
    mutationFn: request,
    onMutate: async (id) => ({ rollback: await patchMessages(queryClient, (list) => markRead(list, id, changes)) }),
    onError: (_error, _id, context) => context?.rollback?.(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
  });
}

export const useDismissMessage = () =>
  useMessageMutation((id) => api.patch(`/alfred/messages/${id}/dismiss`), { dismissed_at: now() });

export const useReadMessage = () => useMessageMutation((id) => api.patch(`/alfred/messages/${id}/read`));

export function useReadAllMessages() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, void, Rollback>({
    mutationFn: () => api.patch("/alfred/messages/read-all"),
    onMutate: async () => ({
      rollback: await patchMessages(queryClient, (list) => ({
        unread_count: 0,
        messages: list.messages.map((message) => ({ ...message, read_at: message.read_at ?? now() })),
      })),
    }),
    onError: (_error, _variables, context) => context?.rollback?.(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
  });
}

/** What each action can change besides the message itself. */
const AFFECTS: Record<string, readonly (readonly string[])[]> = {
  force_start: [["missions"], ["focus-sessions"], queryKeys.dashboard],
  abandon: [["missions"], ["cases"], queryKeys.dashboard],
  complete_habit: [["arsenal"], queryKeys.dashboard, queryKeys.me],
  switch_mode: [queryKeys.me, queryKeys.dashboard, ["arsenal"]],
};

/**
 * Runs one of a message's actions (or records a followed link, `link`) and
 * does what the result says: navigate, have Alfred say something, or open
 * the "I'm stuck" help.
 */
export function useAlfredAction() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<{ message: AlfredMessage; result: AlfredActionResult }, Error, { id: number; action: string }, Rollback>({
    mutationFn: async ({ id, action }) => {
      const { data } = await api.post<ApiEnvelope<{ message: AlfredMessage; result: AlfredActionResult }>>(
        `/alfred/messages/${id}/action`,
        { action },
      );
      return data.data;
    },
    // Everything but asking for help puts the message away at once; help only reads it.
    onMutate: async ({ id, action }) => ({
      rollback: await patchMessages(queryClient, (list) =>
        markRead(list, id, action === "show_help" ? {} : { dismissed_at: now(), action_taken: true }),
      ),
    }),
    onError: (error, _variables, context) => {
      context?.rollback?.();
      useAlfredStore.getState().say({ mood: "concerned", title: "That didn't work, sir.", message: error.message });
    },
    onSuccess: ({ result }, { action }) => {
      const kind = action.split(":")[0]!;
      (AFFECTS[kind] ?? []).forEach((key) => void queryClient.invalidateQueries({ queryKey: [...key] }));

      if (result.type === "redirect") router.push(result.to);
      if (result.type === "toast") useAlfredStore.getState().say({ mood: "encouraging", title: result.title, message: result.message });
      if (result.type === "help") useAlfredStore.getState().openHelp(result.mission);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.alerts }),
  });
}
