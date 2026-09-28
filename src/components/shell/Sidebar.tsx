"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "./navItems";
import { useAuthStore, useCurrentUser } from "@/lib/auth/authStore";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useCurrentUser();
  const logOut = useAuthStore((s) => s.logOut);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2 px-3">
        <span className="text-xl">◈</span>
        <span className="text-lg font-semibold tracking-tight text-foreground">VitaOS</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent/15 text-accent-foreground"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <Link
          href="/settings"
          className={clsx(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-accent/15 text-accent-foreground"
              : "text-muted hover:bg-surface-2 hover:text-foreground"
          )}
        >
          <span className="text-base">⚙️</span>
          Settings
        </Link>
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
