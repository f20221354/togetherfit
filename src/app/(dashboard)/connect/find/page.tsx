"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { PageHeader } from "@/components/shell/PageHeader";
import { AreaPicker, AreaPoint } from "@/components/connect/AreaPicker";
import { SPORTS, sportMeta } from "@/lib/connect/sports";
import { useCurrentUser } from "@/lib/auth/authStore";

const RADIUS_OPTIONS = [1, 2, 5, 10, 25];
const STEPS = ["Area", "When", "Activity"] as const;

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function defaultScheduleTime(): string {
  const d = new Date(Date.now() + 60 * 60_000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  return toLocalInput(d);
}

export default function FindAFriendPage() {
  const user = useCurrentUser();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [area, setArea] = useState<AreaPoint | null>(null);
  const [radiusKm, setRadiusKm] = useState(5);
  const [mode, setMode] = useState<"now" | "scheduled">("now");
  const [scheduledFor, setScheduledFor] = useState(defaultScheduleTime);
  const [sport, setSport] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<{ intentId: string; sport: string; mode: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function checkActive() {
      try {
        const res = await fetch(`/api/find/intent?email=${encodeURIComponent(user!.email)}`);
        const data = await res.json();
        if (!cancelled && data.ok) setActive(data.active);
      } catch {
        // No resume banner if the network is unreachable.
      }
    }
    checkActive();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const canContinue = step === 0 ? !!area : step === 1 ? mode === "now" || !!scheduledFor : !!sport;

  async function start() {
    if (!user || !area || !sport || starting) return;
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/find/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          name: user.name,
          sport,
          lat: area.lat,
          lng: area.lng,
          areaLabel: area.label,
          radiusKm,
          mode,
          startTime: mode === "scheduled" ? new Date(scheduledFor).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (data.ok) router.push(`/connect/find/${data.intentId}`);
      else setError(data.error ?? "Couldn't start the search.");
    } catch {
      setError("Couldn't reach the server — is DATABASE_URL configured?");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader icon="🔎" title="Find a Friend" subtitle="Find real people nearby who want to do the same activity." />

      {active && (
        <Link
          href={`/connect/find/${active.intentId}`}
          className="rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm text-foreground hover:bg-accent/15"
        >
          {sportMeta(active.sport).icon} You have a live {sportMeta(active.sport).label} search — <b>resume radar →</b>
        </Link>
      )}

      <ol className="flex gap-2">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={clsx(
              "flex-1 rounded-full px-3 py-1.5 text-center text-xs font-medium",
              i === step ? "bg-accent text-black" : i < step ? "bg-accent/15 text-accent-foreground" : "bg-surface-2 text-muted"
            )}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">Where do you want to meet?</h2>
          <AreaPicker value={area} radiusKm={radiusKm} onChange={setArea} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted">Radius:</span>
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setRadiusKm(r)}
                className={clsx(
                  "rounded-full border px-3 py-1 text-xs font-medium",
                  radiusKm === r ? "border-accent bg-accent/10 text-accent-foreground" : "border-border text-muted"
                )}
              >
                {r} km
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">When?</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["now", "scheduled"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={clsx(
                  "rounded-2xl border p-4 text-left",
                  mode === m ? "border-accent bg-accent/10" : "border-border bg-surface hover:bg-surface-2"
                )}
              >
                <div className="text-lg">{m === "now" ? "⚡" : "📅"}</div>
                <div className="text-sm font-semibold text-foreground">{m === "now" ? "Now" : "Schedule for later"}</div>
                <div className="text-xs text-muted">
                  {m === "now" ? "Match with people who are free right now" : "Pick a date and time"}
                </div>
              </button>
            ))}
          </div>
          {mode === "scheduled" && (
            <input
              type="datetime-local"
              value={scheduledFor}
              min={toLocalInput(new Date())}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          )}
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">What do you want to do?</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {SPORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSport(s.key)}
                className={clsx(
                  "flex flex-col items-center gap-1 rounded-2xl border p-4 text-sm font-medium",
                  sport === s.key ? "border-accent bg-accent/10 text-foreground" : "border-border bg-surface text-foreground hover:bg-surface-2"
                )}
              >
                <span className="text-2xl">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-2">
        {step > 0 && (
          <button
            onClick={() => setStep(step - 1)}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-2"
          >
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canContinue}
            className="flex-1 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={start}
            disabled={!canContinue || starting}
            className="flex-1 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50"
          >
            {starting ? "Starting…" : "Start searching"}
          </button>
        )}
      </div>
    </div>
  );
}
