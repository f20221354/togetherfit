"use client";

import { useEffect } from "react";
import { useCameraStore } from "@/lib/store/cameraStore";
import { NUDGE_CONFIG, NUDGE_MESSAGES } from "@/lib/camera/postureNudges";

/**
 * In-app posture/gaze nudge, styled like the app's other toasts
 * (FriendRequestNotifier). Bottom-right on desktop so it never covers the
 * friend-request pop-ups (top-right); full-width along the bottom on phones.
 */
export function PostureNudgeToast() {
  const nudge = useCameraStore((s) => s.activeNudge);
  const dismiss = useCameraStore((s) => s.dismissNudge);

  useEffect(() => {
    if (!nudge) return;
    const timer = setTimeout(dismiss, NUDGE_CONFIG.NUDGE_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [nudge, dismiss]);

  if (!nudge) return null;
  const message = NUDGE_MESSAGES[nudge.kind];

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex justify-center pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:right-4 md:justify-end">
      <div
        key={nudge.id}
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-warning/40 bg-surface p-4 shadow-lg md:w-80"
      >
        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">{message.title}</div>
          <div className="mt-0.5 text-sm text-muted">{message.body}</div>
        </div>
        <button onClick={dismiss} className="text-muted hover:text-foreground" aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}
