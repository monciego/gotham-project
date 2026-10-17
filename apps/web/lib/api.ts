import axios, { type AxiosError, type AxiosInstance } from "axios";
import { useRewardsStore } from "@/stores/rewards";
import { AUTH_PAGES } from "./routes";
import type { ApiEnvelope, Rewards } from "./types";

/** Every failed request rejects with this, whatever went wrong. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    /** Laravel validation errors, keyed by field. */
    public errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ClientOptions = {
  baseURL: string;
  /** Supplies the Bearer token. Only server code can, since the cookie is httpOnly. */
  getToken?: () => Promise<string | undefined>;
  onUnauthorized?: () => void;
  /** Called with what a successful request earned (`rewards` in the envelope). */
  onRewards?: (rewards: Rewards) => void;
};

export function createApiClient({
  baseURL,
  getToken,
  onUnauthorized,
  onRewards,
}: ClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL,
    headers: { Accept: "application/json" },
  });

  client.interceptors.request.use(async (config) => {
    const token = await getToken?.();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const rewards = (response.data as Partial<ApiEnvelope<unknown>> | undefined)?.rewards;
      if (rewards) {
        onRewards?.(rewards);
      }
      return response;
    },
    (error: AxiosError<Partial<ApiEnvelope<unknown>>>) => {
      const status = error.response?.status ?? 0;
      if (status === 401) {
        onUnauthorized?.();
      }

      const body = error.response?.data;
      const message =
        body?.message ||
        (status ? "Something went wrong." : "Could not reach the server.");

      return Promise.reject(new ApiError(message, status, body?.errors ?? {}));
    },
  );

  return client;
}

function redirectToLogin() {
  if (typeof window === "undefined" || AUTH_PAGES.includes(window.location.pathname)) {
    return;
  }
  const next = window.location.pathname + window.location.search;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

/**
 * For browser code. Requests go to the same-origin /api/backend proxy, which
 * adds the token from the cookie and forwards them to Laravel's /api/v1.
 */
export const api = createApiClient({
  baseURL: "/api/backend",
  onUnauthorized: redirectToLogin,
  // Any response can carry trophies, a level or XP; RewardsHost celebrates them.
  onRewards: (rewards) => useRewardsStore.getState().receive(rewards),
});

/** Login, register and logout: Next.js routes that set or clear the cookie. */
export const authApi = createApiClient({ baseURL: "/api/auth" });
