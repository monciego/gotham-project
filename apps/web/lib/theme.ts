import type { Theme } from "./types";

/** The browser's copy of the theme, read before the page paints (see THEME_SCRIPT). */
export const THEME_STORAGE_KEY = "gotham-theme";

/**
 * Runs in <head> before the first paint, so a light-theme user never sees
 * the dark page flash. The account's setting (ThemeSync) keeps it current.
 */
export const THEME_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="light"){var c=document.documentElement.classList;c.remove("dark");c.add("light")}}catch(e){}`;

/** Switches the page's theme now and remembers it for the next load. */
export function applyTheme(theme: Theme) {
  const classes = document.documentElement.classList;
  classes.toggle("dark", theme === "dark");
  classes.toggle("light", theme === "light");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private windows can refuse storage; the account setting still applies on load.
  }
}
