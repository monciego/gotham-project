"use client";

import { cn } from "@gotham/ui/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useUpdateSettings } from "@/lib/settings-queries";
import type { Settings, Theme } from "@/lib/types";
import { SettingsSection } from "./settings-section";

const THEMES: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
];

export function AppearanceSection({ settings }: { settings: Settings }) {
  const update = useUpdateSettings();

  return (
    <SettingsSection id="appearance" title="Appearance" description="The cave is dark by default.">
      <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-lg border border-border p-1">
        {THEMES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={settings.theme === value}
            onClick={() => value !== settings.theme && update.mutate({ theme: value })}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md px-4 text-sm transition-colors duration-200",
              settings.theme === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </SettingsSection>
  );
}
