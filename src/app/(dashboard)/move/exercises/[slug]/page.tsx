"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ExerciseThumb } from "@/components/move/ExerciseThumb";
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

      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          <Badge>{exercise.difficulty}</Badge>
          <Badge>{exercise.category.replace(/([A-Z])/g, " $1")}</Badge>
        </div>
        <div className="flex flex-col items-center gap-4">
          <ExerciseThumb slug={exercise.slug} alt={exercise.name} size={140} />
          <p className="text-center text-sm text-muted">
            Good form for {exercise.name.toLowerCase()} means moving with control through a comfortable range of
            motion, keeping your core braced, and breathing steadily — never rushing reps or forcing a range that
            causes pain. The Do and Don&apos;t lists below, and the video underneath, cover the specific cues and
            mistakes for this exercise.
          </p>
          <a
            href={exercise.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-danger px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <span aria-hidden="true">▶</span> Watch form tutorial on YouTube
          </a>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-success/30 bg-success/5 p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-success">Do</h3>
          <ul className="flex flex-col gap-1.5 text-sm text-foreground">
            {exercise.formCues.map((cue) => (
              <li key={cue} className="flex gap-2">
                <span className="text-success">✓</span>
                {cue}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-danger">Don&apos;t</h3>
          <ul className="flex flex-col gap-1.5 text-sm text-foreground">
            {exercise.commonMistakes.map((mistake) => (
              <li key={mistake} className="flex gap-2">
                <span className="text-danger">✕</span>
                {mistake}
              </li>
            ))}
          </ul>
        </div>
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
