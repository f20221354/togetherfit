import { ModuleKey } from "@/lib/types";

export interface NavItem {
  key: ModuleKey;
  label: string;
  shortLabel: string;
  href: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "sanctuary", label: "Sanctuary", shortLabel: "Home", href: "/", icon: "🌿" },
  { key: "posture", label: "Posture & Gaze Guard", shortLabel: "Posture", href: "/posture", icon: "👁" },
  { key: "urgesurfer", label: "UrgeSurfer", shortLabel: "Reset", href: "/urgesurfer", icon: "🫁" },
  { key: "circadian", label: "Circadian Arc", shortLabel: "Circadian", href: "/circadian", icon: "☀️" },
  { key: "move", label: "Move & Coach", shortLabel: "Move", href: "/move", icon: "🏃" },
];

export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS;
