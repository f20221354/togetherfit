"use client";

import Link from "next/link";
import { getEnvironmentalLight, useWellnessStore } from "@/lib/store/wellnessStore";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ActivityExplorer } from "@/components/dashboard/ActivityExplorer";

const TIMELINE = [
  { time: "6:30 AM", label: "Morning sunlight window", key: "morning" as const },
  { time: "12:00 PM", label: "Midday light exposure", key: "midday" as const },
  { time: "6:00 PM", label: "Evening light taper", key: "evening" as const },
  { time: "10:00 PM", label: "Wind-down / sleep window", key: "sleep" as const },
];

export default function CircadianPage() {
  const scores = useWellnessStore((s) => s.scores);
  const circadianMorningLightDone = useWellnessStore((s) => s.circadianMorningLightDone);
  const eveningLightHigh = useWellnessStore((s) => s.eveningLightHigh);
  const sunlightExposureMinutes = useWellnessStore((s) => s.sunlightExposureMinutes);
  const roomBrightness = useWellnessStore((s) => s.roomBrightness);
  const logEvent = useWellnessStore((s) => s.logEvent);
  const environmentalLight = getEnvironmentalLight(roomBrightness);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        icon="☀️"
        title="Circadian Arc"
        subtitle="Your light and sleep architecture. Sunlight exposure logged anywhere in VitaOS updates this timeline."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-2 flex items-center justify-between text-xs text-muted">
            <span>Circadian Score</span>
            <span className="tabular-nums text-foreground">{scores.circadian}</span>
          </div>
          <ProgressBar value={scores.circadian} tone="good" />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-xs text-muted">Sunlight Exposure</div>
          <div className="mt-1 text-xl font-semibold text-foreground">{sunlightExposureMinutes} min</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="text-xs text-muted">Environmental Light</div>
          <div className="mt-1 text-xl font-semibold capitalize text-foreground">{environmentalLight}</div>
        </div>
      </div>

      {eveningLightHigh && (
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          Evening light exposure is high — dim your environment to protect tonight&apos;s sleep window.
        </div>
      )}

      {!circadianMorningLightDone && (environmentalLight === "bright" || environmentalLight === "optimal") && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm">
          <span className="text-foreground">Good time for a sunlight walk.</span>
          <div className="flex shrink-0 gap-2">
            <Link
              href="/move/walk"
              className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90"
            >
              Start Sunlight Walk
            </Link>
            <Link
              href="/connect/discover?activity=walking"
              className="rounded-full border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent-foreground hover:bg-accent/10"
            >
              Find Walking Partner
            </Link>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Daily Light Timeline</h3>
        <ol className="flex flex-col gap-3">
          {TIMELINE.map((item) => (
            <li key={item.key} className="flex items-center gap-4">
              <span className="w-20 shrink-0 text-xs text-muted">{item.time}</span>
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-sm text-foreground">{item.label}</span>
              {item.key === "morning" && circadianMorningLightDone && (
                <span className="ml-auto text-xs text-accent-foreground">✓ Complete</span>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => logEvent("morning_light_completed")}
          className="rounded-full bg-accent/15 px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/25"
        >
          Log Morning Sunlight
        </button>
        <button
          onClick={() => logEvent("evening_dim_recommended")}
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-warning/40 hover:text-warning"
        >
          Flag High Evening Light
        </button>
        <button
          onClick={() => logEvent("sleep_window_completed")}
          className="rounded-full bg-accent/15 px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/25"
        >
          Log Sleep Window Honored
        </button>
      </div>

      <ActivityExplorer />
    </div>
  );
}
