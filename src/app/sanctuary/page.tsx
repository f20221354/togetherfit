"use client";

import { useWellnessStore } from "@/lib/store/wellnessStore";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ActivityExplorer } from "@/components/dashboard/ActivityExplorer";
import { Habits } from "@/lib/types";
import clsx from "clsx";

const HABIT_META: { key: keyof Habits; label: string; icon: string }[] = [
  { key: "hydrated", label: "Hydrated", icon: "💧" },
  { key: "stretched", label: "Stretched", icon: "🧘" },
  { key: "sunlightWalk", label: "Sunlight Walk", icon: "🚶" },
  { key: "noDoomscroll", label: "0 Doomscrolling", icon: "📵" },
];

export default function SanctuaryPage() {
  const roomBrightness = useWellnessStore((s) => s.roomBrightness);
  const plantGrowth = useWellnessStore((s) => s.plantGrowth);
  const globalScore = useWellnessStore((s) => s.globalScore);
  const habits = useWellnessStore((s) => s.habits);
  const toggleHabit = useWellnessStore((s) => s.toggleHabit);
  const logEvent = useWellnessStore((s) => s.logEvent);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        icon="🌿"
        title="Sanctuary"
        subtitle="Your bio-room reflects the Global Wellness Score in real time — every module you touch changes this room."
      />

      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 p-8 transition-colors duration-700"
        style={{
          background: `linear-gradient(160deg, rgba(52, 211, 153, ${roomBrightness / 220}), rgba(11,13,16,1) 70%)`,
        }}
      >
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <div
            className="text-7xl transition-transform duration-700"
            style={{ transform: `scale(${0.7 + plantGrowth / 200})` }}
          >
            🪴
          </div>
          <div className="text-sm text-white/60">Room brightness {roomBrightness}% · Plant growth {plantGrowth}%</div>
          <div className="text-xs text-white/40">Global Wellness Score {globalScore}/100 is powering this room.</div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white/80">Room Brightness</h3>
          <ProgressBar value={roomBrightness} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white/80">Plant Growth</h3>
          <ProgressBar value={plantGrowth} />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">
          Daily Habits
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HABIT_META.map((h) => (
            <button
              key={h.key}
              onClick={() => {
                toggleHabit(h.key);
                if (h.key === "hydrated" && !habits.hydrated) logEvent("hydration_logged");
              }}
              className={clsx(
                "flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-colors",
                habits[h.key]
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "border-white/10 bg-white/[0.03] text-white/60"
              )}
            >
              <span className="text-xl">{h.icon}</span>
              {h.label}
            </button>
          ))}
        </div>
      </section>

      <ActivityExplorer />
    </div>
  );
}
