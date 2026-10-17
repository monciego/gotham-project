import { BracketCard } from "@gotham/ui/components/bracket-card";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { say } from "@/lib/alfred";
import { SECTIONS } from "@/lib/nav";

type SectionPageProps = { params: Promise<{ section: string }> };

/**
 * Placeholder for sections that aren't built yet. A real page at
 * app/(gotham)/<section>/page.tsx takes precedence over this one.
 */
export async function generateMetadata({ params }: SectionPageProps): Promise<Metadata> {
  const title = SECTIONS[(await params).section];
  return { title: title ? `${title} · Gotham Project` : "Gotham Project" };
}

export default async function SectionPage({ params }: SectionPageProps) {
  const title = SECTIONS[(await params).section];
  if (!title) {
    notFound();
  }

  return (
    <BracketCard className="mx-auto mt-8 max-w-lg p-8 text-center">
      <p className="font-mono text-xs tracking-[0.3em] text-primary">{title.toUpperCase()}</p>
      <p className="mt-3 text-muted-foreground">{say("comingSoon", 0)}</p>
    </BracketCard>
  );
}
