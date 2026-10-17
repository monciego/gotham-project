import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FocusState = {
  /** The session the timer is counting down, or null. */
  sessionId: number | null;
  /** When the countdown reaches 0, in epoch ms. */
  endsAt: number | null;
  distractions: number;
  /** Starts tracking a session. Re-tracking the same one keeps its distractions. */
  track: (sessionId: number, endsAt: number) => void;
  addDistraction: () => void;
  clear: () => void;
};

/**
 * The running focus session's countdown. It lives outside the page, so the
 * timer survives re-renders and navigation; it's also kept in localStorage,
 * so the distraction count survives a reload.
 */
export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      endsAt: null,
      distractions: 0,
      track: (sessionId, endsAt) =>
        set(get().sessionId === sessionId ? { endsAt } : { sessionId, endsAt, distractions: 0 }),
      addDistraction: () => set((state) => ({ distractions: state.distractions + 1 })),
      clear: () => set({ sessionId: null, endsAt: null, distractions: 0 }),
    }),
    {
      name: "gotham-focus",
      // Private windows and blocked storage throw; the timer still works without it.
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          try {
            return localStorage.getItem(name);
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, value);
          } catch {
            // Not saved; the count just won't survive a reload.
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch {
            // Nothing stored to remove.
          }
        },
      })),
    },
  ),
);
