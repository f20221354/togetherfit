"use client";

import { useEffect, useRef, useState } from "react";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ActivityExplorer } from "@/components/dashboard/ActivityExplorer";

const DURATION = 15 * 60;

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function MicroStrollPage() {
  const logEvent = useWellnessStore((s) => s.logEvent);
  const microStrollMinutesToday = useWellnessStore((s) => s.microStrollMinutesToday);
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
          logEvent("walk_completed", { duration: DURATION });
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
        icon="🚶"
        title="Micro-Stroll"
        subtitle="A 15-minute sunlight walk matched to your schedule. Completion boosts Movement and Sunlight scores, and updates Sanctuary and Circadian Arc."
      />

      <div className="flex flex-col items-center gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-10">
        <span className="text-6xl">🚶</span>
        <span className="text-4xl font-semibold tabular-nums">{formatTime(secondsLeft)}</span>
        <div className="w-full max-w-sm">
          <ProgressBar value={progress} tone="good" />
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
          className="rounded-full bg-emerald-400/15 px-8 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/25"
        >
          {running ? "Cancel Walk" : "Start Sunlight Walk"}
        </button>
        <button
          onClick={() => {
            setRunning(false);
            setSecondsLeft(DURATION);
            logEvent("walk_completed", { duration: DURATION });
          }}
          className="text-xs text-white/40 hover:text-white/70"
        >
          Mark as already completed
        </button>
        <div className="text-xs text-white/40">{microStrollMinutesToday} minutes walked today</div>
      </div>

      <ActivityExplorer />
    </div>
  );
}
