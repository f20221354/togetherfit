"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { EventType, Habits, ModuleKey, ScoreKey, WellnessEvent } from "../types";
import { applyScoreDelta, computeGlobalScore } from "../scoring";

interface EventConfig {
  module: ModuleKey;
  severity: "positive" | "info" | "warning";
  label: string;
  scoreImpact: Partial<Record<ScoreKey, number>>;
}

/** Every wellness action VitaOS understands, and exactly how it ripples across modules. */
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

interface WellnessState {
  scores: Record<ScoreKey, number>;
  globalScore: number;
  scoreHistory: { time: string; score: number }[];
  events: WellnessEvent[];
  habits: Habits;
  demoMode: boolean;
  dateRange: "today" | "7d" | "30d";

  roomBrightness: number; // 0-100, driven by wellness score
  plantGrowth: number; // 0-100, driven by movement/circadian
  sunlightExposureMinutes: number; // today's total sunlight/light exposure

  minutesSincePostureCorrection: number;
  eveningLightHigh: boolean;
  prolongedGaze: boolean;
  urgeSurferResetsToday: number;
  lastResetMinutesAgo: number;
  circadianMorningLightDone: boolean;
  microStrollMinutesToday: number;

  logEvent: (type: EventType, extra?: { duration?: number }) => void;
  toggleDemoMode: () => void;
  setDateRange: (range: "today" | "7d" | "30d") => void;
  toggleHabit: (habit: keyof Habits) => void;
  tickPostureClock: () => void;
  resetAll: () => void;
}

const INITIAL_SCORES: Record<ScoreKey, number> = {
  posture: 82,
  focus: 91,
  movement: 76,
  circadian: 88,
  recovery: 80,
};

const INITIAL_HABITS: Habits = {
  hydrated: false,
  stretched: false,
  sunlightWalk: false,
  noDoomscroll: true,
};

function makeId() {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useWellnessStore = create<WellnessState>()(
  persist(
    (set, get) => ({
      scores: INITIAL_SCORES,
      globalScore: computeGlobalScore(INITIAL_SCORES),
      scoreHistory: [{ time: new Date().toISOString(), score: computeGlobalScore(INITIAL_SCORES) }],
      events: [],
      habits: INITIAL_HABITS,
      demoMode: false,
      dateRange: "today",

      roomBrightness: 70,
      plantGrowth: 55,
      sunlightExposureMinutes: 15,

      minutesSincePostureCorrection: 6,
      eveningLightHigh: false,
      prolongedGaze: false,
      urgeSurferResetsToday: 3,
      lastResetMinutesAgo: 14,
      circadianMorningLightDone: true,
      microStrollMinutesToday: 15,

      logEvent: (type, extra) => {
        const config = EVENT_CATALOG[type];
        const nextScores = applyScoreDelta(get().scores, config.scoreImpact);
        const nextGlobal = computeGlobalScore(nextScores);

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
          const patch: Partial<WellnessState> = {
            scores: nextScores,
            globalScore: nextGlobal,
            scoreHistory: [...state.scoreHistory, { time: event.timestamp, score: nextGlobal }].slice(-50),
            events: [event, ...state.events].slice(0, 200),
            roomBrightness: Math.max(20, Math.min(100, Math.round((nextGlobal / 100) * 90 + 10))),
            plantGrowth: Math.max(
              10,
              Math.min(100, Math.round((nextScores.movement + nextScores.circadian) / 2))
            ),
          };

          if (type === "posture_corrected" || type === "posture_alignment_restored") {
            patch.minutesSincePostureCorrection = 0;
          }
          if (type === "slouch_detected") patch.prolongedGaze = true;
          if (type === "doomscroll_detected") patch.prolongedGaze = true;
          if (type === "eye_level_warning") patch.prolongedGaze = true;
          if (type === "urge_reset_completed" || type === "breathing_completed") {
            patch.urgeSurferResetsToday = state.urgeSurferResetsToday + 1;
            patch.lastResetMinutesAgo = 0;
            patch.prolongedGaze = false;
            patch.minutesSincePostureCorrection = 0;
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
          if (type === "evening_dim_recommended") {
            patch.eveningLightHigh = true;
          }

          return patch;
        });
      },

      toggleDemoMode: () => set((state) => ({ demoMode: !state.demoMode })),
      setDateRange: (range) => set({ dateRange: range }),
      toggleHabit: (habit) =>
        set((state) => ({ habits: { ...state.habits, [habit]: !state.habits[habit] } })),

      tickPostureClock: () =>
        set((state) => ({
          minutesSincePostureCorrection: state.minutesSincePostureCorrection + 1,
          lastResetMinutesAgo: state.lastResetMinutesAgo + 1,
        })),

      resetAll: () =>
        set({
          scores: INITIAL_SCORES,
          globalScore: computeGlobalScore(INITIAL_SCORES),
          scoreHistory: [{ time: new Date().toISOString(), score: computeGlobalScore(INITIAL_SCORES) }],
          events: [],
          habits: INITIAL_HABITS,
          roomBrightness: 70,
          plantGrowth: 55,
          sunlightExposureMinutes: 0,
          minutesSincePostureCorrection: 6,
          eveningLightHigh: false,
          prolongedGaze: false,
          urgeSurferResetsToday: 0,
          lastResetMinutesAgo: 0,
          circadianMorningLightDone: false,
          microStrollMinutesToday: 0,
        }),
    }),
    {
      name: "vitaos-wellness-store",
      partialize: (state) => {
        const { logEvent, toggleDemoMode, setDateRange, toggleHabit, tickPostureClock, resetAll, ...rest } = state;
        void logEvent;
        void toggleDemoMode;
        void setDateRange;
        void toggleHabit;
        void tickPostureClock;
        void resetAll;
        return rest;
      },
    }
  )
);

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
  circadian: "/circadian",
  move: "/move",
  connect: "/connect",
};
