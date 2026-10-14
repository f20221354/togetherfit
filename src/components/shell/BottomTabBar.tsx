"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { OVERVIEW_ITEM, ACTION_ITEMS, PERSONAL_TAB, PERSONAL_TAB_PATHS, type NavItem } from "./navItems";
import { useConnectBadgeCount } from "@/lib/network/useUnreadCount";
import { useCurrentUser } from "@/lib/auth/authStore";
import { useMyProfile } from "@/lib/profile/profileStore";
import { Avatar } from "@/components/profile/Avatar";
import { Icon } from "@/components/ui/Icon";

const TABS: NavItem[] = [OVERVIEW_ITEM, ...ACTION_ITEMS, PERSONAL_TAB];

function isActive(tab: NavItem, pathname: string): boolean {
  if (tab.key === OVERVIEW_ITEM.key) return pathname === "/";
  if (tab.key === PERSONAL_TAB.key) return PERSONAL_TAB_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}

/** Mobile navigation (below md); the Sidebar takes over on larger screens. */
export function BottomTabBar() {
  const pathname = usePathname();
  const unreadCount = useConnectBadgeCount();
  const user = useCurrentUser();
  const { profile } = useMyProfile();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = isActive(tab, pathname);
          const badge = tab.key === "connect" ? unreadCount : 0;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active ? "text-accent-foreground" : "text-muted hover:text-foreground"
                )}
              >
                <span className="relative leading-none">
                  {tab.key === PERSONAL_TAB.key && user ? (
                    <span className={clsx("block rounded-full", active && "ring-2 ring-accent")}>
                      <Avatar name={user.name} photoId={profile?.photoId} size="xs" />
                    </span>
                  ) : (
                    <Icon name={tab.icon} size={22} weight={active ? "fill" : "regular"} />
                  )}
                  {badge > 0 && (
                    <span
                      aria-label={`${badge} new`}
                      className="absolute -right-3 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-black"
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
                {tab.shortLabel}
                {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-accent" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
