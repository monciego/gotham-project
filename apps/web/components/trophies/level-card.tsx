import { BracketCard } from "@gotham/ui/components/bracket-card";
import type { LevelProgress, TrophyCase } from "@/lib/types";

const numberFormat = new Intl.NumberFormat("en-US");

export function LevelCard({ level, summary, name }: { level: LevelProgress; summary: TrophyCase["summary"]; name: string }) {
  const percent = Math.min(100, (level.xp_into_level / level.xp_per_level) * 100);

  return (
    <BracketCard className="grid gap-5 p-6 md:grid-cols-[auto_1fr] md:items-center md:gap-8">
      <div className="text-center md:text-left">
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground">LEVEL</p>
        <p className="font-mono text-7xl leading-none font-semibold text-primary">{level.current_level}</p>
      </div>
      <div className="grid gap-3">
        <p className="text-lg font-medium">{name}</p>
        <div
          role="progressbar"
          aria-label={`Progress to level ${level.current_level + 1}`}
          aria-valuenow={level.xp_into_level}
          aria-valuemin={0}
          aria-valuemax={level.xp_per_level}
          className="h-3 overflow-hidden rounded-full bg-secondary"
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span className="font-mono">
            {numberFormat.format(level.total_xp)} / {numberFormat.format(level.next_level_xp)} XP
            <span className="text-muted-foreground"> to Level {level.current_level + 1}</span>
          </span>
          <span className="text-muted-foreground">
            <span className="font-mono text-foreground">
              {summary.earned}/{summary.total}
            </span>{" "}
            trophies
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Total XP: {numberFormat.format(level.total_xp)}</p>
      </div>
    </BracketCard>
  );
}
