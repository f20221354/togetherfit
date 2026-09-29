"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { label: "Find Partners", href: "/connect" },
  { label: "Friends", href: "/connect/friends" },
  { label: "Messages", href: "/connect/messages" },
  { label: "Discover", href: "/connect/discover" },
  { label: "Trainers", href: "/connect/trainers" },
  { label: "My Profile", href: "/connect/my-profile" },
];

export function ConnectSubNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      {TABS.map((tab) => {
        const active = tab.href === "/connect" ? pathname === "/connect" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-accent/15 text-accent-foreground" : "bg-surface-2 text-muted hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
