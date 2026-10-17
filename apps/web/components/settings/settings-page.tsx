"use client";

import { Skeleton } from "@gotham/ui/components/ui/skeleton";
import { Button } from "@gotham/ui/components/ui/button";
import { say } from "@/lib/alfred";
import { useMe } from "@/lib/queries";
import { useSettings } from "@/lib/settings-queries";
import { AlfredSection } from "./alfred-section";
import { AppearanceSection } from "./appearance-section";
import { DataSection } from "./data-section";
import { ModeSection } from "./mode-section";
import { NotificationsSection } from "./notifications-section";
import { ProfileSection } from "./profile-section";
import { WorkHoursSection } from "./work-hours-section";

const CONTENTS = [
  ["profile", "Profile"],
  ["work-hours", "Work hours"],
  ["alfred", "Alfred"],
  ["mode", "Life mode"],
  ["notifications", "Notifications"],
  ["appearance", "Appearance"],
  ["data", "Data"],
] as const;

export function SettingsPage({ timezones }: { timezones: string[] }) {
  const me = useMe();
  const settings = useSettings();

  if (me.isError || settings.isError) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-muted-foreground">{say("error", 0)}</p>
        <Button variant="outline" className="mt-4" onClick={() => void Promise.all([me.refetch(), settings.refetch()])}>
          Try again
        </Button>
      </div>
    );
  }

  if (!me.data || !settings.data) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[11rem_1fr]">
      <nav aria-label="Settings sections" className="hidden lg:block">
        <ul className="sticky top-24 grid gap-1 text-sm">
          {CONTENTS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="block rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid min-w-0 gap-6">
        <ProfileSection user={me.data} timezones={timezones} />
        <WorkHoursSection settings={settings.data} />
        <AlfredSection settings={settings.data} />
        <ModeSection settings={settings.data} />
        <NotificationsSection settings={settings.data} />
        <AppearanceSection settings={settings.data} />
        <DataSection />
      </div>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[11rem_1fr]" aria-busy>
      <div className="hidden gap-2 lg:grid lg:content-start">
        {CONTENTS.map(([id]) => (
          <Skeleton key={id} className="h-6 w-28" />
        ))}
      </div>
      <div className="grid gap-6">
        {[0, 1, 2].map((section) => (
          <div key={section} className="grid gap-4 rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-full max-w-md" />
            <Skeleton className="h-8 w-full max-w-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}
