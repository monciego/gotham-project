import { AlertTriangle, Frown, Info, ThumbsUp, type LucideIcon } from "lucide-react";
import type { AlfredMood } from "@/lib/types";

export const MOOD_ICONS: Record<AlfredMood, { icon: LucideIcon; className: string }> = {
  concerned: { icon: AlertTriangle, className: "text-amber-500" },
  proud: { icon: ThumbsUp, className: "text-emerald-500" },
  disappointed: { icon: Frown, className: "text-red-500" },
  encouraging: { icon: Info, className: "text-blue-500" },
};

export function MoodIcon({ mood, className }: { mood: AlfredMood; className?: string }) {
  const { icon: Icon, className: color } = MOOD_ICONS[mood];
  return <Icon className={`${color} ${className ?? ""}`} aria-hidden />;
}
