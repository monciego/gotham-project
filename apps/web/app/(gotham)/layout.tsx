import { Providers } from "@/components/providers";
import { Header } from "@/components/shell/header";
import { Sidebar } from "@/components/shell/sidebar";

export default function GothamLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Sidebar />
      {/* Matches the sidebar: icon-only (4rem) on small screens, 256px from md up. */}
      <div className="min-h-svh pl-16 md:pl-64">
        <Header />
        <main className="mx-auto max-w-6xl p-4 md:p-8">{children}</main>
      </div>
    </Providers>
  );
}
