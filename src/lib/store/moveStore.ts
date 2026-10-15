"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { registerUserScopedStore, userScopedStorage } from "./userScopedStorage";
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
  reorderDraft: (fromIndex: number, toIndex: number) => void;
  clearDraft: () => void;

  createGoal: (goal: Omit<Goal, "id" | "createdAt">) => void;
  updateGoalProgress: (id: string, current: number) => void;
  deleteGoal: (id: string) => void;

  logWorkoutSession: (entry: Omit<WorkoutSession, "id" | "timestamp">) => void;

  sendCoachMessage: (text: string) => void;
  appendCoachReply: (text: string, workoutTemplateId?: string) => void;

  addMovementMinutes: (minutes: number) => void;
}

export const useMoveStore = create<MoveState>()(
  persist(
    (set) => ({
      // Nobody starts with goals: they set their own (Goals page or onboarding).
      goals: [],
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

      reorderDraft: (fromIndex, toIndex) =>
        set((state) => {
          if (
            fromIndex === toIndex ||
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= state.customWorkoutDraft.length ||
            toIndex >= state.customWorkoutDraft.length
          ) {
            return state;
          }
          const next = [...state.customWorkoutDraft];
          const [moved] = next.splice(fromIndex, 1);
          next.splice(toIndex, 0, moved);
          return { customWorkoutDraft: next };
        }),

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
    }),
    { name: "vitaos-move-store", storage: userScopedStorage }
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

registerUserScopedStore(useMoveStore);
