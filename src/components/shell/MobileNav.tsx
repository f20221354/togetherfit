"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

/** Mirrors the desktop sidebar 1:1, plus a direct Profile shortcut — nothing is tucked away where it can go unnoticed. */
const MOBILE_TABS = [
  { key: "home", label: "Home", icon: "🏠", href: "/" },
  { key: "connect", label: "Connect", icon: "🤝", href: "/connect" },
  { key: "move", label: "Move", icon: "🏋️", href: "/move" },
  { key: "sanctuary", label: "Sanctuary", icon: "🌿", href: "/sanctuary" },
  { key: "posture", label: "Posture", icon: "👁", href: "/posture" },
  { key: "urgesurfer", label: "Reset", icon: "🫁", href: "/urgesurfer" },
  { key: "profile", label: "Profile", icon: "👤", href: "/connect/my-profile" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t border-border bg-surface/95 backdrop-blur md:hidden">
      {MOBILE_TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={clsx(
              "flex shrink-0 basis-1/5 flex-col items-center gap-1 px-3 py-2.5 text-[11px] font-medium",
              active ? "text-accent-foreground" : "text-muted"
            )}
          >
            <span className="text-lg">{tab.icon}</span>
            {tab.label}
            {active && <span className="mt-0.5 h-1 w-1 rounded-full bg-accent" />}
          </Link>
        );
      })}
    </nav>
  );
}
