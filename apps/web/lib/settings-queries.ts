import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAlfredStore } from "@/stores/alfred";
import { api } from "./api";
import { queryKeys } from "./queries";
import { applyTheme } from "./theme";
import type { ApiEnvelope, Mode, ModeSwitch, Settings, SettingsInput, User } from "./types";

export const settingsKeys = {
  all: ["settings"] as const,
};

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: async () => (await api.get<ApiEnvelope<Settings>>("/settings")).data.data,
  });
}

/** Keeps the cached user in step with saved settings, so the header and theme follow at once. */
function patchMe(queryClient: QueryClient, changes: Partial<User>) {
  queryClient.setQueryData<User>(queryKeys.me, (user) => user && { ...user, ...changes });
}

/** Saves any subset. The form shows the change at once and rolls back on error. */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SettingsInput) =>
      (await api.put<ApiEnvelope<Settings>>("/settings", input)).data.data,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.all });
      const previous = queryClient.getQueryData<Settings>(settingsKeys.all);
      const previousUser = queryClient.getQueryData<User>(queryKeys.me);

      if (previous) {
        const next = {
          ...previous,
          ...input,
          notification_preferences: { ...previous.notification_preferences, ...input.notification_preferences },
        };
        queryClient.setQueryData<Settings>(settingsKeys.all, next);
        patchMe(queryClient, next);
      }
      if (input.theme) applyTheme(input.theme);

      return { previous, previousUser };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(settingsKeys.all, context.previous);
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.me, context.previousUser);
        applyTheme(context.previousUser.theme);
      }
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKeys.all, settings);
      patchMe(queryClient, settings);
    },
  });
}

/**
 * Switches the life mode. The pill, sidebar accent and settings change at
 * once; HQ's brief, today's habits and the calendar refetch for the new mode.
 * Alfred announces it.
 */
export function useSwitchMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mode: Mode) =>
      (await api.put<ApiEnvelope<ModeSwitch>>("/settings/mode", { mode })).data.data,
    onMutate: async (mode) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.me });
      const previous = queryClient.getQueryData<User>(queryKeys.me);
      patchMe(queryClient, { current_mode: mode });
      queryClient.setQueryData<Settings>(settingsKeys.all, (settings) => settings && { ...settings, current_mode: mode });
      return { previous };
    },
    onError: (error, _mode, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.me, context.previous);
        queryClient.setQueryData<Settings>(
          settingsKeys.all,
          (settings) => settings && { ...settings, current_mode: context.previous!.current_mode },
        );
      }
      useAlfredStore.getState().say({ mood: "concerned", title: "The mode didn't change, sir.", message: error.message });
    },
    onSuccess: ({ user, announcement }) => {
      queryClient.setQueryData(queryKeys.me, user);
      useAlfredStore.getState().say({ mood: "encouraging", ...announcement });
    },
    onSettled: () => {
      // Grace, mode-specific habits and the brief all depend on the mode.
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: ["arsenal"] });
      void queryClient.invalidateQueries({ queryKey: ["operations"] });
    },
  });
}

export type ProfileInput = {
  name: string;
  email: string;
  timezone: string;
  /** A new image, null to remove the current one, or undefined to keep it. */
  avatar?: File | null;
};

/**
 * PUT /auth/profile. Sent as POST with `_method`, since PHP only reads
 * multipart bodies (the avatar) on POST.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ avatar, ...fields }: ProfileInput) => {
      const body = new FormData();
      body.append("_method", "PUT");
      Object.entries(fields).forEach(([key, value]) => body.append(key, value));
      if (avatar !== undefined) body.append("avatar", avatar ?? "");

      return (await api.post<ApiEnvelope<User>>("/auth/profile", body)).data.data;
    },
    onSuccess: (user) => queryClient.setQueryData(queryKeys.me, user),
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (input: { current_password: string; password: string; password_confirmation: string }) =>
      api.put("/auth/password", input),
  });
}

/** Deletes the account for good. The proxy clears the cookie when it succeeds. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (password: string) => api.delete("/auth/account", { data: { password } }),
    onSuccess: () => queryClient.clear(),
  });
}

/** Downloads the ZIP of all the user's data. */
export async function exportData() {
  const { data, headers } = await api.get<Blob>("/settings/export", { responseType: "blob" });
  const name = /filename="?([^";]+)"?/.exec(String(headers["content-disposition"] ?? ""))?.[1] ?? "gotham-export.zip";
  const url = URL.createObjectURL(data);
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  link.click();
  URL.revokeObjectURL(url);
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => (await api.post<ApiEnvelope<User>>("/onboarding/complete")).data.data,
    onSuccess: (user) => queryClient.setQueryData(queryKeys.me, user),
  });
}
