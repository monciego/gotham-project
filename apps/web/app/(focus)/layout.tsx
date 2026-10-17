import { Providers } from "@/components/providers";

/**
 * Full screen, nothing else on it: no sidebar, no header, and no Alfred
 * toasts (AlfredHost isn't rendered here), so nothing interrupts the work.
 */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="min-h-svh bg-black">{children}</div>
    </Providers>
  );
}
