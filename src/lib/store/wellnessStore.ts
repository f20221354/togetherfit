"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { registerUserScopedStore, userScopedStorage } from "./userScopedStorage";
import { EventType, Habits, ModuleKey, ScoreKey, WellnessEvent } from "../types";
import { computeDayScore, dayKey, trimHistory } from "../wellness/dailyScore";

interface EventConfig {
  module: ModuleKey;
  severity: "positive" | "info" | "warning";
  label: string;
  scoreImpact: Partial<Record<ScoreKey, number>>;
}

/** Every wellness action togetherfit understands, and exactly how it ripples across modules. */
const EVENT_CATALOG: Record<EventType, EventConfig> = {
  sunlight_completed: {
    module: "circadian",
    severity: "positive",
    label: "Sunlight exposure logged",
    scoreImpact: { circadian: 6, focus: 2 },
  },
  walk_completed: {
    module: "move",
    severity: "positive",
    label: "15-minute sunlight walk completed",
    scoreImpact: { movement: 10, circadian: 6, recovery: 3 },
  },
  breathing_completed: {
    module: "urgesurfer",
    severity: "positive",
    label: "90-second reset completed",
    scoreImpact: { focus: 6, recovery: 8, posture: 3 },
  },
  grounding_completed: {
    module: "urgesurfer",
    severity: "positive",
    label: "Grounding exercise completed",
    scoreImpact: { recovery: 6, focus: 3 },
  },
  hydration_logged: {
    module: "sanctuary",
    severity: "positive",
    label: "Hydration logged",
    scoreImpact: { recovery: 3 },
  },
  stretch_logged: {
    module: "sanctuary",
    severity: "positive",
    label: "Stretch logged",
    scoreImpact: { recovery: 3, posture: 2 },
  },
  posture_corrected: {
    module: "posture",
    severity: "positive",
    label: "Posture corrected",
    scoreImpact: { posture: 8 },
  },
  slouch_detected: {
    module: "posture",
    severity: "warning",
    label: "Prolonged slouching detected",
    scoreImpact: { posture: -8 },
  },
  doomscroll_detected: {
    module: "posture",
    severity: "warning",
    label: "Doomscroll pattern detected",
    scoreImpact: { focus: -6, posture: -3 },
  },
  focus_session_completed: {
    module: "posture",
    severity: "positive",
    label: "Focus session completed",
    scoreImpact: { focus: 8 },
  },
  sleep_window_completed: {
    module: "circadian",
    severity: "positive",
    label: "Sleep window honored",
    scoreImpact: { circadian: 8, recovery: 6 },
  },
  urge_reset_completed: {
    module: "urgesurfer",
    severity: "positive",
    label: "UrgeSurfer session completed",
    scoreImpact: { recovery: 8, focus: 4 },
  },
  morning_light_completed: {
    module: "circadian",
    severity: "positive",
    label: "Morning sunlight target reached",
    scoreImpact: { circadian: 8, focus: 3 },
  },
  evening_dim_recommended: {
    module: "circadian",
    severity: "info",
    label: "Evening dim-down recommended",
    scoreImpact: {},
  },
  eye_level_warning: {
    module: "posture",
    severity: "warning",
    label: "Screen angle appears low",
    scoreImpact: { posture: -4, focus: -2 },
  },
  posture_alignment_restored: {
    module: "posture",
    severity: "positive",
    label: "Alignment restored",
    scoreImpact: { posture: 4 },
  },
  run_completed: {
    module: "connect",
    severity: "positive",
    label: "Run completed with a wellness partner",
    scoreImpact: { movement: 12, recovery: 3 },
  },
  gym_session_completed: {
    module: "connect",
    severity: "positive",
    label: "Gym session completed with a wellness partner",
    scoreImpact: { movement: 10, recovery: 4 },
  },
  cycling_completed: {
    module: "connect",
    severity: "positive",
    label: "Cycling session completed with a wellness partner",
    scoreImpact: { movement: 10, circadian: 3 },
  },
  yoga_completed: {
    module: "connect",
    severity: "positive",
    label: "Yoga session completed with a wellness partner",
    scoreImpact: { recovery: 8, focus: 4 },
  },
  sports_completed: {
    module: "connect",
    severity: "positive",
    label: "Sports session completed with a wellness partner",
    scoreImpact: { movement: 10, recovery: 3 },
  },
  hiking_completed: {
    module: "connect",
    severity: "positive",
    label: "Hike completed with a wellness partner",
    scoreImpact: { movement: 12, circadian: 6 },
  },
  group_activity_completed: {
    module: "connect",
    severity: "positive",
    label: "Group wellness activity completed",
    scoreImpact: { movement: 8, recovery: 4, focus: 2 },
  },
  workout_completed: {
    module: "move",
    severity: "positive",
    label: "Workout completed",
    scoreImpact: { movement: 10, recovery: 4 },
  },
  trainer_session_completed: {
    module: "connect",
    severity: "positive",
    label: "Trainer session completed",
    scoreImpact: { movement: 10, recovery: 5, focus: 3 },
  },
  rhythm_reset_completed: {
    module: "urgesurfer",
    severity: "positive",
    label: "Rhythm reset completed",
    scoreImpact: { recovery: 7, focus: 4 },
  },
};

export type EnvironmentalLight = "low" | "moderate" | "bright" | "optimal";

export function getEnvironmentalLight(roomBrightness: number): EnvironmentalLight {
  if (roomBrightness < 40) return "low";
  if (roomBrightness < 65) return "moderate";
  if (roomBrightness < 85) return "bright";
  return "optimal";
}

interface DailyCounters {
  sunlightExposureMinutes: number;
  urgeSurferResetsToday: number;
  circadianMorningLightDone: boolean;
  microStrollMinutesToday: number;
  hydrationGlasses: number;
  stretchMinutes: number;
  eveningLightHigh: boolean;
  prolongedGaze: boolean;
  habits: Habits;
}

interface WellnessState extends DailyCounters {
  /** The local day the counters and scores below belong to (see dailyScore.ts). */
  day: string;
  /** Today's scores, built only from today's actions. */
  scores: Record<ScoreKey, number>;
  started: Record<ScoreKey, boolean>;
  globalScore: number;
  /** Did the user do anything today? False means show an empty state, not a number. */
  activeToday: boolean;
  /** One global score per active day, for the trend chart and 7-day average. */
  history: Record<string, number>;
  events: WellnessEvent[];

  roomBrightness: number; // 0-100, driven by today's score
  plantGrowth: number; // 0-100, driven by movement/circadian

  lastPostureCorrectionAt: string | null;
  lastResetAt: string | null;

  hydrationTarget: number;
  stretchTarget: number;

  logEvent: (type: EventType, extra?: { duration?: number }) => void;
  toggleHabit: (habit: keyof Habits) => void;
  setHydrationGlasses: (glasses: number) => void;
  setStretchMinutes: (minutes: number) => void;
  /** Starts a fresh day if the date changed since the last action. */
  rollover: () => void;
}

const INITIAL_HABITS: Habits = {
  sunlightWalk: false,
  noDoomscroll: false,
};

const FRESH_COUNTERS: DailyCounters = {
  sunlightExposureMinutes: 0,
  urgeSurferResetsToday: 0,
  circadianMorningLightDone: false,
  microStrollMinutesToday: 0,
  hydrationGlasses: 0,
  stretchMinutes: 0,
  eveningLightHigh: false,
  prolongedGaze: false,
  habits: INITIAL_HABITS,
};

const MAX_EVENTS = 500;

function makeId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Everything derived from the event log for `day`. */
function derived(events: WellnessEvent[], day: string, history: Record<string, number>) {
  const today = computeDayScore(events, day);
  return {
    scores: today.scores,
    started: today.started,
    globalScore: today.global,
    activeToday: today.active,
    history: today.active ? trimHistory({ ...history, [day]: today.global }) : history,
    roomBrightness: Math.round(20 + today.global * 0.8),
    plantGrowth: Math.round(10 + ((today.scores.movement + today.scores.circadian) / 2) * 0.9),
  };
}

function freshDay(events: WellnessEvent[], history: Record<string, number>) {
  const day = dayKey();
  return { day, ...FRESH_COUNTERS, ...derived(events, day, history) };
}

export const useWellnessStore = create<WellnessState>()(
  persist(
    (set, get) => ({
      ...freshDay([], {}),
      events: [],
      lastPostureCorrectionAt: null,
      lastResetAt: null,
      hydrationTarget: 8,
      stretchTarget: 10,

      rollover: () => {
        const state = get();
        if (state.day === dayKey()) return;
        set(freshDay(state.events, state.history));
      },

      logEvent: (type, extra) => {
        get().rollover();
        const config = EVENT_CATALOG[type];
        const event: WellnessEvent = {
          id: makeId(),
          timestamp: new Date().toISOString(),
          module: config.module,
          type,
          severity: config.severity,
          label: config.label,
          duration: extra?.duration,
          scoreImpact: config.scoreImpact,
        };

        set((state) => {
          const events = [event, ...state.events].slice(0, MAX_EVENTS);
          const patch: Partial<WellnessState> = { events, ...derived(events, state.day, state.history) };

          if (type === "posture_corrected" || type === "posture_alignment_restored") patch.lastPostureCorrectionAt = event.timestamp;
          if (type === "slouch_detected" || type === "doomscroll_detected" || type === "eye_level_warning") patch.prolongedGaze = true;
          if (type === "urge_reset_completed" || type === "breathing_completed") {
            patch.urgeSurferResetsToday = state.urgeSurferResetsToday + 1;
            patch.lastResetAt = event.timestamp;
            patch.prolongedGaze = false;
          }
          if (type === "walk_completed") {
            const minutes = Math.round((extra?.duration ?? 900) / 60);
            patch.microStrollMinutesToday = state.microStrollMinutesToday + minutes;
            patch.sunlightExposureMinutes = state.sunlightExposureMinutes + minutes;
            patch.habits = { ...state.habits, sunlightWalk: true };
          }
          if (type === "morning_light_completed" || type === "sunlight_completed") {
            patch.circadianMorningLightDone = true;
            patch.sunlightExposureMinutes = state.sunlightExposureMinutes + 15;
          }
          if (type === "evening_dim_recommended") patch.eveningLightHigh = true;
          return patch;
        });
      },

      toggleHabit: (habit) => {
        get().rollover();
        set((state) => ({ habits: { ...state.habits, [habit]: !state.habits[habit] } }));
      },

      setHydrationGlasses: (glasses) => {
        get().rollover();
        const clamped = Math.max(0, Math.min(20, Math.round(glasses)));
        const increased = clamped > get().hydrationGlasses;
        set({ hydrationGlasses: clamped });
        if (increased) get().logEvent("hydration_logged");
      },

      setStretchMinutes: (minutes) => {
        get().rollover();
        const clamped = Math.max(0, Math.min(120, Math.round(minutes)));
        const increased = clamped > get().stretchMinutes;
        set({ stretchMinutes: clamped });
        if (increased) get().logEvent("stretch_logged");
      },
    }),
    {
      name: "vitaos-wellness-store",
      storage: userScopedStorage,
      version: 1,
      // v0 seeded made-up scores and counters (83/100, "3 resets today"…). Keep only the
      // real event log and rebuild today and the history from it.
      migrate: (persisted) => {
        const old = (persisted ?? {}) as { events?: WellnessEvent[] };
        const events = Array.isArray(old.events) ? old.events.slice(0, MAX_EVENTS) : [];
        const history: Record<string, number> = {};
        for (const day of new Set(events.map((e) => dayKey(new Date(e.timestamp))))) {
          const d = computeDayScore(events, day);
          if (d.active) history[day] = d.global;
        }
        return { ...freshDay(events, trimHistory(history)), events, lastPostureCorrectionAt: null, lastResetAt: null } as unknown as WellnessState;
      },
      partialize: (state) => {
        const { logEvent, toggleHabit, setHydrationGlasses, setStretchMinutes, rollover, ...rest } = state;
        void logEvent;
        void toggleHabit;
        void setHydrationGlasses;
        void setStretchMinutes;
        void rollover;
        return rest;
      },
    }
  )
);

/** Mounted once in the app shell: starts a new day at midnight, even if the app stays open. */
export function useWellnessDayRollover() {
  useEffect(() => {
    const check = () => useWellnessStore.getState().rollover();
    check();
    const interval = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
}

export const MODULE_LABELS: Record<ModuleKey, string> = {
  sanctuary: "Sanctuary",
  posture: "Posture & Gaze Guard",
  urgesurfer: "UrgeSurfer",
  circadian: "Circadian Arc",
  move: "Move & Coach",
  connect: "Connect",
};

export const MODULE_ROUTES: Record<ModuleKey, string> = {
  sanctuary: "/sanctuary",
  posture: "/posture",
  urgesurfer: "/urgesurfer",
  circadian: "/sanctuary/circadian",
  move: "/move",
  connect: "/connect",
};

registerUserScopedStore(useWellnessStore);
