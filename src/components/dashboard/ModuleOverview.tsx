"use client";

import { useWellnessStore } from "@/lib/store/wellnessStore";
import { minutesAgoLabel, useNow } from "@/lib/useNow";
import { useFriendCount } from "@/lib/network/useUnreadCount";
import { useMoveStore } from "@/lib/store/moveStore";
import { ModuleStatusCard } from "./ModuleStatusCard";

export function ModuleOverview() {
  const scores = useWellnessStore((s) => s.scores);
  const roomBrightness = useWellnessStore((s) => s.roomBrightness);
  const events = useWellnessStore((s) => s.events);
  const urgeSurferResetsToday = useWellnessStore((s) => s.urgeSurferResetsToday);
  const lastResetAt = useWellnessStore((s) => s.lastResetAt);
  const now = useNow();
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
        icon="nav.connect"
        title="Connect"
        metricLabel="Friends"
        metricValue={friendCount}
        detail="Find a partner"
        href="/connect"
      />
      <ModuleStatusCard
        icon="nav.move"
        title="Move & Coach"
        metricLabel="Goals"
        metricValue={goals.length}
        detail={`${workoutHistory.filter((w) => w.completed).length} workouts logged`}
        href="/move"
      />
      <ModuleStatusCard
        icon="module.sanctuary"
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
        icon="module.posture"
        title="Posture & Gaze"
        metricLabel="Posture Score"
        metricValue={scores.posture}
        detail={`${postureWarnings} warning${postureWarnings === 1 ? "" : "s"} today`}
        progress={scores.posture}
        href="/posture"
      />
      <ModuleStatusCard
        icon="module.reset"
        title="UrgeSurfer"
        metricLabel="Resets Today"
        metricValue={urgeSurferResetsToday}
        detail={lastResetAt ? `Last reset ${minutesAgoLabel(lastResetAt, now)}` : "No resets yet"}
        href="/urgesurfer"
      />
    </div>
  );
}
