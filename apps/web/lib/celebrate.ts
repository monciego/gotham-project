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

/** Bursts from a few points over two seconds, for reaching a level. */
export async function fireworks() {
  const { default: confetti } = await import("canvas-confetti");
  const colors = ["#d4af37", "#f5e6a8", "#ededed", "#8b5cf6"];

  for (let burst = 0; burst < 5; burst++) {
    setTimeout(() => {
      void confetti({
        particleCount: 70,
        spread: 360,
        startVelocity: 28,
        ticks: 90,
        gravity: 0.8,
        origin: { x: 0.2 + Math.random() * 0.6, y: 0.2 + Math.random() * 0.35 },
        colors,
        disableForReducedMotion: true,
      });
    }, burst * 400);
  }
}

/** Confetti and the overlay for a case passing a mark; the API posts Alfred's message to HQ. */
export function celebrateCaseMark(caseId: number, name: string, mark: CaseMark) {
  void celebrate();
  useCelebrationStore.getState().show({ caseId, name, mark });
}
