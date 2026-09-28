"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { label: "🌿 Sanctuary", href: "/sanctuary" },
  { label: "☀️ Circadian Arc", href: "/sanctuary/circadian" },
];

export function SanctuarySubNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      {TABS.map((tab) => {
        const active = tab.href === "/sanctuary" ? pathname === "/sanctuary" : pathname.startsWith(tab.href);
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
