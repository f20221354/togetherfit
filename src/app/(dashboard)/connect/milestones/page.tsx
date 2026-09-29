"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { PageHeader } from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/lib/auth/authStore";
import { CelebrationCard, MILESTONES, MilestoneDef } from "@/lib/connect/milestones";
import { SPORTS } from "@/lib/connect/sports";
import { useCelebrationStore } from "@/lib/connect/celebrationStore";
import { logActivityAndCelebrate } from "@/lib/connect/logActivity";

interface Overview {
  achieved: CelebrationCard[];
  progress: { total: number; streak: number; group: number };
}

async function fetchOverview(email: string): Promise<Overview | null> {
  const res = await fetch(`/api/milestones?email=${encodeURIComponent(email)}`);
  const data = await res.json();
  return data.ok ? { achieved: data.achieved, progress: data.progress } : null;
}

function progressText(def: MilestoneDef, progress: Overview["progress"]): string {
  if (def.metric === "withConnection") return "Log sessions from a friend's chat";
  const value = progress[def.metric];
  return `${Math.min(value, def.target)} / ${def.target}`;
}

export default function MilestonesPage() {
  const user = useCurrentUser();
  const celebrate = useCelebrationStore((s) => s.celebrate);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchOverview(user!.email);
        if (!cancelled) setOverview(data);
      } catch {
        if (!cancelled) setError("Couldn't reach the server — is DATABASE_URL configured?");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function logSolo(sport: string) {
    if (!user) return;
    const result = await logActivityAndCelebrate(user, { sport });
    setNotice(result.ok ? (result.newMilestones.length > 0 ? null : "Activity logged ✅") : (result.error ?? "Couldn't log it."));
    const data = await fetchOverview(user.email);
    if (data) setOverview(data);
  }

  const achievedByKey = new Map<string, CelebrationCard>();
  for (const card of overview?.achieved ?? []) if (!achievedByKey.has(card.key)) achievedByKey.set(card.key, card);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader icon="🏅" title="Milestones" subtitle="Celebrate progress and share it with your friends." />

      {error && <p className="text-sm text-danger">{error}</p>}

      {overview && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Activities", value: overview.progress.total },
            { label: "Day streak", value: overview.progress.streak },
            { label: "Group sessions", value: overview.progress.group },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-surface p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Log an activity you just finished</h2>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => logSolo(s.key)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground hover:bg-surface-2"
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          Workouts from Move &amp; Coach count automatically. Log sessions with a friend or group from their chat.
        </p>
        {notice && <p className="text-xs text-muted">{notice}</p>}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">All milestones</h2>
        {MILESTONES.map((def) => {
          const card = achievedByKey.get(def.key);
          return (
            <div
              key={def.key}
              className={clsx(
                "flex items-center gap-3 rounded-2xl border p-4",
                card ? "border-accent/40 bg-accent/5" : "border-border bg-surface opacity-70"
              )}
            >
              <span className={clsx("text-2xl", !card && "grayscale")}>{def.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">{def.title}</div>
                <div className="text-xs text-muted">
                  {def.description} · {card ? `Unlocked ${new Date(card.achievedAt).toLocaleDateString()}` : overview ? progressText(def, overview.progress) : ""}
                </div>
              </div>
              {card && (
                <button
                  onClick={() => celebrate([card])}
                  className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black hover:opacity-90"
                >
                  🎉 Share
                </button>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
