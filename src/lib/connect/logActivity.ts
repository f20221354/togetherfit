"use client";

import { useCelebrationStore } from "./celebrationStore";
import { CelebrationCard } from "./milestones";

export interface LogActivityOptions {
  sport: string;
  connectionId?: string;
  groupId?: string;
}

/**
 * Logs a completed activity on the real backend and, if it unlocked any
 * milestones, queues their celebration screens (CelebrationOverlay).
 */
export async function logActivityAndCelebrate(
  user: { email: string; name: string },
  options: LogActivityOptions
): Promise<{ ok: boolean; error?: string; newMilestones: CelebrationCard[] }> {
  try {
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, name: user.name, ...options }),
    });
    const data = await res.json();
    if (!data.ok) return { ok: false, error: data.error, newMilestones: [] };
    if (data.newMilestones.length > 0) useCelebrationStore.getState().celebrate(data.newMilestones);
    return { ok: true, newMilestones: data.newMilestones };
  } catch {
    return { ok: false, error: "Couldn't reach the server.", newMilestones: [] };
  }
}
