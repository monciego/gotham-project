import { cn } from "@gotham/ui/lib/utils";
import { Lock } from "lucide-react";
import type { Trophy } from "@/lib/types";
import { RARITY, trophyIcon } from "./trophy-icons";

const EARNED_ON = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** "Complete 100 missions (47/100)": the description without its full stop, with the count. */
function criteria(trophy: Trophy): string {
  const text = trophy.description.replace(/\.$/, "");
  return trophy.progress ? `${text} (${trophy.progress.current.toLocaleString("en-US")}/${trophy.progress.target.toLocaleString("en-US")})` : text;
}

export function AchievementCard({ trophy }: { trophy: Trophy }) {
  const Icon = trophyIcon(trophy.icon);
  const rarity = RARITY[trophy.rarity];
  const percent = trophy.progress ? Math.round((trophy.progress.current / trophy.progress.target) * 100) : 0;

  if (trophy.earned) {
    return (
      <article
        className="group relative grid gap-3 rounded-xl border border-primary/60 bg-card p-5 transition-colors duration-200 hover:bg-primary/5"
        aria-label={`${trophy.name}, earned`}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-12 place-items-center rounded-full border border-primary/50 bg-primary/10">
            <Icon className="size-6 text-primary" aria-hidden />
          </span>
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
            +{trophy.xp_reward} XP
          </span>
        </div>
        <div>
          <h3 className="font-semibold">{trophy.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{trophy.description}</p>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={rarity.text}>{rarity.label}</span>
          {trophy.earned_at && <span className="text-muted-foreground">Earned {EARNED_ON.format(new Date(trophy.earned_at))}</span>}
        </div>
      </article>
    );
  }

  return (
    <article
      className="group relative grid gap-3 rounded-xl border border-border bg-zinc-900/60 p-5 transition-colors duration-200 hover:border-zinc-600"
      aria-label={`${trophy.name}, locked`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="relative grid size-12 place-items-center rounded-full border border-border bg-black/40">
          <Icon className="size-6 text-zinc-600 blur-[2px]" aria-hidden />
          <Lock className="absolute size-4 text-zinc-400" aria-hidden />
        </span>
        <span className="font-mono text-xs text-zinc-500">+{trophy.xp_reward} XP</span>
      </div>
      <div>
        <h3 className="font-semibold text-zinc-300">{trophy.name}</h3>
        <p className="mt-1 text-sm text-zinc-500">{criteria(trophy)}</p>
      </div>
      {trophy.progress && (
        <div
          role="progressbar"
          aria-label={`${trophy.name} progress`}
          aria-valuenow={trophy.progress.current}
          aria-valuemin={0}
          aria-valuemax={trophy.progress.target}
          className="h-1.5 overflow-hidden rounded-full bg-zinc-800"
        >
          <div className={cn("h-full rounded-full bg-zinc-400", percent > 0 && "min-w-1")} style={{ width: `${percent}%` }} />
        </div>
      )}
      <span className={cn("text-xs opacity-70", rarity.text)}>{rarity.label}</span>
    </article>
  );
}
