import { create } from "zustand";
import type { AlfredAction, AlfredMood } from "@/lib/types";

export type AlfredToast = {
  /** A new key replays the panel's entrance animation. */
  key: string;
  mood: AlfredMood;
  title: string;
  message: string;
  actions: AlfredAction[];
};

/** The "I'm stuck, Alfred" help, with the mission Alfred suggests starting on. */
export type AlfredHelp = { mission: { id: number; title: string } | null };

type AlfredState = {
  toast: AlfredToast | null;
  help: AlfredHelp | null;
  /** Alfred's panel, bottom-right, from anywhere in the app. Hides itself after a while. */
  say: (toast: Omit<AlfredToast, "key" | "actions"> & { actions?: AlfredAction[] }) => void;
  dismiss: () => void;
  openHelp: (mission: AlfredHelp["mission"]) => void;
  closeHelp: () => void;
};

const HIDE_AFTER_MS = 8000;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

export const useAlfredStore = create<AlfredState>()((set) => ({
  toast: null,
  help: null,
  say: (toast) => {
    clearTimeout(hideTimer);
    set({ toast: { actions: [], ...toast, key: `${Date.now()}` } });
    hideTimer = setTimeout(() => set({ toast: null }), HIDE_AFTER_MS);
  },
  dismiss: () => {
    clearTimeout(hideTimer);
    set({ toast: null });
  },
  openHelp: (mission) => set({ help: { mission } }),
  closeHelp: () => set({ help: null }),
}));
