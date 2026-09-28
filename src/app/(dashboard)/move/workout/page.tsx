"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ExerciseAnimation } from "@/components/move/ExerciseAnimation";
import { useMoveStore } from "@/lib/store/moveStore";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { WORKOUT_TEMPLATES } from "@/lib/move/workoutTemplates";
import { getExerciseBySlug } from "@/lib/move/exercises";
import { WorkoutTemplate } from "@/lib/move/types";

type Stage = "select" | "player" | "complete";

export default function WorkoutPage() {
  const logWorkoutSession = useMoveStore((s) => s.logWorkoutSession);
  const workoutHistory = useMoveStore((s) => s.workoutHistory);
  const customWorkoutDraft = useMoveStore((s) => s.customWorkoutDraft);
  const clearDraft = useMoveStore((s) => s.clearDraft);
  const logWellnessEvent = useWellnessStore((s) => s.logEvent);

  const [stage, setStage] = useState<Stage>("select");
  const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(0);
  const [finalStats, setFinalStats] = useState({ durationMinutes: 0, exerciseCount: 0, setCount: 0 });

  function startWorkout(t: WorkoutTemplate) {
    setTemplate(t);
    setExerciseIndex(0);
    setCompletedSets(0);
    setStartedAt(Date.now());
    setStage("player");
  }

  function finishWorkout(setsSoFar: number) {
    if (!template) return;
    const durationMinutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000)) || template.durationMinutes;
    const stats = { durationMinutes: template.durationMinutes, exerciseCount: template.exercises.length, setCount: setsSoFar };
    setFinalStats(stats);
    logWorkoutSession({
      templateId: template.id,
      templateName: template.name,
      durationMinutes: stats.durationMinutes,
      exerciseCount: stats.exerciseCount,
      setCount: stats.setCount,
      completed: true,
    });
    logWellnessEvent("workout_completed", { duration: durationMinutes * 60 });
    setStage("complete");
  }

  if (stage === "select") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader icon="🏋️" title="Workout" subtitle="Today's workout, or pick a template to get moving." />

        {customWorkoutDraft.length > 0 && (
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
            <div className="mb-1 text-sm font-semibold text-foreground">My Custom Workout</div>
            <div className="mb-3 text-xs text-muted">{customWorkoutDraft.length} exercises added from the library</div>
            <ol className="mb-4 flex flex-col gap-1 text-xs text-muted">
              {customWorkoutDraft.map((ex, i) => {
                const exercise = getExerciseBySlug(ex.exerciseSlug);
                return (
                  <li key={i}>
                    {i + 1}. {exercise?.name} — {ex.sets} × {ex.reps}
                  </li>
                );
              })}
            </ol>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  startWorkout({
                    id: "custom",
                    name: "My Custom Workout",
                    category: "Custom",
                    durationMinutes: Math.max(10, customWorkoutDraft.length * 5),
                    exercises: customWorkoutDraft,
                  })
                }
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
              >
                Start Workout
              </button>
              <button
                onClick={clearDraft}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {WORKOUT_TEMPLATES.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="mb-1 text-sm font-semibold text-foreground">{t.name}</div>
              <div className="mb-3 text-xs text-muted">
                {t.durationMinutes} minutes · {t.exercises.length} exercises
              </div>
              <ol className="mb-4 flex flex-col gap-1 text-xs text-muted">
                {t.exercises.map((ex, i) => {
                  const exercise = getExerciseBySlug(ex.exerciseSlug);
                  return (
                    <li key={i}>
                      {i + 1}. {exercise?.name} — {ex.sets} × {ex.reps}
                    </li>
                  );
                })}
              </ol>
              <button
                onClick={() => startWorkout(t)}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
              >
                Start Workout
              </button>
            </div>
          ))}
        </div>

        {workoutHistory.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Recent Workouts</h3>
            <div className="flex flex-col gap-2">
              {workoutHistory.slice(0, 5).map((w) => (
                <div key={w.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{w.templateName}</span>
                  <span className="text-xs text-muted">
                    {w.durationMinutes} min · {w.setCount} sets
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (stage === "player" && template) {
    const activeTemplate = template;
    const currentExerciseRef = activeTemplate.exercises[exerciseIndex];
    const exercise = getExerciseBySlug(currentExerciseRef.exerciseSlug);
    const nextExercise = activeTemplate.exercises[exerciseIndex + 1]
      ? getExerciseBySlug(activeTemplate.exercises[exerciseIndex + 1].exerciseSlug)
      : null;
    const overallProgress = Math.round(
      ((exerciseIndex + completedSets / currentExerciseRef.sets) / activeTemplate.exercises.length) * 100
    );

    function completeSet() {
      const nextCount = completedSets + 1;
      if (nextCount >= currentExerciseRef.sets) {
        goNext(nextCount);
      } else {
        setCompletedSets(nextCount);
      }
    }

    function goNext(setsJustDone?: number) {
      const runningTotal = totalCompletedSets() + (setsJustDone ?? completedSets);
      if (exerciseIndex + 1 < activeTemplate.exercises.length) {
        setExerciseIndex(exerciseIndex + 1);
        setCompletedSets(0);
      } else {
        finishWorkout(runningTotal);
      }
    }

    function totalCompletedSets(): number {
      return activeTemplate.exercises.slice(0, exerciseIndex).reduce((sum, e) => sum + e.sets, 0);
    }

    function goPrevious() {
      if (exerciseIndex === 0) return;
      setExerciseIndex(exerciseIndex - 1);
      setCompletedSets(0);
    }

    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-5">
        <PageHeader icon="🏋️" title="Today's Workout" subtitle={`Exercise ${exerciseIndex + 1} / ${template.exercises.length}`} />

        <div className="text-lg font-semibold uppercase tracking-wide text-foreground">{exercise?.name}</div>
        {exercise && <ExerciseAnimation motionType={exercise.motion} size={110} />}

        <div className="text-sm text-muted">
          {currentExerciseRef.sets} × {currentExerciseRef.reps}
        </div>
        <div className="text-xs text-muted">
          Set {Math.min(completedSets + 1, currentExerciseRef.sets)} / {currentExerciseRef.sets}
        </div>

        <button onClick={completeSet} className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-black hover:opacity-90">
          Complete Set
        </button>

        <div className="w-full">
          <ProgressBar value={overallProgress} tone="good" />
        </div>

        {nextExercise && <div className="text-xs text-muted">Next: {nextExercise.name.toUpperCase()}</div>}

        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={goPrevious} className="rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-2">
            Previous
          </button>
          <button onClick={() => goNext()} className="rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-2">
            Next Exercise
          </button>
          <button
            onClick={() => goNext()}
            className="rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-2"
          >
            Skip
          </button>
          <button
            onClick={() => finishWorkout(totalCompletedSets() + completedSets)}
            className="rounded-full border border-danger/40 px-4 py-2 text-xs font-medium text-danger hover:bg-danger/10"
          >
            Finish Workout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
      <span className="text-4xl">🎉</span>
      <h2 className="text-lg font-semibold text-foreground">Workout Complete</h2>
      <div className="text-sm text-muted">
        {finalStats.durationMinutes} minutes · {finalStats.exerciseCount} exercises · {finalStats.setCount} sets
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <a href="/move/progress" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
          View Progress
        </a>
        <button
          onClick={() => setStage("select")}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
        >
          Plan Next Workout
        </button>
        <button
          onClick={() => setStage("select")}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
        >
          Done
        </button>
      </div>
    </div>
  );
}
