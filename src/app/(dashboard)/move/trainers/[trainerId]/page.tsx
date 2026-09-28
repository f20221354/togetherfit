"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { getTrainer } from "@/lib/move/trainers";
import { useMoveStore } from "@/lib/store/moveStore";

export default function TrainerProfilePage() {
  const params = useParams<{ trainerId: string }>();
  const router = useRouter();
  const trainer = getTrainer(params.trainerId);
  const requestTrainerSession = useMoveStore((s) => s.requestTrainerSession);
  const trainerRequests = useMoveStore((s) => s.trainerRequests);

  const [showRequest, setShowRequest] = useState(false);
  const [date, setDate] = useState("Saturday");
  const [time, setTime] = useState("19:00");
  const [format, setFormat] = useState<"online" | "in-person">("online");
  const [goal, setGoal] = useState("Strength training");

  if (!trainer) {
    return <div className="text-sm text-muted">This trainer profile isn&apos;t available.</div>;
  }

  const existingRequest = trainerRequests.find((r) => r.trainerId === trainer.id);

  function sendRequest() {
    requestTrainerSession(trainer!.id, { date, time, format, goal });
    setShowRequest(false);
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader icon="🧑‍🏫" title={trainer.name} subtitle={trainer.title} />

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8 text-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-2 text-5xl">
          {trainer.avatar}
        </span>
        <Badge>DEMO TRAINER</Badge>
        <div className="flex flex-wrap justify-center gap-2">
          {trainer.specialties.map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
        <div className="text-sm text-foreground">⭐ {trainer.rating} · {trainer.experienceYears}+ years experience</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Training format</div>
          <div className="mt-1 text-sm capitalize text-foreground">
            {trainer.format === "both" ? "Online + In-person" : trainer.format}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Availability</div>
          <div className="mt-1 text-sm text-foreground">{trainer.availability}</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Languages</div>
          <div className="mt-1 text-sm text-foreground">{trainer.languages.join(", ")}</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Demo pricing</div>
          <div className="mt-1 text-sm text-foreground">${trainer.pricePerSession} / session</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted">About</div>
        <p className="text-sm text-foreground">{trainer.bio}</p>
      </div>

      {existingRequest ? (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="mb-2 text-sm font-medium text-foreground">
            Session {existingRequest.status === "requested" ? "requested" : existingRequest.status}
          </div>
          <div className="text-xs text-muted">
            {existingRequest.date} · {existingRequest.time} · {existingRequest.format}
          </div>
          {existingRequest.status !== "requested" && (
            <button
              onClick={() => router.push(`/move/trainers/session/${existingRequest.id}`)}
              className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
            >
              Message
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowRequest(true)}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            Request Session
          </button>
        </div>
      )}

      {showRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground">Session Request</h3>
            <div className="flex flex-col gap-3 text-sm">
              <Row label="Trainer" value={trainer.name} />
              <label className="flex items-center justify-between">
                <span className="text-muted">Date</span>
                <select value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-foreground">
                  {["Today", "Tomorrow", "Saturday", "Sunday"].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-muted">Time</span>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-foreground" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-muted">Format</span>
                <select value={format} onChange={(e) => setFormat(e.target.value as "online" | "in-person")} className="rounded-lg border border-border bg-surface-2 px-2 py-1 text-foreground">
                  <option value="online">Online</option>
                  <option value="in-person">In-person</option>
                </select>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-muted">Goal</span>
                <input value={goal} onChange={(e) => setGoal(e.target.value)} className="w-40 rounded-lg border border-border bg-surface-2 px-2 py-1 text-foreground" />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowRequest(false)} className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2">
                Cancel
              </button>
              <button onClick={sendRequest} className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
