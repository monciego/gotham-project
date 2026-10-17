"use client";

import { Button } from "@gotham/ui/components/ui/button";
import { Input } from "@gotham/ui/components/ui/input";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/forms/switch";
import { say } from "@/lib/alfred";
import { useUpdateSettings } from "@/lib/settings-queries";
import type { NotificationSwitch, Settings } from "@/lib/types";
import { SaveStatus, SettingRow, SettingsSection } from "./settings-section";

export const NOTIFICATIONS: { key: NotificationSwitch; label: string; description: string }[] = [
  { key: "morning_brief", label: "Morning Brief", description: "The brief at the top of HQ." },
  {
    key: "habit_reminders",
    label: "Habit Reminders",
    description: "At a habit's reminder time. Saved for push notifications, which Gotham doesn't send yet.",
  },
  {
    key: "mission_deadlines",
    label: "Mission Deadlines",
    description: "Before a mission is due. Saved for push notifications, which Gotham doesn't send yet.",
  },
  { key: "alfred_alerts", label: "Alfred Alerts", description: "Nothing started yet, missions you keep avoiding, signs of burnout." },
  { key: "streak_warnings", label: "Streak Warnings", description: "At 8pm, when skipping today would end a streak." },
  { key: "achievement_unlocks", label: "Achievement Unlocks", description: "The trophy announcement and Alfred's note." },
];

export function NotificationsSection({ settings }: { settings: Settings }) {
  const update = useUpdateSettings();
  const preferences = settings.notification_preferences;

  return (
    <SettingsSection id="notifications" title="Notifications" description="When Alfred speaks up.">
      <div className="divide-y divide-border">
        {NOTIFICATIONS.map(({ key, label, description }) => (
          <SettingRow key={key} htmlFor={`notify-${key}`} label={label} description={description}>
            <Switch
              id={`notify-${key}`}
              checked={preferences[key]}
              onChange={(checked) => update.mutate({ notification_preferences: { [key]: checked } })}
            />
          </SettingRow>
        ))}
      </div>
      <QuietHours settings={settings} />
    </SettingsSection>
  );
}

function QuietHours({ settings }: { settings: Settings }) {
  const update = useUpdateSettings();
  const saved = settings.notification_preferences;
  const [start, setStart] = useState(saved.quiet_hours_start ?? "");
  const [end, setEnd] = useState(saved.quiet_hours_end ?? "");
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const changed = start !== (saved.quiet_hours_start ?? "") || end !== (saved.quiet_hours_end ?? "");

  function save(next: { quiet_hours_start: string | null; quiet_hours_end: string | null }) {
    setStatus(null);
    if (!next.quiet_hours_start !== !next.quiet_hours_end) {
      setStatus({ tone: "error", text: "Quiet hours need a start and an end, sir." });
      return;
    }
    update.mutate(
      { notification_preferences: next },
      {
        onSuccess: () => setStatus({ tone: "success", text: say("settingsSaved", 0) }),
        onError: (error) => setStatus({ tone: "error", text: error.message }),
      },
    );
  }

  return (
    <div className="mt-4 border-t border-border pt-5">
      <p className="text-sm font-medium">Quiet hours</p>
      <p className="text-xs text-muted-foreground">Alfred keeps his alerts and warnings to himself during these hours.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5 text-xs text-muted-foreground">
          From
          <Input type="time" value={start} onChange={(event) => setStart(event.target.value)} className="w-32" />
        </label>
        <label className="grid gap-1.5 text-xs text-muted-foreground">
          Until
          <Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="w-32" />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={!changed || update.isPending}
          onClick={() => save({ quiet_hours_start: start || null, quiet_hours_end: end || null })}
        >
          {update.isPending && <Loader2 className="animate-spin" aria-hidden />}
          Save
        </Button>
        {(saved.quiet_hours_start || saved.quiet_hours_end) && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStart("");
              setEnd("");
              save({ quiet_hours_start: null, quiet_hours_end: null });
            }}
          >
            Turn off
          </Button>
        )}
      </div>
      <div className="mt-2">
        <SaveStatus status={status} />
      </div>
    </div>
  );
}
