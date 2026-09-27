"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { pickNextDemoEvent } from "@/lib/demoEngine";
import { Badge } from "@/components/ui/Badge";

const RANGES: { key: "today" | "7d" | "30d"; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
];

export function Header() {
  const demoMode = useWellnessStore((s) => s.demoMode);
  const dateRange = useWellnessStore((s) => s.dateRange);
  const theme = useWellnessStore((s) => s.theme);
  const toggleDemoMode = useWellnessStore((s) => s.toggleDemoMode);
  const setDateRange = useWellnessStore((s) => s.setDateRange);
  const setTheme = useWellnessStore((s) => s.setTheme);
  const logEvent = useWellnessStore((s) => s.logEvent);
  const tickIndex = useRef(0);

  useEffect(() => {
    if (!demoMode) return;
    const interval = setInterval(() => {
      const type = pickNextDemoEvent(tickIndex.current);
      tickIndex.current += 1;
      logEvent(type);
    }, 4000);
    return () => clearInterval(interval);
  }, [demoMode, logEvent]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-4 py-3 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-xl">◈</span>
        <span className="text-base font-semibold">VitaOS</span>
      </div>

      <div className="hidden items-center gap-1 rounded-full bg-white/5 p-1 md:flex">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setDateRange(r.key)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              dateRange === r.key ? "bg-white/15 text-white" : "text-white/50 hover:text-white/80"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Badge tone={demoMode ? "neutral" : "live"}>
          <span className={clsx("h-1.5 w-1.5 rounded-full", demoMode ? "bg-white/30" : "bg-emerald-400")} />
          LIVE
        </Badge>
        <button onClick={toggleDemoMode}>
          <Badge tone={demoMode ? "demo" : "neutral"}>⚡ DEMO {demoMode ? "ON" : "OFF"}</Badge>
        </button>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-full bg-white/5 p-2 text-sm hover:bg-white/10"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☾" : "☀"}
        </button>
      </div>
    </header>
  );
}
