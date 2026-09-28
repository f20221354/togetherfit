"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { PageHeader } from "@/components/shell/PageHeader";
import { ExerciseThumb } from "@/components/move/ExerciseThumb";
import { EXERCISES } from "@/lib/move/exercises";
import { ExerciseCategory } from "@/lib/move/types";

const CATEGORIES: { key: ExerciseCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "strength", label: "Strength" },
  { key: "cardio", label: "Cardio" },
  { key: "mobility", label: "Mobility" },
  { key: "core", label: "Core" },
  { key: "upperBody", label: "Upper Body" },
  { key: "lowerBody", label: "Lower Body" },
  { key: "fullBody", label: "Full Body" },
  { key: "warmup", label: "Warm-up" },
  { key: "cooldown", label: "Cool-down" },
];

export default function ExerciseLibraryPage() {
  const [category, setCategory] = useState<ExerciseCategory | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return EXERCISES.filter((e) => {
      const matchesCategory = category === "all" || e.category === category;
      const matchesQuery = e.name.toLowerCase().includes(query.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon="📚" title="Exercise Library" subtitle="Search exercises and learn how to perform them." />

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search exercises…"
        className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
      />

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              category === c.key ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted hover:text-foreground"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {filtered.map((exercise) => (
          <Link
            key={exercise.slug}
            href={`/move/exercises/${exercise.slug}`}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center hover:bg-surface-2"
          >
            <ExerciseThumb slug={exercise.slug} alt={exercise.name} size={64} />
            <div className="text-sm font-medium text-foreground">{exercise.name}</div>
            <div className="text-xs capitalize text-muted">{exercise.category.replace(/([A-Z])/g, " $1")}</div>
            <div className="text-xs capitalize text-muted">{exercise.difficulty}</div>
            <div className="text-xs text-muted">
              {exercise.defaultSets} × {exercise.defaultReps}
            </div>
            <span className="mt-1 text-xs font-medium text-accent-foreground">Learn →</span>
          </Link>
        ))}
        {filtered.length === 0 && <p className="col-span-full text-sm text-muted">No exercises match your search.</p>}
      </div>

      <p className="text-center text-xs text-muted">
        Exercise photos courtesy of{" "}
        <a href="https://github.com/yuhonas/free-exercise-db" className="underline hover:text-foreground">
          free-exercise-db
        </a>{" "}
        (public domain).
      </p>
    </div>
  );
}
