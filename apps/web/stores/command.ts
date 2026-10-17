import { create } from "zustand";

/** The global overlays: opened by keyboard shortcuts or from the shell. */
export type Overlay = "search" | "shortcuts" | "focus" | "mode";

type CommandState = {
  open: Overlay | null;
  show: (overlay: Overlay) => void;
  /** Opens the overlay, or closes it if it's the one showing. */
  toggle: (overlay: Overlay) => void;
  close: () => void;
};

export const useCommandStore = create<CommandState>()((set) => ({
  open: null,
  show: (overlay) => set({ open: overlay }),
  toggle: (overlay) => set((state) => ({ open: state.open === overlay ? null : overlay })),
  close: () => set({ open: null }),
}));
