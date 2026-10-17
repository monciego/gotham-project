"use client";

import { ModeCards } from "@/components/shell/mode-cards";
import { useSwitchMode } from "@/lib/settings-queries";
import type { Settings } from "@/lib/types";
import { SettingsSection } from "./settings-section";

export function ModeSection({ settings }: { settings: Settings }) {
  const switchMode = useSwitchMode();

  return (
    <SettingsSection id="mode" title="Life mode" description="Also in the header: click the mode pill.">
      <ModeCards
        value={settings.current_mode}
        detailed
        onChange={(mode) => mode !== settings.current_mode && switchMode.mutate(mode)}
      />
    </SettingsSection>
  );
}
