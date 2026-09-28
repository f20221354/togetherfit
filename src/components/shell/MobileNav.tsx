"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { MOBILE_NAV_ITEMS } from "./navItems";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface/95 backdrop-blur md:hidden">
      {MOBILE_NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={clsx(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              active ? "text-accent-foreground" : "text-muted"
            )}
          >
            <span className="text-lg">{item.icon}</span>
            {item.shortLabel}
            {active && <span className="mt-0.5 h-1 w-1 rounded-full bg-accent" />}
          </Link>
        );
      })}
    </nav>
  );
}
