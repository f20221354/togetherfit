"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useIncomingRequests } from "@/lib/network/useUnreadCount";

const TABS = [
  { label: "Overview", href: "/connect" },
  { label: "Friends", href: "/connect/friends" },
  { label: "Messages", href: "/connect/messages" },
  { label: "Milestones", href: "/connect/milestones" },
];

export function ConnectSubNav() {
  const pathname = usePathname();
  const requests = useIncomingRequests().length;

  return (
    <nav aria-label="Connect" className="mb-6 grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap">
      {TABS.map((tab) => {
        const active = tab.href === "/connect" ? pathname === "/connect" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "inline-flex items-center justify-center rounded-full px-2 py-1.5 text-center text-xs font-medium transition-colors sm:px-3.5",
              active ? "bg-accent/15 text-accent-foreground" : "bg-surface-2 text-muted hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.href === "/connect/friends" && requests > 0 && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-black">
                {requests}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
