"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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

export default function MicroStrollWalkPage() {
  const logEvent = useWellnessStore((s) => s.logEvent);
  const microStrollMinutesToday = useWellnessStore((s) => s.microStrollMinutesToday);
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DURATION);
  const [justCompleted, setJustCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          setJustCompleted(true);
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
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        icon="🚶"
        title="15-Minute Micro-Stroll"
        subtitle="A short sunlight walk matched to your schedule — boosts Movement and Sunlight scores."
      />

      <div className="flex flex-col items-center gap-5 rounded-3xl border border-border bg-surface p-10">
        <span className="text-6xl">🚶</span>
        <div className="flex gap-6 text-center text-sm text-muted">
          <div>
            <div className="text-xs">Duration</div>
            <div className="text-foreground">15 min</div>
          </div>
          <div>
            <div className="text-xs">Distance</div>
            <div className="text-foreground">~1.2 km</div>
          </div>
        </div>
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
          className="rounded-full bg-accent/15 px-8 py-3 text-sm font-semibold text-accent-foreground hover:bg-accent/25"
        >
          {running ? "Cancel Walk" : "Start Walk"}
        </button>
        <Link href="/connect/discover?activity=walking" className="text-xs font-medium text-accent-foreground hover:underline">
          Find Someone to Join
        </Link>
        <button
          onClick={() => {
            setRunning(false);
            setSecondsLeft(DURATION);
            setJustCompleted(true);
            logEvent("walk_completed", { duration: DURATION });
          }}
          className="text-xs text-muted hover:text-foreground"
        >
          Mark as already completed
        </button>
        <div className="text-xs text-muted">{microStrollMinutesToday} minutes walked today</div>
      </div>

      {justCompleted && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4">
          <div className="text-sm text-foreground">Nice walk! Want company next time?</div>
          <Link
            href="/connect/discover?activity=walking"
            className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90"
          >
            Find a Walking Partner
          </Link>
        </div>
      )}

      <ActivityExplorer />
    </div>
  );
}
