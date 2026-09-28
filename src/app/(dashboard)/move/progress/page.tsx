"use client";

import { PageHeader } from "@/components/shell/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useMoveStore } from "@/lib/store/moveStore";
import { useWellnessStore } from "@/lib/store/wellnessStore";

function isThisWeek(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays >= 0 && diffDays < 7;
}

export default function ProgressPage() {
  const goals = useMoveStore((s) => s.goals);
  const workoutHistory = useMoveStore((s) => s.workoutHistory);
  const microStrollMinutesToday = useWellnessStore((s) => s.microStrollMinutesToday);

  const weekSessions = workoutHistory.filter((w) => isThisWeek(w.timestamp) && w.completed);
  const weekWorkoutMinutes = weekSessions.reduce((sum, w) => sum + w.durationMinutes, 0);

  const streak = (() => {
    const days = new Set(workoutHistory.filter((w) => w.completed).map((w) => new Date(w.timestamp).toDateString()));
    let count = 0;
    const cursor = new Date();
    while (days.has(cursor.toDateString())) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  })();

  const consistencyGoal = goals.find((g) => g.type === "frequency" || g.type === "consistency");
  const consistencyPlanned = consistencyGoal?.frequencyPerWeek ?? consistencyGoal?.target ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon="📈" title="My Progress" subtitle="Weekly activity, consistency, and goal completion." />

      <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border bg-surface p-5 text-center">
        <div>
          <div className="text-xl font-semibold text-foreground">{weekSessions.length}</div>
          <div className="text-xs text-muted">Workouts this week</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-foreground">{weekWorkoutMinutes}m</div>
          <div className="text-xs text-muted">Workout duration</div>
        </div>
        <div>
          <div className="text-xl font-semibold text-foreground">{streak}</div>
          <div className="text-xs text-muted">Day streak</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">This Week</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatBlock icon="🏋️" label="Strength" value={`${weekSessions.length} sessions`} />
          <StatBlock icon="🚶" label="Walking" value={`${microStrollMinutesToday} min`} />
          <StatBlock icon="🏃" label="Workouts" value={`${weekWorkoutMinutes} min`} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Goal Progress</h3>
        <div className="flex flex-col gap-4">
          {goals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
            return (
              <div key={goal.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-foreground">
                    {goal.icon} {goal.label}
                  </span>
                  <span className="text-muted">{pct}%</span>
                </div>
                <ProgressBar value={pct} tone="good" />
              </div>
            );
          })}
          {goals.length === 0 && <p className="text-sm text-muted">No goals yet.</p>}
        </div>
      </div>

      {consistencyGoal && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Your Week</h3>
          <p className="text-sm text-foreground">
            You completed {weekSessions.length} of your {consistencyPlanned} planned workouts.
          </p>
          {weekSessions.length < consistencyPlanned && (
            <p className="mt-1 text-xs text-muted">One goal remains incomplete — a short session this weekend would close the gap.</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatBlock({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
