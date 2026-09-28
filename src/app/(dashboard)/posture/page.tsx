"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { useCameraStore } from "@/lib/store/cameraStore";
import { usePostureCamera } from "@/lib/camera/usePostureCamera";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CameraUnavailablePanel } from "@/components/camera/CameraUnavailablePanel";
import { DemoSliders } from "@/components/camera/DemoSliders";
import { ActivityExplorer } from "@/components/dashboard/ActivityExplorer";

function formatDuration(startedAt: number | null): string {
  if (!startedAt) return "0 min";
  const totalSeconds = Math.floor((Date.now() - startedAt) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes} min`;
}

export default function PosturePage() {
  const scores = useWellnessStore((s) => s.scores);
  const minutesSincePostureCorrection = useWellnessStore((s) => s.minutesSincePostureCorrection);
  const prolongedGaze = useWellnessStore((s) => s.prolongedGaze);
  const logEvent = useWellnessStore((s) => s.logEvent);

  const permission = useCameraStore((s) => s.permission);
  const monitoring = useCameraStore((s) => s.monitoring);
  const monitoringStartedAt = useCameraStore((s) => s.monitoringStartedAt);
  const eyeLevelAngle = useCameraStore((s) => s.eyeLevelAngle);
  const headTilt = useCameraStore((s) => s.headTilt);
  const postureStatus = useCameraStore((s) => s.postureStatus);
  const slouchEventsToday = useCameraStore((s) => s.slouchEventsToday);
  const demoSliderMode = useCameraStore((s) => s.demoSliderMode);
  const setDemoSliderMode = useCameraStore((s) => s.setDemoSliderMode);

  const videoRef = useRef<HTMLVideoElement>(null);
  const { start, stop } = usePostureCamera(videoRef);
  const [, forceTick] = useState(0);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!monitoring) return;
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [monitoring]);

  async function handleStart() {
    setStarting(true);
    await start();
    setStarting(false);
  }

  const showCameraPanel = permission === "denied" || permission === "unavailable" || permission === "insecure-context";

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        icon="👁"
        title="Posture & Gaze Guard"
        subtitle="Real-time posture and eye-level estimation, processed entirely in your browser. Nothing is recorded or uploaded."
      />

      <div className="grid gap-4 md:grid-cols-[280px_1fr]">
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-2">
          <video
            ref={videoRef}
            muted
            playsInline
            className={clsx("h-full w-full object-cover", !monitoring && "hidden")}
          />
          {!monitoring && (
            <span className="text-xs text-muted">
              {starting ? "Starting camera…" : "Camera preview will appear here"}
            </span>
          )}
          {monitoring && (
            <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-danger/90 px-2.5 py-1 text-xs font-medium text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              Camera Active
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="text-xs text-muted">Camera Status</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <span className={clsx("h-1.5 w-1.5 rounded-full", monitoring ? "bg-success" : "bg-muted")} />
                {monitoring ? "Monitoring" : "Idle"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="text-xs text-muted">Monitoring Duration</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatDuration(monitoringStartedAt)}</div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="text-xs text-muted">Eye-Level Angle</div>
              <div className="mt-1 text-lg font-semibold text-foreground">
                {eyeLevelAngle !== null ? `${eyeLevelAngle}°` : "—"}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="text-xs text-muted">Head Tilt</div>
              <div className="mt-1 text-lg font-semibold text-foreground">
                {headTilt !== null ? `${headTilt}°` : "—"}
              </div>
            </div>
          </div>

          {eyeLevelAngle !== null && (
            <div className="rounded-xl border border-border bg-surface p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted">
                <span>Posture</span>
                <span className="capitalize text-foreground">{postureStatus?.replace("-", " ")}</span>
              </div>
              <ProgressBar
                value={(eyeLevelAngle / 90) * 100}
                tone={postureStatus === "optimal" ? "good" : postureStatus === "mild" ? "warning" : "critical"}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {!monitoring ? (
              <button
                onClick={handleStart}
                disabled={starting}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
              >
                {starting ? "Starting…" : "Start Monitoring"}
              </button>
            ) : (
              <button
                onClick={stop}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                Stop Monitoring
              </button>
            )}
            <span className="text-xs text-muted">Slouch events today: {slouchEventsToday}</span>
          </div>
        </div>
      </div>

      {showCameraPanel && (
        <CameraUnavailablePanel
          permission={permission}
          onRetry={handleStart}
          onUseDemo={() => setDemoSliderMode(true)}
        />
      )}

      {(demoSliderMode || showCameraPanel) && <DemoSliders />}

      {!demoSliderMode && !monitoring && !showCameraPanel && (
        <button
          onClick={() => setDemoSliderMode(true)}
          className="self-start text-xs font-medium text-accent-foreground hover:underline"
        >
          Use demo sliders instead
        </button>
      )}

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>Posture Score</span>
          <span className="tabular-nums text-foreground">{scores.posture}</span>
        </div>
        <ProgressBar value={scores.posture} tone={scores.posture < 60 ? "critical" : scores.posture < 80 ? "warning" : "good"} />
      </div>

      {prolongedGaze && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <span>You&apos;ve been sitting with low screen angle for a while. Consider a UrgeSurfer reset, or a short walk.</span>
          <Link
            href="/move/activity/walk"
            className="shrink-0 rounded-full bg-warning/20 px-3 py-1.5 text-xs font-semibold text-warning hover:bg-warning/30"
          >
            Take a 15-minute walk?
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => logEvent("posture_corrected")}
          className="rounded-full bg-accent/15 px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/25"
        >
          Log Posture Correction
        </button>
        <button
          onClick={() => logEvent("focus_session_completed")}
          className="rounded-full bg-accent/15 px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent/25"
        >
          Log Focus Session Complete
        </button>
      </div>

      <div className="text-xs text-muted">
        Minutes since last correction: {minutesSincePostureCorrection}m
      </div>

      <ActivityExplorer />
    </div>
  );
}
