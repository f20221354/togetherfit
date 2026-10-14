export interface NavItem {
  key: string;
  label: string;
  shortLabel: string;
  href: string;
  icon: string;
}

/**
 * Order matters: Connect + Move & Coach (action/social) first, then the
 * wellness/self-monitoring modules. Sanctuary and Circadian Arc share one
 * tab (/sanctuary, with Circadian as an internal section) — they still
 * keep separate ModuleKeys internally so their activity logs stay distinct.
 */
export const NAV_ITEMS: NavItem[] = [
  { key: "connect", label: "Connect", shortLabel: "Connect", href: "/connect", icon: "🤝" },
  { key: "move", label: "Move & Coach", shortLabel: "Move", href: "/move", icon: "🏋️" },
  { key: "sanctuary", label: "Sanctuary", shortLabel: "Sanctuary", href: "/sanctuary", icon: "🌿" },
  { key: "posture", label: "Posture & Gaze Guard", shortLabel: "Posture", href: "/posture", icon: "👁" },
  { key: "urgesurfer", label: "UrgeSurfer", shortLabel: "Reset", href: "/urgesurfer", icon: "🫁" },
];

/** The wellness/self-monitoring modules, reachable from the mobile "Personal" tab. */
export const PERSONAL_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter(
  (item) => item.key !== "connect" && item.key !== "move"
);

/** Single shared config — the desktop Sidebar and the mobile BottomTabBar both render from these, never a second list. */
export const OVERVIEW_ITEM: NavItem = { key: "overview", label: "Overview", shortLabel: "Home", href: "/", icon: "🏠" };
export const ACTION_ITEMS: NavItem[] = NAV_ITEMS.filter((item) => item.key === "connect" || item.key === "move");
export const WELLNESS_ITEMS: NavItem[] = NAV_ITEMS.filter((item) => item.key !== "connect" && item.key !== "move");

/** Mobile bottom tab bar. "Personal" also covers the wellness modules and Settings. */
export const PERSONAL_TAB: NavItem = { key: "personal", label: "Personal", shortLabel: "Personal", href: "/personal", icon: "👤" };
export const PERSONAL_TAB_PATHS = ["/personal", "/settings", ...PERSONAL_NAV_ITEMS.map((item) => item.href)];
