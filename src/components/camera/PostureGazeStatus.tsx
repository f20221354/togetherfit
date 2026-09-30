"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useCameraStore } from "@/lib/store/cameraStore";
import { NudgeState } from "@/lib/camera/postureNudges";
import { requestSystemNotifications, systemNotificationsSupported } from "@/lib/camera/nudgeDelivery";

const LABELS: Record<"posture" | "gaze", Record<NudgeState, string>> = {
  posture: { optimal: "Good", warning: "Adjust posture", recovering: "Nice, settling back…", "no-detection": "Not detected" },
  gaze: { optimal: "Good", warning: "Look toward screen", recovering: "Back on screen…", "no-detection": "Not detected" },
};

const DOT: Record<NudgeState, string> = {
  optimal: "bg-success",
  warning: "bg-warning",
  recovering: "bg-accent",
  "no-detection": "bg-muted",
};

function StatusCard({ label, state, monitoring }: { label: string; state: NudgeState; monitoring: boolean; }) {
  const key = label === "Posture" ? "posture" : "gaze";
  return (
    <div className={clsx("rounded-xl border bg-surface p-3", monitoring && state === "warning" ? "border-warning/40" : "border-border")}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
        <span className={clsx("h-1.5 w-1.5 rounded-full", monitoring ? DOT[state] : "bg-muted")} />
        {monitoring ? LABELS[key][state] : "Off"}
      </div>
    </div>
  );
}

// Notification.permission has no change event; re-read it after we ask.
const permissionListeners = new Set<() => void>();
function usePermission() {
  return useSyncExternalStore(
    (cb) => {
      permissionListeners.add(cb);
      return () => permissionListeners.delete(cb);
    },
    () => (systemNotificationsSupported() ? Notification.permission : "unsupported"),
    () => "unsupported"
  );
}

/** Live posture and gaze state, plus nudge preferences, for the Posture & Gaze Guard tab. */
export function PostureGazeStatus() {
  const monitoring = useCameraStore((s) => s.monitoring);
  const postureState = useCameraStore((s) => s.postureNudgeState);
  const gazeState = useCameraStore((s) => s.gazeNudgeState);
  const alertsEnabled = useCameraStore((s) => s.alertsEnabled);
  const gazeAlertsEnabled = useCameraStore((s) => s.gazeAlertsEnabled);
  const cooldown = useCameraStore((s) => s.alertCooldownMinutes);
  const systemNotifications = useCameraStore((s) => s.systemNotifications);
  const setSystemNotifications = useCameraStore((s) => s.setSystemNotifications);
  const permission = usePermission();
  const [asking, setAsking] = useState(false);

  async function enableSystemNotifications() {
    setAsking(true);
    const result = await requestSystemNotifications();
    permissionListeners.forEach((cb) => cb());
    setSystemNotifications(result === "granted");
    setAsking(false);
  }

  const nudgesOn = alertsEnabled || gazeAlertsEnabled;
  const which = alertsEnabled && gazeAlertsEnabled ? "Posture and gaze" : alertsEnabled ? "Posture" : "Gaze";

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3">
        <StatusCard label="Posture" state={postureState} monitoring={monitoring} />
        <StatusCard label="Gaze" state={gazeState} monitoring={monitoring} />
      </div>
      <div className="text-xs text-muted">
        {nudgesOn ? `${which} nudges on · reminds again every ${cooldown} min until you correct it.` : "Nudges are off."}{" "}
        <Link href="/settings" className="font-medium text-accent-foreground hover:underline">
          Change in Settings
        </Link>
      </div>
      {nudgesOn && permission === "default" && !systemNotifications && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Want a nudge even when you&apos;re working in another window? Your browser will ask for permission.</span>
          <button
            onClick={enableSystemNotifications}
            disabled={asking}
            className="rounded-full border border-border px-3 py-1 font-medium text-foreground hover:bg-surface-2 disabled:opacity-60"
          >
            {asking ? "Asking…" : "Allow notifications"}
          </button>
        </div>
      )}
      {nudgesOn && permission === "granted" && (
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={systemNotifications} onChange={(e) => setSystemNotifications(e.target.checked)} />
          Also notify me when this window isn&apos;t focused
        </label>
      )}
      {nudgesOn && permission === "denied" && (
        <div className="text-xs text-muted">Browser notifications are blocked. In-app nudges still work.</div>
      )}
    </div>
  );
}
