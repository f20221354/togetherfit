"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WinterArcState {
  /** Opt-in per account email — stores are per browser, so key by user. */
  joined: Record<string, boolean>;
  join: (email: string) => void;
}

/**
 * Only the opt-in is persisted. Whether the popup is open is deliberately
 * NOT stored anywhere, so it reappears on every fresh load/refresh.
 */
export const useWinterArcStore = create<WinterArcState>()(
  persist(
    (set) => ({
      joined: {},
      join: (email) => set((state) => ({ joined: { ...state.joined, [email]: true } })),
    }),
    { name: "vitaos-winter-arc-store" }
  )
);

/** `winterArcJoined` for the given user. */
export function useWinterArcJoined(email: string | undefined): boolean {
  return useWinterArcStore((s) => (email ? !!s.joined[email] : false));
}
