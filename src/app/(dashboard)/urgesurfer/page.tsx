"use client";

import { useEffect, useRef, useState } from "react";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { PageHeader } from "@/components/shell/PageHeader";
import { ActivityExplorer } from "@/components/dashboard/ActivityExplorer";

const DURATION = 90;

export default function UrgeSurferPage() {
  const logEvent = useWellnessStore((s) => s.logEvent);
  const urgeSurferResetsToday = useWellnessStore((s) => s.urgeSurferResetsToday);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          logEvent("urge_reset_completed", { duration: DURATION });
          return DURATION;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, logEvent]);

  const progress = ((DURATION - secondsLeft) / DURATION) * 100;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        icon="🫁"
        title="UrgeSurfer"
        subtitle="A 90-second somatic circuit breaker. Completing a reset lifts Recovery and Focus, and clears posture/gaze warnings."
      />

      <div className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-surface p-10">
        <div
          className="relative flex h-56 w-56 items-center justify-center rounded-full transition-[background] duration-1000"
          style={{
            background: `conic-gradient(var(--accent) ${progress * 3.6}deg, var(--surface-2) ${progress * 3.6}deg)`,
          }}
        >
          <div className="flex h-48 w-48 items-center justify-center rounded-full bg-background">
            <span className="text-5xl font-semibold tabular-nums">{secondsLeft}s</span>
          </div>
        </div>

        <button
          onClick={() => {
            if (running) {
              setRunning(false);
              setSecondsLeft(DURATION);
            } else {
              setSecondsLeft(DURATION);
              setRunning(true);
            }
          }}
          className="rounded-full bg-accent/15 px-8 py-3 text-sm font-semibold text-accent-foreground hover:bg-accent/25"
        >
          {running ? "Cancel" : "Start 90s Reset"}
        </button>

        <div className="text-xs text-muted">{urgeSurferResetsToday} resets completed today</div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => logEvent("breathing_completed")}
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-accent/40 hover:text-accent-foreground"
        >
          Log Breathing Exercise
        </button>
        <button
          onClick={() => logEvent("grounding_completed")}
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-accent/40 hover:text-accent-foreground"
        >
          Log Grounding Exercise
        </button>
      </div>

      <ActivityExplorer />
    </div>
  );
}
