"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { useMoveStore } from "@/lib/store/moveStore";
import { useConnectStore } from "@/lib/store/connectStore";
import { useCurrentUser } from "@/lib/auth/authStore";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getCoachSuggestions } from "@/lib/move/aiCoach";
import { getWorkoutTemplate } from "@/lib/move/workoutTemplates";
import { MOCK_PARTNERS } from "@/lib/connect/mockPartners";
import { TRAINERS } from "@/lib/move/trainers";

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

export default function MoveOverviewPage() {
  const user = useCurrentUser();
  const goals = useMoveStore((s) => s.goals);
  const workoutHistory = useMoveStore((s) => s.workoutHistory);
  const todayGoalMinutes = useMoveStore((s) => s.todayGoalMinutes);
  const microStrollMinutesToday = useWellnessStore((s) => s.microStrollMinutesToday);
  const connections = useConnectStore((s) => s.connections);
  const plans = useConnectStore((s) => s.plans);

  const todayWorkoutMinutes = workoutHistory
    .filter((w) => isToday(w.timestamp) && w.completed)
    .reduce((sum, w) => sum + w.durationMinutes, 0);
  const movedMinutes = Math.min(todayGoalMinutes, microStrollMinutesToday + todayWorkoutMinutes);
  const progressPct = Math.round((movedMinutes / todayGoalMinutes) * 100);

  const suggestions = useMemo(
    () => getCoachSuggestions({ goals, workoutHistory, preferredHour: workoutHistory.length > 0 ? 19 : null }),
    [goals, workoutHistory]
  );
  const topSuggestion = suggestions[0];
  const suggestedTemplate = topSuggestion?.workoutTemplateId ? getWorkoutTemplate(topSuggestion.workoutTemplateId) : null;

  const upcomingPlan = plans.find((p) => p.status === "upcoming");
  const partnerPreview = MOCK_PARTNERS.slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Good {timeOfDayGreeting()}{user ? `, ${user.name.split(" ")[0]}` : ""}.
        </h1>
        <p className="text-sm text-muted">Your movement plan is ready.</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Today&apos;s Goal</div>
        <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
          🏃 {todayGoalMinutes} min movement
        </div>
        <ProgressBar value={progressPct} tone="good" />
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span>
            {movedMinutes} / {todayGoalMinutes} minutes
          </span>
          <span>{progressPct}%</span>
        </div>
        <Link
          href="/move/activity"
          className="mt-4 inline-block rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          Continue Activity
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">AI Coach</div>
          <p className="text-sm text-foreground">{topSuggestion?.message}</p>
          <Link
            href="/move/coach"
            className="mt-3 inline-block rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-2"
          >
            Ask Coach
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Next Activity</div>
          {suggestedTemplate ? (
            <>
              <div className="text-sm font-medium text-foreground">🏋️ {suggestedTemplate.name}</div>
              <div className="text-xs text-muted">{suggestedTemplate.durationMinutes} minutes</div>
              <Link
                href="/move/workout"
                className="mt-3 inline-block rounded-full bg-accent/15 px-4 py-2 text-xs font-medium text-accent-foreground hover:bg-accent/25"
              >
                Start
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted">No activity planned yet.</p>
          )}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Activity Partners</h2>
          {upcomingPlan && (
            <Link href={`/move/activity/plan/${upcomingPlan.id}`} className="text-xs font-medium text-accent-foreground hover:underline">
              View upcoming →
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {partnerPreview.map((p) => (
            <Link
              key={p.id}
              href={`/move/activity/profile/${p.id}`}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-surface-2"
            >
              <span>{p.avatar}</span>
              {p.name}
            </Link>
          ))}
          <Link
            href="/move/activity/discover"
            className="rounded-full bg-accent/15 px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent/25"
          >
            Find a Partner
          </Link>
        </div>
        {connections.length > 0 && (
          <p className="mt-2 text-xs text-muted">{connections.length} connections so far.</p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Trainer Connect</div>
        <p className="text-sm text-foreground">Need expert guidance?</p>
        <p className="mb-3 text-xs text-muted">{TRAINERS.length} demo trainers available for strength, running, and mobility coaching.</p>
        <Link
          href="/move/trainers"
          className="inline-block rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
        >
          Find a Personal Trainer
        </Link>
      </div>
    </div>
  );
}

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}
