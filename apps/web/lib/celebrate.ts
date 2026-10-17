import { useCelebrationStore } from "@/stores/celebration";
import type { CaseMark } from "./types";

/** Gold confetti for streak milestones. Skipped for users who prefer reduced motion. */
export async function celebrate() {
  const { default: confetti } = await import("canvas-confetti");

  confetti({
    particleCount: 120,
    spread: 75,
    origin: { y: 0.7 },
    colors: ["#d4af37", "#f5e6a8", "#ededed"],
    disableForReducedMotion: true,
  });
}

/** Confetti and the overlay for a case passing a mark; the API posts Alfred's message to HQ. */
export function celebrateCaseMark(caseId: number, name: string, mark: CaseMark) {
  void celebrate();
  useCelebrationStore.getState().show({ caseId, name, mark });
}
