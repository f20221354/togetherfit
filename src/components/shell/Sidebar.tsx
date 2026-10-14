"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { OVERVIEW_ITEM, ACTION_ITEMS, WELLNESS_ITEMS } from "./navItems";
import { useAuthStore, useCurrentUser } from "@/lib/auth/authStore";
import { useConnectBadgeCount } from "@/lib/network/useUnreadCount";
import { TogetherfitLogo } from "@/components/brand/TogetherfitLogo";
import { WinterArcNavBadge } from "@/components/winterArc/WinterArcNavBadge";
import { Avatar } from "@/components/profile/Avatar";
import { Icon } from "@/components/ui/Icon";
import { useMyProfile } from "@/lib/profile/profileStore";

function NavLink({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
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
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
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
  const unreadCount = useConnectBadgeCount();
  const { profile } = useMyProfile();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2 px-3">
        <TogetherfitLogo layout="inline" size={40} />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        <NavLink href={OVERVIEW_ITEM.href} icon={<Icon name={OVERVIEW_ITEM.icon} />} label={OVERVIEW_ITEM.label} active={pathname === "/"} />

        <div className="my-2 border-t border-border" />

        {ACTION_ITEMS.map((item) => (
          <div key={item.key}>
            <NavLink
              href={item.href}
              icon={<Icon name={item.icon} />}
              label={item.label}
              active={pathname.startsWith(item.href)}
              badge={item.key === "connect" ? unreadCount : undefined}
            />
            {/* Sibling, not child: the badge is its own link. Indented to line up with the label. */}
            {item.key === "move" && <WinterArcNavBadge className="mb-1 ml-10" />}
          </div>
        ))}

        <div className="my-2 border-t border-border" />

        {WELLNESS_ITEMS.map((item) => (
          <NavLink key={item.key} href={item.href} icon={<Icon name={item.icon} />} label={item.label} active={pathname.startsWith(item.href)} />
        ))}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <NavLink
          href="/profile"
          icon={<Avatar name={user?.name ?? "?"} photoId={profile?.photoId} verified={!!profile?.verifiedAt} size="xs" />}
          label="My Profile"
          active={pathname === "/profile"}
        />
        <NavLink href="/settings" icon={<Icon name="nav.settings" />} label="Settings" active={pathname === "/settings"} />
        {user?.isAdmin && <NavLink href="/moderation" icon={<Icon name="nav.moderation" />} label="Moderation" active={pathname === "/moderation"} />}
        {user && (
          <button
            onClick={async () => {
              await logOut();
              router.replace("/login");
            }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <Icon name="nav.signout" />
            Log Out
          </button>
        )}
      </div>
    </aside>
  );
}
