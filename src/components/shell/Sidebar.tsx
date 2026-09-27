"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "./navItems";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-white/10 bg-black/20 px-3 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2 px-3">
        <span className="text-xl">◈</span>
        <span className="text-lg font-semibold tracking-tight">VitaOS</span>
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
                  ? "bg-emerald-400/15 text-emerald-300"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-2 text-xs text-white/30">
        One wellness core. Five ways in.
      </div>
    </aside>
  );
}
