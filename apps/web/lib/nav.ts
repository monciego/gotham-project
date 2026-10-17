import {
  BarChart3,
  BookOpen,
  Briefcase,
  Calendar,
  DollarSign,
  Home,
  type LucideIcon,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { HOME } from "./routes";

/** `label` is the Gotham name; `subtitle` the generic one, shown under it unless the user turns it off. */
export type NavItem = { href: string; label: string; subtitle: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: HOME, label: "HQ", subtitle: "Dashboard", icon: Home },
  { href: "/missions", label: "Missions", subtitle: "Tasks", icon: Target },
  { href: "/arsenal", label: "Arsenal", subtitle: "Habits", icon: Zap },
  { href: "/intel", label: "Intel", subtitle: "Journal", icon: BookOpen },
  { href: "/resources", label: "Resources", subtitle: "Finance", icon: DollarSign },
  { href: "/operations", label: "Operations", subtitle: "Calendar", icon: Calendar },
  { href: "/cases", label: "Cases", subtitle: "Projects", icon: Briefcase },
  { href: "/overview", label: "Overview", subtitle: "Analytics", icon: BarChart3 },
  { href: "/trophies", label: "Trophies", subtitle: "Achievements", icon: Trophy },
];

/** Pages reached from the user menu rather than the sidebar. */
const MENU_PAGES: Record<string, string> = {
  "/settings": "Settings",
  "/alfred": "Alfred",
};

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The section name shown in the header. */
export function sectionTitle(pathname: string): string {
  const item = NAV_ITEMS.find((nav) => isActive(pathname, nav.href));
  return item?.label ?? MENU_PAGES[pathname] ?? "Gotham";
}

/** Every section page, keyed by its path segment. */
export const SECTIONS: Record<string, string> = Object.fromEntries(
  [
    ...NAV_ITEMS.map((item): [string, string] => [item.href, item.label]),
    ...Object.entries(MENU_PAGES),
  ].map(([href, label]) => [href.slice(1), label]),
);
