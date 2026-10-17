/** Where signed-in users land. HQ is Gotham's name for the dashboard. */
export const HOME = "/hq";

/** Signed-in users are sent away from these to HOME. */
export const AUTH_PAGES = ["/login", "/register"];

/** Signed-out users are sent from these to /login. */
const PROTECTED_PREFIXES = [
  "/hq",
  "/missions",
  "/arsenal",
  "/intel",
  "/resources",
  "/operations",
  "/cases",
  "/overview",
  "/trophies",
  "/settings",
  "/profile",
];

export function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Only follow same-site paths from ?next=, so it can't be used as an open redirect. */
export function safeNext(next: string | string[] | undefined): string {
  const value = Array.isArray(next) ? next[0] : next;
  return value?.startsWith("/") && !value.startsWith("//") ? value : HOME;
}
