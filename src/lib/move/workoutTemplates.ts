import { WorkoutTemplate } from "./types";

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "full-body-25",
    name: "Full Body",
    category: "Full Body",
    durationMinutes: 25,
    exercises: [
      { exerciseSlug: "squat", sets: 3, reps: "12" },
      { exerciseSlug: "push-up", sets: 3, reps: "10" },
      { exerciseSlug: "lunge", sets: 3, reps: "10" },
      { exerciseSlug: "plank", sets: 3, reps: "30 sec" },
      { exerciseSlug: "shoulder-stretch", sets: 1, reps: "30 sec each side" },
    ],
  },
  {
    id: "lower-body-20",
    name: "Lower Body",
    category: "Lower Body",
    durationMinutes: 20,
    exercises: [
      { exerciseSlug: "squat", sets: 3, reps: "15" },
      { exerciseSlug: "lunge", sets: 3, reps: "12" },
      { exerciseSlug: "glute-bridge", sets: 3, reps: "15" },
      { exerciseSlug: "step-up-knee-raise", sets: 3, reps: "12 each side" },
    ],
  },
  {
    id: "bodyweight-15",
    name: "Bodyweight Quick Session",
    category: "Full Body",
    durationMinutes: 15,
    exercises: [
      { exerciseSlug: "jumping-jacks", sets: 2, reps: "30 sec" },
      { exerciseSlug: "squat", sets: 2, reps: "12" },
      { exerciseSlug: "push-up", sets: 2, reps: "8" },
      { exerciseSlug: "plank", sets: 2, reps: "20 sec" },
    ],
  },
  {
    id: "core-15",
    name: "Core Focus",
    category: "Core",
    durationMinutes: 15,
    exercises: [
      { exerciseSlug: "plank", sets: 3, reps: "30 sec" },
      { exerciseSlug: "bicycle-crunch", sets: 3, reps: "15" },
      { exerciseSlug: "mountain-climbers", sets: 3, reps: "30 sec" },
    ],
  },
  {
    id: "mobility-10",
    name: "Mobility & Cooldown",
    category: "Mobility",
    durationMinutes: 10,
    exercises: [
      { exerciseSlug: "superman", sets: 3, reps: "12" },
      { exerciseSlug: "shoulder-stretch", sets: 1, reps: "30 sec each side" },
      { exerciseSlug: "arm-circles", sets: 1, reps: "20 sec each direction" },
    ],
  },
  {
    id: "push-day",
    name: "Push Day",
    category: "Push Pull Legs",
    durationMinutes: 30,
    exercises: [
      { exerciseSlug: "push-up", sets: 3, reps: "10" },
      { exerciseSlug: "dumbbell-bench-press", sets: 3, reps: "10" },
      { exerciseSlug: "shoulder-press", sets: 3, reps: "10" },
      { exerciseSlug: "triceps-dip", sets: 3, reps: "12" },
    ],
  },
  {
    id: "pull-day",
    name: "Pull Day",
    category: "Push Pull Legs",
    durationMinutes: 25,
    exercises: [
      { exerciseSlug: "pull-up", sets: 3, reps: "8" },
      { exerciseSlug: "bent-over-row", sets: 3, reps: "12" },
      { exerciseSlug: "barbell-curl", sets: 3, reps: "12" },
    ],
  },
  {
    id: "leg-day",
    name: "Leg Day",
    category: "Push Pull Legs",
    durationMinutes: 30,
    exercises: [
      { exerciseSlug: "squat", sets: 4, reps: "12" },
      { exerciseSlug: "lunge", sets: 3, reps: "10 each side" },
      { exerciseSlug: "glute-bridge", sets: 3, reps: "15" },
      { exerciseSlug: "step-up-knee-raise", sets: 3, reps: "12 each side" },
    ],
  },
  {
    id: "chest-focus",
    name: "Chest",
    category: "Muscle Focus",
    durationMinutes: 20,
    exercises: [
      { exerciseSlug: "push-up", sets: 3, reps: "12" },
      { exerciseSlug: "dumbbell-bench-press", sets: 3, reps: "10" },
    ],
  },
  {
    id: "back-focus",
    name: "Back",
    category: "Muscle Focus",
    durationMinutes: 20,
    exercises: [
      { exerciseSlug: "pull-up", sets: 3, reps: "8" },
      { exerciseSlug: "bent-over-row", sets: 3, reps: "12" },
    ],
  },
  {
    id: "shoulders-focus",
    name: "Shoulders",
    category: "Muscle Focus",
    durationMinutes: 20,
    exercises: [
      { exerciseSlug: "arm-circles", sets: 1, reps: "20 sec each direction" },
      { exerciseSlug: "shoulder-press", sets: 3, reps: "10" },
      { exerciseSlug: "push-up", sets: 2, reps: "10" },
    ],
  },
  {
    id: "biceps-focus",
    name: "Biceps",
    category: "Muscle Focus",
    durationMinutes: 15,
    exercises: [
      { exerciseSlug: "barbell-curl", sets: 4, reps: "12" },
      { exerciseSlug: "pull-up", sets: 3, reps: "8" },
    ],
  },
  {
    id: "triceps-focus",
    name: "Triceps",
    category: "Muscle Focus",
    durationMinutes: 15,
    exercises: [
      { exerciseSlug: "triceps-dip", sets: 4, reps: "12" },
      { exerciseSlug: "push-up", sets: 3, reps: "10" },
    ],
  },
  {
    id: "legs-focus",
    name: "Legs",
    category: "Muscle Focus",
    durationMinutes: 25,
    exercises: [
      { exerciseSlug: "squat", sets: 4, reps: "15" },
      { exerciseSlug: "lunge", sets: 3, reps: "12 each side" },
      { exerciseSlug: "step-up-knee-raise", sets: 3, reps: "12 each side" },
    ],
  },
];

export function getWorkoutTemplate(id: string): WorkoutTemplate | undefined {
  return WORKOUT_TEMPLATES.find((w) => w.id === id);
}
