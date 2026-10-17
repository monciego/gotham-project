import { create } from "zustand";
import { api, authApi } from "@/lib/api";
import type { ApiEnvelope, User } from "@/lib/types";

export type LoginInput = { email: string; password: string; remember: boolean };

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  timezone: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Rejects with ApiError, so forms can show Laravel's validation errors. */
  login: (input: LoginInput) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<User | null>;
};

export const useAuthStore = create<AuthState>()((set) => {
  /** Runs a request with isLoading set, and stores the user it returns. */
  async function track(request: () => Promise<User | null>) {
    set({ isLoading: true });
    try {
      const user = await request();
      set({ user, isAuthenticated: user !== null });
      return user;
    } finally {
      set({ isLoading: false });
    }
  }

  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,

    login: async (input) =>
      (await track(async () => {
        const { data } = await authApi.post<ApiEnvelope<{ user: User }>>("/login", input);
        return data.data.user;
      }))!,

    register: async (input) =>
      (await track(async () => {
        const { data } = await authApi.post<ApiEnvelope<{ user: User }>>("/register", input);
        return data.data.user;
      }))!,

    logout: async () => {
      await track(async () => {
        await authApi.post("/logout");
        return null;
      });
    },

    fetchUser: () =>
      track(async () => {
        const { data } = await api.get<ApiEnvelope<User>>("/auth/me");
        return data.data;
      }).catch(() => {
        set({ user: null, isAuthenticated: false });
        return null;
      }),
  };
});
