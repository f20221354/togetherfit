"use client";

import Link from "next/link";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { ScoreKey } from "@/lib/types";
import { ProgressBar } from "@/components/ui/ProgressBar";

const SCORE_META: { key: ScoreKey; label: string }[] = [
  { key: "posture", label: "Posture" },
  { key: "focus", label: "Focus" },
  { key: "movement", label: "Movement" },
  { key: "circadian", label: "Circadian" },
  { key: "recovery", label: "Recovery" },
];

const FIRST_ACTIONS = [
  { label: "Take a 15-minute walk", href: "/move/walk" },
  { label: "90-second breathing reset", href: "/urgesurfer" },
  { label: "Posture check", href: "/posture" },
];

/** Today's score, built only from what the user did today. Before the first action it says so instead of showing a number. */
export function GlobalScoreCard() {
  const globalScore = useWellnessStore((s) => s.globalScore);
  const scores = useWellnessStore((s) => s.scores);
  const started = useWellnessStore((s) => s.started);
  const activeToday = useWellnessStore((s) => s.activeToday);

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-col items-center gap-2 border-b border-border pb-6 text-center">
        <span className="text-xs uppercase tracking-widest text-muted">Today&apos;s wellness score</span>
        {activeToday ? (
          <span className="text-6xl font-semibold tabular-nums">
            {globalScore}
            <span className="text-2xl text-muted"> / 100</span>
          </span>
        ) : (
          <>
            <span className="text-lg font-semibold text-foreground">Your day hasn&apos;t started yet</span>
            <p className="max-w-sm text-sm text-muted">
              Your score builds from what you do today. Each action below adds to it; it resets at midnight.
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {FIRST_ACTIONS.map((a) => (
                <Link key={a.href} href={a.href} className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:border-accent hover:bg-accent/5">
                  {a.label}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {SCORE_META.map((m) => (
          <div key={m.key} className="rounded-xl bg-surface-2 p-3">
            <div className="mb-1 flex items-center justify-between text-xs text-muted">
              <span>{m.label}</span>
              <span className="tabular-nums text-foreground">{started[m.key] ? scores[m.key] : "–"}</span>
            </div>
            <ProgressBar value={scores[m.key]} />
          </div>
        ))}
      </div>
    </div>
  );
}
