"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { OVERVIEW_ITEM, ACTION_ITEMS, WELLNESS_ITEMS, PROFILE_ITEM } from "./navItems";
import { useAuthStore, useCurrentUser } from "@/lib/auth/authStore";
import { useUnreadConnectionsCount } from "@/lib/network/useUnreadCount";

function NavLink({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
        active ? "bg-accent/15 text-accent-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"
      )}
    >
      <span className="text-base">{icon}</span>
      {label}
      {!!badge && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-black">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const logOut = useAuthStore((s) => s.logOut);
  const unreadCount = useUnreadConnectionsCount();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2 px-3">
        <span className="text-xl">◈</span>
        <span className="text-lg font-semibold tracking-tight text-foreground">स्वस्थ Bharat</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        <NavLink href={OVERVIEW_ITEM.href} icon={OVERVIEW_ITEM.icon} label={OVERVIEW_ITEM.label} active={pathname === "/"} />

        <div className="my-2 border-t border-border" />

        {ACTION_ITEMS.map((item) => (
          <NavLink
            key={item.key}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname.startsWith(item.href)}
            badge={item.key === "connect" ? unreadCount : undefined}
          />
        ))}

        <div className="my-2 border-t border-border" />

        {WELLNESS_ITEMS.map((item) => (
          <NavLink key={item.key} href={item.href} icon={item.icon} label={item.label} active={pathname.startsWith(item.href)} />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <NavLink
          href={PROFILE_ITEM.href}
          icon={PROFILE_ITEM.icon}
          label={PROFILE_ITEM.label}
          active={pathname.startsWith(PROFILE_ITEM.href)}
        />
        <NavLink href="/settings" icon="⚙️" label="Settings" active={pathname === "/settings"} />
        {user && (
          <button
            onClick={() => {
              logOut();
              router.push("/login");
            }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <span className="text-base">↩</span>
            Log Out
          </button>
        )}
        <div className="px-3 pt-2 text-xs text-muted">One wellness core. Five ways in.</div>
      </div>
    </aside>
  );
}
