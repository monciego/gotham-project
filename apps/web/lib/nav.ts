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

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: HOME, label: "HQ", icon: Home },
  { href: "/missions", label: "Missions", icon: Target },
  { href: "/arsenal", label: "Arsenal", icon: Zap },
  { href: "/intel", label: "Intel", icon: BookOpen },
  { href: "/resources", label: "Resources", icon: DollarSign },
  { href: "/operations", label: "Operations", icon: Calendar },
  { href: "/cases", label: "Cases", icon: Briefcase },
  { href: "/overview", label: "Overview", icon: BarChart3 },
  { href: "/trophies", label: "Trophies", icon: Trophy },
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
