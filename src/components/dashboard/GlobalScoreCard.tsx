"use client";

import { useWellnessStore } from "@/lib/store/wellnessStore";
import { ScoreKey } from "@/lib/types";
import { ProgressBar } from "@/components/ui/ProgressBar";

const SCORE_META: { key: ScoreKey; label: string }[] = [
  { key: "posture", label: "Posture" },
  { key: "focus", label: "Focus" },
  { key: "movement", label: "Sunlight" },
  { key: "circadian", label: "Circadian" },
  { key: "recovery", label: "Recovery" },
];

export function GlobalScoreCard() {
  const globalScore = useWellnessStore((s) => s.globalScore);
  const scores = useWellnessStore((s) => s.scores);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="flex flex-col items-center gap-2 border-b border-white/10 pb-6 text-center">
        <span className="text-xs uppercase tracking-widest text-white/40">
          Global Wellness Score
        </span>
        <span className="text-6xl font-semibold tabular-nums">
          {globalScore}
          <span className="text-2xl text-white/30"> / 100</span>
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {SCORE_META.map((m) => (
          <div key={m.key} className="rounded-xl bg-white/[0.04] p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-white/50">
              <span>{m.label}</span>
              <span className="tabular-nums text-white/80">{scores[m.key]}</span>
            </div>
            <ProgressBar value={scores[m.key]} />
          </div>
        ))}
      </div>
    </div>
  );
}
