"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ExerciseAnimation } from "@/components/move/ExerciseAnimation";
import { getExerciseBySlug } from "@/lib/move/exercises";
import { useMoveStore } from "@/lib/store/moveStore";

export default function ExerciseDetailPage() {
  const params = useParams<{ slug: string }>();
  const exercise = getExerciseBySlug(params.slug);
  const addExerciseToDraft = useMoveStore((s) => s.addExerciseToDraft);
  const customWorkoutDraft = useMoveStore((s) => s.customWorkoutDraft);
  const [added, setAdded] = useState(false);

  if (!exercise) {
    return <div className="text-sm text-muted">This exercise isn&apos;t in the library.</div>;
  }

  const alreadyInDraft = customWorkoutDraft.some((e) => e.exerciseSlug === exercise.slug);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader icon="🏋️" title={exercise.name} subtitle={`${exercise.defaultSets} × ${exercise.defaultReps}`} />

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8">
        <ExerciseAnimation motionType={exercise.motion} size={130} />
        <div className="flex flex-wrap justify-center gap-2">
          <Badge>{exercise.difficulty}</Badge>
          <Badge>{exercise.category.replace(/([A-Z])/g, " $1")}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Primary area</div>
          <div className="mt-1 text-sm capitalize text-foreground">{exercise.category.replace(/([A-Z])/g, " $1")}</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Equipment</div>
          <div className="mt-1 text-sm text-foreground">{exercise.equipment}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">How to Perform</h3>
        <ol className="flex flex-col gap-3">
          {exercise.instructions.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-foreground">
              <span className="font-semibold text-accent-foreground">{String(i + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Common Form Cues</h3>
        <ul className="flex flex-col gap-1.5 text-sm text-foreground">
          {exercise.formCues.map((cue) => (
            <li key={cue}>✓ {cue}</li>
          ))}
        </ul>
      </div>

      <button
        onClick={() => {
          addExerciseToDraft(exercise.slug);
          setAdded(true);
        }}
        disabled={alreadyInDraft || added}
        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
      >
        {alreadyInDraft || added ? "Added to Workout ✓" : "Add to Workout"}
      </button>
    </div>
  );
}
