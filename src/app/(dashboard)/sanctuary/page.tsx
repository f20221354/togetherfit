"use client";

import clsx from "clsx";
import Link from "next/link";
import { getEnvironmentalLight, useWellnessStore } from "@/lib/store/wellnessStore";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ManualCounter } from "@/components/ui/ManualCounter";
import { ActivityExplorer } from "@/components/dashboard/ActivityExplorer";
import { Habits } from "@/lib/types";

const TOGGLE_HABIT_META: { key: keyof Habits; label: string; icon: string }[] = [
  { key: "sunlightWalk", label: "Sunlight Walk", icon: "🚶" },
  { key: "noDoomscroll", label: "0 Doomscrolling", icon: "📵" },
];

const LIGHT_META = {
  low: { icon: "🌑", label: "Low Light" },
  moderate: { icon: "🌤", label: "Moderate" },
  bright: { icon: "☀️", label: "Bright" },
  optimal: { icon: "☀️", label: "Optimal Sunlight" },
} as const;

export default function SanctuaryPage() {
  const roomBrightness = useWellnessStore((s) => s.roomBrightness);
  const plantGrowth = useWellnessStore((s) => s.plantGrowth);
  const globalScore = useWellnessStore((s) => s.globalScore);
  const habits = useWellnessStore((s) => s.habits);
  const toggleHabit = useWellnessStore((s) => s.toggleHabit);
  const sunlightExposureMinutes = useWellnessStore((s) => s.sunlightExposureMinutes);
  const prolongedGaze = useWellnessStore((s) => s.prolongedGaze);
  const hydrationGlasses = useWellnessStore((s) => s.hydrationGlasses);
  const hydrationTarget = useWellnessStore((s) => s.hydrationTarget);
  const stretchMinutes = useWellnessStore((s) => s.stretchMinutes);
  const stretchTarget = useWellnessStore((s) => s.stretchTarget);
  const setHydrationGlasses = useWellnessStore((s) => s.setHydrationGlasses);
  const setStretchMinutes = useWellnessStore((s) => s.setStretchMinutes);

  const light = getEnvironmentalLight(roomBrightness);
  const lightMeta = LIGHT_META[light];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        icon="🌿"
        title="Sanctuary"
        subtitle="Your bio-room reflects the Global Wellness Score in real time — every module you touch changes this room."
      />

      <div
        className="relative overflow-hidden rounded-3xl border border-border p-8 transition-[background] duration-700"
        style={{
          background: `linear-gradient(160deg, color-mix(in srgb, var(--accent) ${Math.round(
            roomBrightness * 0.4
          )}%, var(--background)), var(--background) 75%)`,
        }}
      >
        {prolongedGaze && (
          <div className="absolute right-4 top-4 rounded-full bg-warning/15 px-3 py-1 text-xs font-medium text-warning">
            Attention needed
          </div>
        )}

        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <div
            className={clsx(
              "flex h-24 w-40 items-center justify-center rounded-2xl border transition-[background,border-color] duration-700",
              light === "low" && "border-border bg-surface-2",
              light === "moderate" && "border-border bg-surface-2",
              (light === "bright" || light === "optimal") && "border-accent/30"
            )}
            style={
              light === "bright" || light === "optimal"
                ? {
                    background: `linear-gradient(180deg, color-mix(in srgb, var(--accent) ${
                      light === "optimal" ? 55 : 30
                    }%, transparent), transparent)`,
                  }
                : undefined
            }
          >
            <span className="text-3xl">{lightMeta.icon}</span>
          </div>

          <div
            className="text-7xl transition-transform duration-700"
            style={{ transform: `scale(${0.7 + plantGrowth / 200})`, opacity: 0.5 + plantGrowth / 200 }}
          >
            🪴
          </div>
          <div className="text-sm text-muted">
            Room brightness {roomBrightness}% · Plant growth {plantGrowth}%
          </div>
          <div className="text-xs text-muted">Global Wellness Score {globalScore}/100 is powering this room.</div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Room Brightness</h3>
          <ProgressBar value={roomBrightness} />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Plant Growth</h3>
          <ProgressBar value={plantGrowth} />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-1 text-sm font-semibold text-foreground">Environmental Light</h3>
          <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
            <span className="text-lg">{lightMeta.icon}</span>
            {lightMeta.label}
          </div>
          <div className="mt-1 text-xs text-muted">{sunlightExposureMinutes} min sunlight exposure today</div>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Daily Habits</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ManualCounter
            icon="💧"
            label="Hydration"
            value={hydrationGlasses}
            target={hydrationTarget}
            unit="glasses"
            onChange={setHydrationGlasses}
          />
          <ManualCounter
            icon="🧘"
            label="Stretched"
            value={stretchMinutes}
            target={stretchTarget}
            unit="min"
            step={5}
            onChange={setStretchMinutes}
          />
          {TOGGLE_HABIT_META.map((h) => (
            <button
              key={h.key}
              onClick={() => toggleHabit(h.key)}
              className={clsx(
                "flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm font-medium transition-colors",
                habits[h.key]
                  ? "border-accent/40 bg-accent/10 text-accent-foreground"
                  : "border-border bg-surface text-muted"
              )}
            >
              <span className="text-xl">{h.icon}</span>
              {h.label}
            </button>
          ))}
        </div>
      </section>

      {!habits.sunlightWalk && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm">
          <span className="text-foreground">Take a sunlight walk.</span>
          <Link
            href="/connect/find"
            className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90"
          >
            Find Someone to Walk With
          </Link>
        </div>
      )}

      <ActivityExplorer />
    </div>
  );
}
