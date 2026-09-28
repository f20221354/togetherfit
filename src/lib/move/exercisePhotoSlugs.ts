/**
 * Slugs with a matched 0.jpg/1.jpg pair in public/exercises/<slug>/, sourced
 * from the free-exercise-db dataset (see README credits). Exercises not
 * listed here have no photo match and fall back to the stick-figure icon.
 */
export const EXERCISE_PHOTO_SLUGS = new Set<string>([
  "squat",
  "push-up",
  "lunge",
  "plank",
  "jumping-jacks",
  "glute-bridge",
  "mountain-climbers",
  "bicycle-crunch",
  "shoulder-stretch",
  "arm-circles",
  "abdominal-crunches",
  "russian-twist",
  "heel-touch",
  "leg-raises",
  "superman",
  "dead-bug",
  "flutter-kicks",
  "toe-touchers",
  "standing-hip-circles",
  "step-up-knee-raise",
]);

export function hasExercisePhotos(slug: string): boolean {
  return EXERCISE_PHOTO_SLUGS.has(slug);
}
