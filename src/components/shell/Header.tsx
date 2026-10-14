"use client";

import clsx from "clsx";
import { useTheme } from "next-themes";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { useCameraStore } from "@/lib/store/cameraStore";
import { CameraPrivacyIndicator } from "@/components/camera/CameraPrivacyIndicator";
import { useIsClient } from "@/lib/useIsClient";
import { TogetherfitLogo } from "@/components/brand/TogetherfitLogo";

const RANGES: { key: "today" | "7d" | "30d"; label: string; shortLabel: string }[] = [
  { key: "today", label: "Today", shortLabel: "1D" },
  { key: "7d", label: "7 Days", shortLabel: "7D" },
  { key: "30d", label: "30 Days", shortLabel: "30D" },
];

export function Header() {
  const dateRange = useWellnessStore((s) => s.dateRange);
  const setDateRange = useWellnessStore((s) => s.setDateRange);
  const monitoring = useCameraStore((s) => s.monitoring);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useIsClient();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-border bg-surface px-4 py-2.5 md:static md:px-6 md:py-3">
      <div className="min-w-0 md:hidden">
        <TogetherfitLogo layout="inline" size={28} />
      </div>

      <div role="group" aria-label="Date range" className="flex items-center gap-0.5 rounded-full bg-surface-2 p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setDateRange(r.key)}
            aria-pressed={dateRange === r.key}
            aria-label={r.label}
            className={clsx(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors md:px-3 md:py-1.5",
              dateRange === r.key ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
            )}
          >
            <span className="md:hidden">{r.shortLabel}</span>
            <span className="hidden md:inline">{r.label}</span>
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <CameraPrivacyIndicator active={monitoring} />
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
