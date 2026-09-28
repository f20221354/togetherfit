"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { PERSONAL_NAV_ITEMS } from "./navItems";

const MOBILE_TABS = [
  { key: "home", label: "Home", icon: "🏠", href: "/" },
  { key: "connect", label: "Connect", icon: "🤝", href: "/connect" },
  { key: "move", label: "Move", icon: "🏋️", href: "/move" },
  { key: "personal", label: "Personal", icon: "👤", href: "/personal" },
];

export function MobileNav() {
  const pathname = usePathname();
  const onPersonalModule = PERSONAL_NAV_ITEMS.some((item) => pathname.startsWith(item.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur md:hidden">
      {MOBILE_TABS.map((tab) => {
        const active =
          tab.key === "personal" ? pathname === "/personal" || onPersonalModule : pathname === tab.href;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={clsx(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
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
