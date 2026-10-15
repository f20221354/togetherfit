"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WinterArcState {
  /** Opt-in per account email — stores are per browser, so key by user. */
  joined: Record<string, boolean>;
  /** Not joined and tapped "Maybe later": don't ask again until this time (ms). */
  snoozedUntil: Record<string, number>;
  /** Joined: the local day the progress popup was last shown, so it appears once a day. */
  lastShownDay: Record<string, string>;
  join: (email: string) => void;
  snooze: (email: string) => void;
  markShown: (email: string) => void;
}

const SNOOZE_DAYS = 3;
const today = () => new Date().toDateString();

/**
 * Persists the opt-in and when the popup may appear again: someone who
 * hasn't joined is asked again 3 days after "Maybe later"; someone who has
 * joined sees their progress at most once a day.
 */
export const useWinterArcStore = create<WinterArcState>()(
  persist(
    (set) => ({
      joined: {},
      snoozedUntil: {},
      lastShownDay: {},
      join: (email) => set((state) => ({ joined: { ...state.joined, [email]: true } })),
      snooze: (email) =>
        set((state) => ({ snoozedUntil: { ...state.snoozedUntil, [email]: Date.now() + SNOOZE_DAYS * 86_400_000 } })),
      markShown: (email) => set((state) => ({ lastShownDay: { ...state.lastShownDay, [email]: today() } })),
    }),
    { name: "vitaos-winter-arc-store" }
  )
);

/** `winterArcJoined` for the given user. */
export function useWinterArcJoined(email: string | undefined): boolean {
  return useWinterArcStore((s) => (email ? !!s.joined[email] : false));
}

/** Whether the popup should appear for this user right now. */
export function useWinterArcPopupDue(email: string | undefined): boolean {
  return useWinterArcStore((s) => {
    if (!email) return false;
    if (s.joined[email]) return s.lastShownDay[email] !== today();
    return (s.snoozedUntil[email] ?? 0) < Date.now();
  });
}
