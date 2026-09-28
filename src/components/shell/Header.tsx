"use client";

import { useEffect, useRef } from "react";
import clsx from "clsx";
import { useTheme } from "next-themes";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { useCameraStore } from "@/lib/store/cameraStore";
import { useMoveStore } from "@/lib/store/moveStore";
import { pickNextDemoEvent } from "@/lib/demoEngine";
import { Badge } from "@/components/ui/Badge";
import { CameraPrivacyIndicator } from "@/components/camera/CameraPrivacyIndicator";
import { useIsClient } from "@/lib/useIsClient";

const RANGES: { key: "today" | "7d" | "30d"; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
];

export function Header() {
  const demoMode = useWellnessStore((s) => s.demoMode);
  const dateRange = useWellnessStore((s) => s.dateRange);
  const toggleDemoMode = useWellnessStore((s) => s.toggleDemoMode);
  const setDateRange = useWellnessStore((s) => s.setDateRange);
  const logEvent = useWellnessStore((s) => s.logEvent);
  const monitoring = useCameraStore((s) => s.monitoring);
  const seedDemoWorkouts = useMoveStore((s) => s.seedDemoWorkouts);
  const { resolvedTheme, setTheme } = useTheme();
  const tickIndex = useRef(0);
  const mounted = useIsClient();

  useEffect(() => {
    if (demoMode) seedDemoWorkouts();
  }, [demoMode, seedDemoWorkouts]);

  useEffect(() => {
    if (!demoMode) return;
    const interval = setInterval(() => {
      const type = pickNextDemoEvent(tickIndex.current);
      tickIndex.current += 1;
      logEvent(type);
    }, 4000);
    return () => clearInterval(interval);
  }, [demoMode, logEvent]);

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 md:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-xl">◈</span>
        <span className="text-base font-semibold text-foreground">स्वस्थ Bharat</span>
      </div>

      <div className="hidden items-center gap-1 rounded-full bg-surface-2 p-1 md:flex">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setDateRange(r.key)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              dateRange === r.key ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <CameraPrivacyIndicator active={monitoring} />
        <Badge tone={demoMode ? "neutral" : "live"}>
          <span className={clsx("h-1.5 w-1.5 rounded-full", demoMode ? "bg-muted" : "bg-success")} />
          LIVE
        </Badge>
        <button onClick={toggleDemoMode}>
          <Badge tone={demoMode ? "demo" : "neutral"}>⚡ DEMO {demoMode ? "ON" : "OFF"}</Badge>
        </button>
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="rounded-full bg-surface-2 p-2 text-sm text-foreground hover:bg-border"
          aria-label="Toggle theme"
        >
          {mounted ? (resolvedTheme === "dark" ? "☾" : "☀") : "◐"}
        </button>
      </div>
    </header>
  );
}
