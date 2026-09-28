"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BreathingPattern, SavedPattern, SessionHistoryEntry } from "@/lib/breathing/types";
import { DEFAULT_PATTERN, DEFAULT_SESSION_DURATION } from "@/lib/breathing/presets";

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface BreathingState {
  lastPattern: BreathingPattern;
  lastSessionDuration: number;
  savedPatterns: SavedPattern[];
  history: SessionHistoryEntry[];
  soundEnabled: boolean;
  hapticsEnabled: boolean;

  setLastPattern: (pattern: BreathingPattern) => void;
  setLastSessionDuration: (seconds: number) => void;
  savePattern: (name: string, icon: string, pattern: BreathingPattern) => void;
  deletePattern: (id: string) => void;
  logSession: (entry: Omit<SessionHistoryEntry, "id" | "timestamp">) => void;
  setSoundEnabled: (on: boolean) => void;
  setHapticsEnabled: (on: boolean) => void;
}

export const useBreathingStore = create<BreathingState>()(
  persist(
    (set) => ({
      lastPattern: DEFAULT_PATTERN,
      lastSessionDuration: DEFAULT_SESSION_DURATION,
      savedPatterns: [
        { id: "preset_calm", name: "Calm", icon: "🌿", pattern: { inhale: 10, holdAfterInhale: 10, exhale: 10, holdAfterExhale: 10 } },
        { id: "preset_evening", name: "Evening", icon: "🌙", pattern: { inhale: 6, holdAfterInhale: 6, exhale: 8, holdAfterExhale: 6 } },
        { id: "preset_quick", name: "Quick Reset", icon: "⚡", pattern: { inhale: 4, holdAfterInhale: 4, exhale: 4, holdAfterExhale: 4 } },
      ],
      history: [],
      soundEnabled: true,
      hapticsEnabled: true,

      setLastPattern: (lastPattern) => set({ lastPattern }),
      setLastSessionDuration: (lastSessionDuration) => set({ lastSessionDuration }),

      savePattern: (name, icon, pattern) =>
        set((state) => ({
          savedPatterns: [...state.savedPatterns, { id: makeId("pattern"), name, icon, pattern }],
        })),

      deletePattern: (id) =>
        set((state) => ({ savedPatterns: state.savedPatterns.filter((p) => p.id !== id) })),

      logSession: (entry) =>
        set((state) => ({
          history: [
            { id: makeId("session"), timestamp: new Date().toISOString(), ...entry },
            ...state.history,
          ].slice(0, 100),
        })),

      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
    }),
    { name: "vitaos-breathing-store" }
  )
);
