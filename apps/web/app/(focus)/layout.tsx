import { Providers } from "@/components/providers";
import { SuppressRewards } from "@/components/trophies/rewards-host";

/**
 * Full screen, nothing else on it: no sidebar, no header, and no Alfred
 * toasts (AlfredHost isn't rendered here) and no reward modals, so nothing
 * interrupts the work. The session summary shows XP and trophies itself.
 */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <SuppressRewards />
      <div className="min-h-svh bg-black">{children}</div>
    </Providers>
  );
}
