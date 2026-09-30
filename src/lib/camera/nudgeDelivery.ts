"use client";

import { useCameraStore } from "@/lib/store/cameraStore";
import { NUDGE_MESSAGES, NudgeKind } from "./postureNudges";

/**
 * Shows a posture/gaze nudge:
 * - always as the in-app toast (PostureNudgeToast reads useCameraStore.activeNudge);
 * - with a short vibration on touch devices that support it;
 * - as a system notification only when the user opted in, granted permission,
 *   and the app window isn't focused (e.g. working in another app on desktop).
 */
export function deliverNudge(kind: NudgeKind) {
  const store = useCameraStore.getState();
  const nudge = store.pushNudge(kind);
  const message = NUDGE_MESSAGES[nudge.kind];

  if (typeof navigator !== "undefined" && "vibrate" in navigator && window.matchMedia?.("(pointer: coarse)").matches) {
    navigator.vibrate?.(120);
  }

  if (!store.systemNotifications || !systemNotificationsSupported() || Notification.permission !== "granted") return;
  if (document.hasFocus()) return; // the in-app toast is already visible
  try {
    new Notification(message.title, { body: message.body, tag: "togetherfit-nudge", icon: "/brand/icon-light-192.png" });
  } catch {
    // Some mobile browsers only allow notifications from a service worker; the in-app nudge still shows.
  }
}

export function systemNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Asks for notification permission. Only call this from a user action (a button tap). */
export async function requestSystemNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (!systemNotificationsSupported()) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}
