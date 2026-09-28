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
      { exerciseSlug: "wall-sit", sets: 3, reps: "30 sec" },
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
      { exerciseSlug: "cat-cow", sets: 1, reps: "8" },
      { exerciseSlug: "shoulder-stretch", sets: 1, reps: "30 sec each side" },
      { exerciseSlug: "arm-circles", sets: 1, reps: "20 sec each direction" },
    ],
  },
];

export function getWorkoutTemplate(id: string): WorkoutTemplate | undefined {
  return WORKOUT_TEMPLATES.find((w) => w.id === id);
}
