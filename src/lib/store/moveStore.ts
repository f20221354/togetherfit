"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Goal, GoalType, WorkoutExercise, WorkoutSession } from "@/lib/move/types";
import { getExerciseBySlug } from "@/lib/move/exercises";

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface CoachChatMessage {
  id: string;
  sender: "me" | "coach";
  text: string;
  timestamp: string;
  workoutTemplateId?: string;
}

interface MoveState {
  goals: Goal[];
  workoutHistory: WorkoutSession[];
  coachChat: CoachChatMessage[];
  todayGoalMinutes: number; // "Today's Goal" target, e.g. 30
  todayMovedMinutes: number;
  customWorkoutDraft: WorkoutExercise[];

  addExerciseToDraft: (exerciseSlug: string) => void;
  removeExerciseFromDraft: (exerciseSlug: string) => void;
  clearDraft: () => void;

  createGoal: (goal: Omit<Goal, "id" | "createdAt">) => void;
  updateGoalProgress: (id: string, current: number) => void;
  deleteGoal: (id: string) => void;

  logWorkoutSession: (entry: Omit<WorkoutSession, "id" | "timestamp">) => void;

  sendCoachMessage: (text: string) => void;
  appendCoachReply: (text: string, workoutTemplateId?: string) => void;

  addMovementMinutes: (minutes: number) => void;
  seedDemoWorkouts: () => void;
}

const DEFAULT_GOALS: Goal[] = [
  {
    id: "goal_run5k",
    label: "Run 5 km",
    icon: "🏃",
    type: "distance",
    target: 5,
    current: 2,
    unit: "km",
    frequencyPerWeek: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: "goal_gym4x",
    label: "Strength train 3x/week",
    icon: "🏋️",
    type: "frequency",
    target: 3,
    current: 0,
    unit: "sessions/week",
    frequencyPerWeek: 3,
    createdAt: new Date().toISOString(),
  },
];

export const useMoveStore = create<MoveState>()(
  persist(
    (set) => ({
      goals: DEFAULT_GOALS,
      workoutHistory: [],
      coachChat: [],
      todayGoalMinutes: 30,
      todayMovedMinutes: 0,
      customWorkoutDraft: [],

      addExerciseToDraft: (exerciseSlug) =>
        set((state) => {
          if (state.customWorkoutDraft.some((e) => e.exerciseSlug === exerciseSlug)) return state;
          const exercise = getExerciseBySlug(exerciseSlug);
          if (!exercise) return state;
          return {
            customWorkoutDraft: [
              ...state.customWorkoutDraft,
              { exerciseSlug, sets: exercise.defaultSets, reps: exercise.defaultReps },
            ],
          };
        }),

      removeExerciseFromDraft: (exerciseSlug) =>
        set((state) => ({
          customWorkoutDraft: state.customWorkoutDraft.filter((e) => e.exerciseSlug !== exerciseSlug),
        })),

      clearDraft: () => set({ customWorkoutDraft: [] }),

      createGoal: (goal) =>
        set((state) => ({
          goals: [...state.goals, { ...goal, id: makeId("goal"), createdAt: new Date().toISOString() }],
        })),

      updateGoalProgress: (id, current) =>
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, current } : g)),
        })),

      deleteGoal: (id) => set((state) => ({ goals: state.goals.filter((g) => g.id !== id) })),

      logWorkoutSession: (entry) =>
        set((state) => ({
          workoutHistory: [
            { id: makeId("workout"), timestamp: new Date().toISOString(), ...entry },
            ...state.workoutHistory,
          ].slice(0, 200),
          todayMovedMinutes: state.todayMovedMinutes + entry.durationMinutes,
        })),

      sendCoachMessage: (text) =>
        set((state) => ({
          coachChat: [
            ...state.coachChat,
            { id: makeId("msg"), sender: "me", text, timestamp: new Date().toISOString() },
          ],
        })),

      appendCoachReply: (text, workoutTemplateId) =>
        set((state) => ({
          coachChat: [
            ...state.coachChat,
            { id: makeId("msg"), sender: "coach", text, timestamp: new Date().toISOString(), workoutTemplateId },
          ],
        })),

      addMovementMinutes: (minutes) =>
        set((state) => ({ todayMovedMinutes: state.todayMovedMinutes + minutes })),

      seedDemoWorkouts: () => {
        set((state) => {
          if (state.workoutHistory.length > 0) return state;
          const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
          return {
            workoutHistory: [
              { id: makeId("workout"), timestamp: daysAgo(0), templateId: "full-body-25", templateName: "Full Body", durationMinutes: 25, exerciseCount: 5, setCount: 13, completed: true },
              { id: makeId("workout"), timestamp: daysAgo(2), templateId: "lower-body-20", templateName: "Lower Body", durationMinutes: 20, exerciseCount: 4, setCount: 12, completed: true },
              { id: makeId("workout"), timestamp: daysAgo(4), templateId: "core-15", templateName: "Core Focus", durationMinutes: 15, exerciseCount: 3, setCount: 9, completed: true },
            ],
          };
        });
      },
    }),
    { name: "vitaos-move-store" }
  )
);

export const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  distance: "Distance",
  duration: "Duration",
  frequency: "Frequency",
  workout: "Workout",
  consistency: "Consistency",
  strength: "Strength",
  mobility: "Mobility",
  custom: "Custom",
};
