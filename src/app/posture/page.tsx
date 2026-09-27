"use client";

import { useState } from "react";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { ActivityExplorer } from "@/components/dashboard/ActivityExplorer";

export default function PosturePage() {
  const scores = useWellnessStore((s) => s.scores);
  const minutesSincePostureCorrection = useWellnessStore((s) => s.minutesSincePostureCorrection);
  const prolongedGaze = useWellnessStore((s) => s.prolongedGaze);
  const logEvent = useWellnessStore((s) => s.logEvent);
  const [cameraOn, setCameraOn] = useState(true);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader
        icon="👁"
        title="Posture & Gaze Guard"
        subtitle="Camera AI watches posture and screen-gaze patterns. Corrections feed straight into the Global Wellness Score."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-2 flex items-center justify-between text-xs text-white/50">
            <span>Posture Score</span>
            <span className="tabular-nums text-white/80">{scores.posture}</span>
          </div>
          <ProgressBar value={scores.posture} tone={scores.posture < 60 ? "critical" : scores.posture < 80 ? "warning" : "good"} />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-2 text-xs text-white/50">Since Last Correction</div>
          <div className="text-2xl font-semibold tabular-nums">{minutesSincePostureCorrection}m</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-2 text-xs text-white/50">Camera AI</div>
          <button
            onClick={() => setCameraOn((v) => !v)}
            className="text-sm font-medium"
          >
            <Badge tone={cameraOn ? "positive" : "neutral"}>{cameraOn ? "Active" : "Paused"}</Badge>
          </button>
        </div>
      </div>

      {prolongedGaze && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
          Doomscroll pattern detected — VitaOS recommends a UrgeSurfer reset.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => logEvent("slouch_detected")}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium hover:border-rose-400/40 hover:bg-rose-400/10 hover:text-rose-300"
        >
          Simulate Slouch Detected
        </button>
        <button
          onClick={() => logEvent("doomscroll_detected")}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-300"
        >
          Simulate Doomscroll Detected
        </button>
        <button
          onClick={() => logEvent("posture_corrected")}
          className="rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-400/25"
        >
          Log Posture Correction
        </button>
        <button
          onClick={() => logEvent("focus_session_completed")}
          className="rounded-full bg-emerald-400/15 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-400/25"
        >
          Log Focus Session Complete
        </button>
      </div>

      <ActivityExplorer />
    </div>
  );
}
