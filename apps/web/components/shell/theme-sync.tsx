"use client";

import { useEffect } from "react";
import { useMe } from "@/lib/queries";
import { applyTheme } from "@/lib/theme";

/** Applies the account's theme, e.g. one chosen on another device. */
export function ThemeSync() {
  const theme = useMe().data?.theme;

  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);

  return null;
}
