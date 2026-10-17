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
