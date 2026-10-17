"use client";

import { buttonVariants } from "@gotham/ui/components/ui/button";
import { cn } from "@gotham/ui/lib/utils";
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import Link from "next/link";
import { useIntelEntry } from "@/lib/intel-queries";
import type { IntelEntry } from "@/lib/types";
import { IntelNotFound } from "./intel-not-found";
import { EntrySkeleton } from "./intel-skeletons";
import { LevelMeter } from "./level-meter";
import { longDate, moodOf } from "./moods";
import { RICH_TEXT_CLASS } from "./rich-text";

const SENTIMENT_STYLES: Record<NonNullable<IntelEntry["sentiment_label"]>, string> = {
  positive: "border-emerald-500/40 text-emerald-400",
  neutral: "border-border text-muted-foreground",
  negative: "border-red-500/40 text-red-400",
};

function Section({ title, children }: { title: string; children: string }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="font-mono text-xs tracking-[0.2em] text-muted-foreground">{title}</h3>
      <p className="mt-2 whitespace-pre-line">{children}</p>
    </section>
  );
}

export function IntelView({ id }: { id: number }) {
  const { data, isPending, isError } = useIntelEntry(id);

  if (isPending) return <EntrySkeleton />;
  if (isError) return <IntelNotFound />;

  const { entry, previous_id: previousId, next_id: nextId } = data;
  const mood = moodOf(entry.mood);

  return (
    <article className="mx-auto grid max-w-3xl gap-6">
      <Link href="/intel" className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        Intel
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{longDate(entry.date)}</h2>
          {entry.sentiment_label && (
            <span
              className={cn("w-fit rounded-full border px-2 py-0.5 text-xs", SENTIMENT_STYLES[entry.sentiment_label])}
              title="From the words in this entry"
            >
              {entry.sentiment_label} sentiment
            </span>
          )}
        </div>
        <Link href={`/intel/${entry.id}/edit`} className={buttonVariants({ variant: "outline" })}>
          <Pencil aria-hidden />
          Edit
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div
          className="flex items-center gap-3 rounded-xl border p-4"
          style={{ borderColor: `${mood.color}66`, backgroundColor: `${mood.color}14` }}
        >
          <span className="text-4xl" aria-hidden>
            {mood.emoji}
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Mood</p>
            <p className="font-medium" style={{ color: mood.color }}>
              {mood.label}
            </p>
          </div>
        </div>
        <LevelMeter label="Energy" level={entry.energy_level} tone="energy" />
        <LevelMeter label="Stress" level={entry.stress_level} tone="stress" />
      </div>

      {/* Sanitized on the server (App\Support\RichText): basic tags, no attributes. */}
      <div className={RICH_TEXT_CLASS} dangerouslySetInnerHTML={{ __html: entry.content }} />

      {entry.gratitude && <Section title="GRATEFUL FOR">{entry.gratitude}</Section>}
      {(entry.wins || entry.struggles) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {entry.wins && <Section title="WENT WELL">{entry.wins}</Section>}
          {entry.struggles && <Section title="CHALLENGING">{entry.struggles}</Section>}
        </div>
      )}

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.map((tag) => (
            <span key={tag} className="rounded bg-secondary px-1.5 py-0.5 text-xs">
              {tag}
            </span>
          ))}
        </div>
      )}

      <nav className="flex justify-between gap-3 border-t border-border pt-4" aria-label="Other entries">
        {previousId ? (
          <Link href={`/intel/${previousId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            <ChevronLeft aria-hidden />
            Previous entry
          </Link>
        ) : (
          <span />
        )}
        {nextId && (
          <Link href={`/intel/${nextId}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
            Next entry
            <ChevronRight aria-hidden />
          </Link>
        )}
      </nav>

      <p className="text-center text-sm text-primary italic">&ldquo;Intel filed, sir. Gotham&apos;s patterns are becoming clearer.&rdquo;</p>
    </article>
  );
}
