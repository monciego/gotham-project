import type { Metadata } from "next";
import { SettingsPage } from "@/components/settings/settings-page";

export const metadata: Metadata = { title: "Settings · Gotham Project" };

export default function Page() {
  // Built on the server so the browser hydrates the same option list.
  const timezones = Intl.supportedValuesOf("timeZone");
  if (!timezones.includes("UTC")) {
    timezones.unshift("UTC");
  }

  return <SettingsPage timezones={timezones} />;
}
