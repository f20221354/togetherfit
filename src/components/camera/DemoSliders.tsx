"use client";

import { useRef } from "react";
import { useCameraStore } from "@/lib/store/cameraStore";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { Badge } from "@/components/ui/Badge";

const SLOUCH_THRESHOLD = 65;
const LOW_EYE_LEVEL_THRESHOLD = 65;
const DEBOUNCE_MS = 600;

export function DemoSliders() {
  const demoPostureValue = useCameraStore((s) => s.demoPostureValue);
  const demoEyeLevelValue = useCameraStore((s) => s.demoEyeLevelValue);
  const setDemoPostureValue = useCameraStore((s) => s.setDemoPostureValue);
  const setDemoEyeLevelValue = useCameraStore((s) => s.setDemoEyeLevelValue);
  const logEvent = useWellnessStore((s) => s.logEvent);

  const postureWasBad = useRef(demoPostureValue >= SLOUCH_THRESHOLD);
  const eyeWasBad = useRef(demoEyeLevelValue >= LOW_EYE_LEVEL_THRESHOLD);
  const postureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eyeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handlePosture(value: number) {
    setDemoPostureValue(value);
    if (postureTimer.current) clearTimeout(postureTimer.current);
    postureTimer.current = setTimeout(() => {
      const isBad = value >= SLOUCH_THRESHOLD;
      if (isBad && !postureWasBad.current) {
        logEvent("slouch_detected", { duration: 0 });
      } else if (!isBad && postureWasBad.current) {
        logEvent("posture_alignment_restored");
      }
      postureWasBad.current = isBad;
    }, DEBOUNCE_MS);
  }

  function handleEyeLevel(value: number) {
    setDemoEyeLevelValue(value);
    if (eyeTimer.current) clearTimeout(eyeTimer.current);
    eyeTimer.current = setTimeout(() => {
      const isBad = value >= LOW_EYE_LEVEL_THRESHOLD;
      if (isBad && !eyeWasBad.current) {
        logEvent("eye_level_warning");
      }
      eyeWasBad.current = isBad;
    }, DEBOUNCE_MS);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Manual Demo Fallback</h3>
        <Badge tone="demo">DEMO DATA</Badge>
      </div>

      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-muted">
            <span>Optimal</span>
            <span>Posture Demo Slider</span>
            <span>Slouch</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={demoPostureValue}
            onChange={(e) => handlePosture(Number(e.target.value))}
            className="accent-[var(--accent)]"
          />
        </label>

        <label className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-muted">
            <span>High</span>
            <span>Eye-Level Demo Slider</span>
            <span>Low</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={demoEyeLevelValue}
            onChange={(e) => handleEyeLevel(Number(e.target.value))}
            className="accent-[var(--accent)]"
          />
        </label>
      </div>
    </div>
  );
}
