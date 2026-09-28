"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { TRAINERS } from "@/lib/move/trainers";
import { TrainerFormat } from "@/lib/move/types";

const FORMATS: { key: TrainerFormat | "all"; label: string }[] = [
  { key: "all", label: "Any format" },
  { key: "online", label: "Online" },
  { key: "in-person", label: "In-person" },
  { key: "both", label: "Both" },
];

export default function TrainersPage() {
  const [format, setFormat] = useState<TrainerFormat | "all">("all");
  const [specialty, setSpecialty] = useState<string>("all");

  const specialties = useMemo(() => {
    const all = new Set<string>();
    TRAINERS.forEach((t) => t.specialties.forEach((s) => all.add(s)));
    return ["all", ...Array.from(all)];
  }, []);

  const filtered = TRAINERS.filter((t) => {
    const matchesFormat = format === "all" || t.format === format || t.format === "both";
    const matchesSpecialty = specialty === "all" || t.specialties.includes(specialty);
    return matchesFormat && matchesSpecialty;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon="🧑‍🏫" title="Trainer Connect" subtitle="Find a real personal trainer for expert, human guidance." />

      <div className="flex flex-wrap gap-2">
        {FORMATS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFormat(f.key)}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              format === f.key ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="mx-1 self-center text-xs text-muted">·</span>
        {specialties.map((s) => (
          <button
            key={s}
            onClick={() => setSpecialty(s)}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-medium",
              specialty === s ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted hover:text-foreground"
            )}
          >
            {s === "all" ? "Any specialty" : s}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((trainer) => (
          <Link
            key={trainer.id}
            href={`/move/trainers/${trainer.id}`}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 hover:bg-surface-2"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-2xl">
                {trainer.avatar}
              </span>
              <div>
                <div className="text-sm font-semibold text-foreground">{trainer.name}</div>
                <div className="text-xs text-muted">{trainer.title}</div>
              </div>
              <Badge>DEMO TRAINER</Badge>
            </div>
            <div className="text-xs text-muted">
              {trainer.specialties.join(" • ")} · {trainer.experienceYears}+ years experience
            </div>
            <div className="text-xs text-foreground">⭐ {trainer.rating}</div>
            <div className="text-xs text-muted capitalize">
              {trainer.format === "both" ? "Online + In-person" : trainer.format} · Available: {trainer.availability}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
