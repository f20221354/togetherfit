"use client";

import { useWellnessStore } from "@/lib/store/wellnessStore";
import { useConnectStore } from "@/lib/store/connectStore";
import { ModuleStatusCard } from "./ModuleStatusCard";

export function ModuleOverview() {
  const scores = useWellnessStore((s) => s.scores);
  const roomBrightness = useWellnessStore((s) => s.roomBrightness);
  const events = useWellnessStore((s) => s.events);
  const urgeSurferResetsToday = useWellnessStore((s) => s.urgeSurferResetsToday);
  const lastResetMinutesAgo = useWellnessStore((s) => s.lastResetMinutesAgo);
  const circadianMorningLightDone = useWellnessStore((s) => s.circadianMorningLightDone);
  const microStrollMinutesToday = useWellnessStore((s) => s.microStrollMinutesToday);
  const connections = useConnectStore((s) => s.connections);
  const plans = useConnectStore((s) => s.plans);
  const upcomingPlans = plans.filter((p) => p.status === "upcoming").length;

  const postureWarnings = events.filter(
    (e) => e.module === "posture" && e.severity === "warning"
  ).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <ModuleStatusCard
        icon="🌿"
        title="Sanctuary"
        metricLabel="Room Health"
        metricValue={`${roomBrightness}%`}
        detail={roomBrightness > 70 ? "Optimal" : "Needs attention"}
        progress={roomBrightness}
        href="/sanctuary"
      />
      <ModuleStatusCard
        icon="👁"
        title="Posture & Gaze"
        metricLabel="Posture Score"
        metricValue={scores.posture}
        detail={`${postureWarnings} warning${postureWarnings === 1 ? "" : "s"} today`}
        progress={scores.posture}
        href="/posture"
      />
      <ModuleStatusCard
        icon="🫁"
        title="UrgeSurfer"
        metricLabel="Resets Today"
        metricValue={urgeSurferResetsToday}
        detail={`Last reset ${lastResetMinutesAgo}m ago`}
        href="/urgesurfer"
      />
      <ModuleStatusCard
        icon="☀️"
        title="Circadian Arc"
        metricLabel="Circadian Score"
        metricValue={scores.circadian}
        detail={circadianMorningLightDone ? "Morning light ✓" : "Morning light pending"}
        progress={scores.circadian}
        href="/circadian"
      />
      <ModuleStatusCard
        icon="🏃"
        title="Move & Coach"
        metricLabel="Movement Score"
        metricValue={scores.movement}
        detail={
          upcomingPlans > 0
            ? `${upcomingPlans} upcoming · ${microStrollMinutesToday}m today`
            : `${connections.length} connections · ${microStrollMinutesToday}m today`
        }
        progress={scores.movement}
        href="/move"
      />
    </div>
  );
}
