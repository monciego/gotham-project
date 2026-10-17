/** A simple butler figure: head, tailcoat, white shirt front and a gold bow tie. */
export function ButlerSilhouette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 64" className={className} role="img" aria-label="Alfred">
      {/* Hair and head */}
      <path d="M15 14c0-6 4-10 9-10s9 4 9 10c0 1 0 2-.3 3H15.3C15 16 15 15 15 14z" fill="#3a3a40" />
      <ellipse cx="24" cy="16" rx="8" ry="9" fill="#2a2a2e" />
      {/* Tailcoat */}
      <path d="M8 64c0-16 5-30 16-34 11 4 16 18 16 34z" fill="#1f1f23" stroke="#2d2d30" />
      {/* Shirt front */}
      <path d="M19 31l5 18 5-18c-2-1-3.5-1.5-5-1.5S21 30 19 31z" fill="#ededed" opacity="0.85" />
      {/* Bow tie */}
      <path d="M19 31.5l5 2.2 5-2.2v4.4l-5-2.2-5 2.2z" fill="#d4af37" />
      <circle cx="24" cy="33.7" r="1.2" fill="#d4af37" />
    </svg>
  );
}
