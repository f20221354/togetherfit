"use client";

import { useWellnessStore } from "@/lib/store/wellnessStore";
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
  const logEvent = useWellnessStore((s) => s.logEvent);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        icon="☀️"
        title="Circadian Arc"
        subtitle="Your light and sleep architecture. Sunlight exposure logged anywhere in VitaOS updates this timeline."
      />

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-white/50">
          <span>Circadian Score</span>
          <span className="tabular-nums text-white/80">{scores.circadian}</span>
        </div>
        <ProgressBar value={scores.circadian} tone="good" />
      </div>

      {eveningLightHigh && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          Evening light exposure is high — dim your environment to protect tonight&apos;s sleep window.
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white/80">Daily Light Timeline</h3>
        <ol className="flex flex-col gap-3">
          {TIMELINE.map((item) => (
            <li key={item.key} className="flex items-center gap-4">
              <span className="w-20 shrink-0 text-xs text-white/40">{item.time}</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-sm text-white/80">{item.label}</span>
              {item.key === "morning" && circadianMorningLightDone && (
                <span className="ml-auto text-xs text-emerald-300">✓ Complete</span>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => logEvent("morning_light_completed")}
          className="rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-400/25"
        >
          Log Morning Sunlight
        </button>
        <button
          onClick={() => logEvent("evening_dim_recommended")}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium hover:border-amber-400/40 hover:text-amber-300"
        >
          Flag High Evening Light
        </button>
        <button
          onClick={() => logEvent("sleep_window_completed")}
          className="rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-400/25"
        >
          Log Sleep Window Honored
        </button>
      </div>

      <ActivityExplorer />
    </div>
  );
}
