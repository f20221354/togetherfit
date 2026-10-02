"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useIsClient } from "@/lib/useIsClient";
import { WINTER_ARC_COPY, WINTER_ARC_PAGE_PATH, isWinterArcActive } from "@/lib/winterArc/config";

const TABS = [
  { label: "Overview", href: "/move" },
  { label: "Goals", href: "/move/goals" },
  { label: "AI Coach", href: "/move/coach" },
  { label: "Workout", href: "/move/workout" },
  { label: "Exercises", href: "/move/exercises" },
  { label: "Progress", href: "/move/progress" },
];

export function MoveSubNav() {
  const pathname = usePathname();
  const isClient = useIsClient();
  // Seasonal tab, only while the event is live (client-only to avoid a hydration mismatch).
  const tabs =
    isClient && isWinterArcActive()
      ? [...TABS, { label: `❄️ ${WINTER_ARC_COPY.title}`, href: WINTER_ARC_PAGE_PATH }]
      : TABS;

  return (
    <nav className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      {tabs.map((tab) => {
        const active = tab.href === "/move" ? pathname === "/move" : pathname.startsWith(tab.href);
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
