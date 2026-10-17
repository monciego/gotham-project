import Link from "next/link";
import type { IntelEntry } from "@/lib/types";
import { moodOf, shortDate } from "./moods";

export function EntryCard({ entry }: { entry: IntelEntry }) {
  const mood = moodOf(entry.mood);

  return (
    <article className="relative flex gap-4 rounded-xl border border-border bg-card p-4 transition-colors duration-200 hover:border-primary/40">
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-2xl"
        style={{ backgroundColor: `${mood.color}26` }}
        aria-label={mood.label}
        role="img"
      >
        {mood.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <Link href={`/intel/${entry.id}`} className="font-medium after:absolute after:inset-0 hover:text-primary">
          {shortDate(entry.date)}
        </Link>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{entry.excerpt}</p>
        {entry.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <span key={tag} className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
