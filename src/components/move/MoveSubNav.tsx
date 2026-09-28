"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { label: "Overview", href: "/move" },
  { label: "Goals", href: "/move/goals" },
  { label: "AI Coach", href: "/move/coach" },
  { label: "Workout", href: "/move/workout" },
  { label: "Exercises", href: "/move/exercises" },
  { label: "Activity", href: "/move/activity" },
  { label: "Trainers", href: "/move/trainers" },
  { label: "Progress", href: "/move/progress" },
];

export function MoveSubNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-4 mb-6 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
      {TABS.map((tab) => {
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
