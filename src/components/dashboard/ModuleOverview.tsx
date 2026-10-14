"use client";

import { useWellnessStore } from "@/lib/store/wellnessStore";
import { useFriendCount } from "@/lib/network/useUnreadCount";
import { useMoveStore } from "@/lib/store/moveStore";
import { ModuleStatusCard } from "./ModuleStatusCard";

export function ModuleOverview() {
  const scores = useWellnessStore((s) => s.scores);
  const roomBrightness = useWellnessStore((s) => s.roomBrightness);
  const events = useWellnessStore((s) => s.events);
  const urgeSurferResetsToday = useWellnessStore((s) => s.urgeSurferResetsToday);
  const lastResetMinutesAgo = useWellnessStore((s) => s.lastResetMinutesAgo);
  const circadianMorningLightDone = useWellnessStore((s) => s.circadianMorningLightDone);
  const friendCount = useFriendCount();
  const goals = useMoveStore((s) => s.goals);
  const workoutHistory = useMoveStore((s) => s.workoutHistory);

  const postureWarnings = events.filter(
    (e) => e.module === "posture" && e.severity === "warning"
  ).length;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <ModuleStatusCard
        icon="🤝"
        title="Connect"
        metricLabel="Friends"
        metricValue={friendCount}
        detail="Find a partner"
        href="/connect"
      />
      <ModuleStatusCard
        icon="🏋️"
        title="Move & Coach"
        metricLabel="Goals"
        metricValue={goals.length}
        detail={`${workoutHistory.filter((w) => w.completed).length} workouts logged`}
        href="/move"
      />
      <ModuleStatusCard
        icon="🌿"
        title="Sanctuary"
        metricLabel="Room Health"
        metricValue={`${roomBrightness}%`}
        detail={
          circadianMorningLightDone
            ? `Circadian ${scores.circadian} · Morning light ✓`
            : `Circadian ${scores.circadian} · Morning light pending`
        }
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
    </div>
  );
}
