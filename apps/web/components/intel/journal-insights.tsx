"use client";

import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { SectionCard } from "@/components/section-card";
import type { IntelInsights } from "@/lib/types";
import { levelWord, moodOf, shortDate } from "./moods";

/** Mood over the last 7 days, this week's energy and the most used tags. */
export function JournalInsights({ insights }: { insights: IntelInsights | undefined }) {
  return (
    <SectionCard title="INSIGHTS">
      {!insights ? (
        <div className="grid gap-3" aria-busy>
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      ) : (
        <dl className="grid gap-5 text-sm">
          <div className="grid gap-2">
            <dt className="text-xs text-muted-foreground">Mood, last 7 days</dt>
            <dd className="flex justify-between gap-1">
              {insights.mood_trend.map(({ date, mood }) => {
                const meta = mood && moodOf(mood);
                return (
                  <span
                    key={date}
                    title={`${shortDate(date)}: ${meta?.label ?? "No entry"}`}
                    aria-label={`${shortDate(date)}: ${meta?.label ?? "No entry"}`}
                    role="img"
                    className="size-6 rounded-full border border-border"
                    style={meta ? { backgroundColor: meta.color, borderColor: meta.color } : undefined}
                  />
                );
              })}
            </dd>
          </div>
          <div className="grid gap-1">
            <dt className="text-xs text-muted-foreground">Average energy this week</dt>
            <dd className="font-mono">
              {insights.average_energy === null ? (
                "–"
              ) : (
                <>
                  <span className="text-lg text-primary">{insights.average_energy}</span>
                  <span className="text-muted-foreground"> / 10 · {levelWord(insights.average_energy)}</span>
                </>
              )}
            </dd>
          </div>
          <div className="grid gap-1.5">
            <dt className="text-xs text-muted-foreground">Most used tags</dt>
            <dd className="flex flex-wrap gap-1.5">
              {insights.top_tags.length === 0
                ? "–"
                : insights.top_tags.map(({ tag, count }) => (
                    <span key={tag} className="rounded bg-secondary px-1.5 py-0.5 text-xs">
                      {tag} <span className="font-mono text-muted-foreground">{count}</span>
                    </span>
                  ))}
            </dd>
          </div>
        </dl>
      )}
    </SectionCard>
  );
}
