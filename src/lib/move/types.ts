export type GoalType =
  | "distance"
  | "duration"
  | "frequency"
  | "workout"
  | "consistency"
  | "strength"
  | "mobility"
  | "custom";

export interface Goal {
  id: string;
  label: string;
  icon: string;
  type: GoalType;
  target: number;
  current: number;
  unit: string; // "km", "steps", "sessions/week", "minutes", etc.
  frequencyPerWeek?: number;
  targetDate?: string;
  createdAt: string;
}

export type ExerciseCategory =
  | "strength"
  | "cardio"
  | "mobility"
  | "core"
  | "upperBody"
  | "lowerBody"
  | "fullBody"
  | "warmup"
  | "cooldown";

export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

/** Drives the single reusable animated silhouette — never duplicate an animation per screen. */
export type MotionType = "squat" | "pushup" | "lunge" | "plank" | "jump" | "twist" | "stretch" | "bridge";

export interface Exercise {
  slug: string;
  name: string;
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  equipment: string;
  motion: MotionType;
  defaultSets: number;
  defaultReps: string; // "12" or "30 sec"
  instructions: string[];
  formCues: string[];
  commonMistakes: string[];
  youtubeUrl: string;
}

export interface WorkoutExercise {
  exerciseSlug: string;
  sets: number;
  reps: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  category: string;
  durationMinutes: number;
  exercises: WorkoutExercise[];
}

export interface WorkoutSession {
  id: string;
  timestamp: string;
  templateId: string;
  templateName: string;
  durationMinutes: number;
  exerciseCount: number;
  setCount: number;
  completed: boolean;
}
