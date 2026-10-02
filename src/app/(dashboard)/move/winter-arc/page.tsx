"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { PageHeader } from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/lib/auth/authStore";
import { useMoveStore } from "@/lib/store/moveStore";
import { useIsClient } from "@/lib/useIsClient";
import { useWinterArcJoined, useWinterArcStore } from "@/lib/winterArc/store";
import { markWinterArcDailyActive, trackWinterArc } from "@/lib/winterArc/analytics";
import { CelebrationCard } from "@/lib/connect/milestones";
import {
  WINTER_ARC_COPY,
  WINTER_ARC_PARTNER_FINDER_PATH,
  isWithinWinterArc,
  winterArcDay,
  winterArcDaysRemaining,
  winterArcEnd,
  winterArcPhase,
  winterArcStart,
  winterArcTotalDays,
} from "@/lib/winterArc/config";

const shortDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/** Consecutive days with a workout, counted back from `from`. */
function streakEndingOn(days: Set<string>, from: Date): number {
  let count = 0;
  const cursor = new Date(from);
  while (days.has(cursor.toDateString())) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export default function WinterArcPage() {
  const isClient = useIsClient();
  // Dates depend on the viewer's clock, so render after hydration only.
  if (!isClient) return null;
  return <WinterArcContent />;
}

function WinterArcContent() {
  const user = useCurrentUser();
  const email = user?.email;
  const joined = useWinterArcJoined(email);
  const join = useWinterArcStore((s) => s.join);
  const workoutHistory = useMoveStore((s) => s.workoutHistory);
  const [arcMilestones, setArcMilestones] = useState<CelebrationCard[] | null>(null);

  const loggedView = useRef(false);
  useEffect(() => {
    if (!email || loggedView.current) return;
    loggedView.current = true;
    trackWinterArc("winter_arc_page_viewed", email, { joined });
    markWinterArcDailyActive(email);
  }, [email, joined]);

  // Connect activities live in Postgres; reuse the milestones API rather than storing anything new.
  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    fetch(`/api/milestones?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.ok) return;
        setArcMilestones((data.achieved as CelebrationCard[]).filter((m) => isWithinWinterArc(m.achievedAt)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [email]);

  const phase = winterArcPhase();
  const total = winterArcTotalDays();
  const day = winterArcDay();
  const remaining = winterArcDaysRemaining();
  const start = winterArcStart();
  const end = winterArcEnd();

  // "Winter Arc progress" = the existing workout log, limited to the event window.
  const arcSessions = workoutHistory.filter((w) => w.completed && isWithinWinterArc(w.timestamp));
  const arcMinutes = arcSessions.reduce((sum, w) => sum + w.durationMinutes, 0);
  const activeDays = new Set(arcSessions.map((w) => new Date(w.timestamp).toDateString()));
  const today = new Date();
  const currentStreak = streakEndingOn(activeDays, today);
  let bestStreak = 0;
  for (const key of activeDays) {
    const runStart = new Date(key);
    const prev = new Date(runStart);
    prev.setDate(prev.getDate() - 1);
    if (activeDays.has(prev.toDateString())) continue; // only measure from the first day of each run
    let length = 0;
    const cursor = new Date(runStart);
    while (activeDays.has(cursor.toDateString())) {
      length += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    bestStreak = Math.max(bestStreak, length);
  }

  const elapsed = phase === "upcoming" ? 0 : phase === "ended" ? total : day;
  const progressPct = Math.round((elapsed / total) * 100);

  function handleJoin() {
    if (!email) return;
    join(email);
    trackWinterArc("winter_arc_joined", email, { source: "page" });
    markWinterArcDailyActive(email);
  }

  function handleFindPartner() {
    trackWinterArc("winter_arc_find_partner_clicked", email, { joined });
    markWinterArcDailyActive(email);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon="❄️" title={WINTER_ARC_COPY.title} subtitle={WINTER_ARC_COPY.hook} />

      <section
        className="rounded-3xl border border-winter/30 bg-surface p-6"
        style={{
          backgroundImage:
            "radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, var(--winter) 16%, transparent), transparent 65%)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-winter/15 px-2.5 py-1 text-xs font-semibold text-winter">
            {WINTER_ARC_COPY.badge}
          </span>
          <span className="text-xs text-muted">
            {shortDate(start)} – {shortDate(end)} {end.getFullYear()}
          </span>
        </div>

        {phase === "active" && (
          <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-4xl font-semibold text-foreground">
                Day {day} <span className="text-lg font-medium text-muted">of {total}</span>
              </div>
              <div className="mt-1 text-sm text-muted">
                {remaining === 0 ? "Last day of the arc." : `${remaining} day${remaining === 1 ? "" : "s"} remaining`}
              </div>
            </div>
          </div>
        )}
        {phase === "upcoming" && (
          <div className="mt-4 text-lg font-semibold text-foreground">Starts on {shortDate(start)}.</div>
        )}
        {phase === "ended" && (
          <div className="mt-4 text-lg font-semibold text-foreground">Winter Arc has ended. Here&apos;s your arc.</div>
        )}

        <div
          className="mt-4 h-2.5 w-full rounded-full bg-surface-2"
          role="progressbar"
          aria-label="Winter Arc days elapsed"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={elapsed}
        >
          <div className="h-2.5 rounded-full bg-winter transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>

        <p className="mt-4 text-sm text-muted">{WINTER_ARC_COPY.description}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {!joined && phase === "active" && (
            <button
              onClick={handleJoin}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90"
            >
              {WINTER_ARC_COPY.joinCta}
            </button>
          )}
          {joined && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-2 text-xs font-semibold text-success">
              ✓ You&apos;re in the Winter Arc
            </span>
          )}
          <Link
            href={WINTER_ARC_PARTNER_FINDER_PATH}
            onClick={handleFindPartner}
            className={clsx(
              "rounded-full px-5 py-2.5 text-sm font-semibold",
              joined || phase !== "active"
                ? "bg-accent text-black hover:opacity-90"
                : "border border-border text-foreground hover:bg-surface-2"
            )}
          >
            🤝 {WINTER_ARC_COPY.findPartnerCta}
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Winter Arc Progress</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Workouts" value={arcSessions.length} />
          <Stat label="Minutes moved" value={arcMinutes} />
          <Stat label="Active days" value={`${activeDays.size}/${elapsed || total}`} />
          <Stat label="Current streak" value={`${currentStreak}d`} hint={bestStreak > 0 ? `Best ${bestStreak}d` : undefined} />
        </div>

        <ArcCalendar activeDays={activeDays} total={total} start={start} today={today} />

        <div className="mt-4 text-sm text-muted">
          {arcMilestones === null
            ? null
            : arcMilestones.length === 0
              ? "No Connect milestones yet this arc. Log an activity with a partner to unlock one."
              : (
                <span>
                  Milestones this arc:{" "}
                  {arcMilestones.map((m) => (
                    <span key={m.milestoneId} className="mr-2 whitespace-nowrap text-foreground">
                      {m.icon} {m.title}
                    </span>
                  ))}
                </span>
              )}
        </div>

        {arcSessions.length === 0 && (
          <p className="mt-3 text-sm text-muted">
            Your arc fills in as you train.{" "}
            <Link href="/move/workout" className="font-medium text-accent-foreground hover:underline">
              Start a workout →
            </Link>
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Rules &amp; Goals</h3>
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-foreground">
          {WINTER_ARC_COPY.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3 text-center">
      <div className="text-xl font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted">{label}</div>
      {hint && <div className="mt-0.5 text-[10px] text-muted">{hint}</div>}
    </div>
  );
}

/** One square per event day: filled = worked out, ringed = today, faded = still to come. */
function ArcCalendar({
  activeDays,
  total,
  start,
  today,
}: {
  activeDays: Set<string>;
  total: number;
  start: Date;
  today: Date;
}) {
  const todayKey = today.toDateString();
  const cells = Array.from({ length: total }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  // Week columns, Monday at the top; blank cells align the first day to its weekday.
  const leadingBlanks = (start.getDay() + 6) % 7;
  return (
    <div className="mt-5 overflow-x-auto">
      <div
        className="grid w-max grid-flow-col grid-rows-7 gap-1"
        aria-label={`${activeDays.size} active days in the arc`}
      >
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} className="h-3.5 w-3.5" aria-hidden="true" />
        ))}
        {cells.map((d) => {
          const key = d.toDateString();
          const future = d > today && key !== todayKey;
          return (
            <span
              key={key}
              title={`${shortDate(d)}${activeDays.has(key) ? " · active" : ""}`}
              className={clsx(
                "h-3.5 w-3.5 rounded-[4px]",
                activeDays.has(key) ? "bg-winter" : "bg-surface-2",
                future && "opacity-40",
                key === todayKey && "ring-2 ring-accent ring-offset-1 ring-offset-surface"
              )}
            />
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-winter" /> Active
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-surface-2" /> Rest
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-[3px] ring-2 ring-accent" /> Today
        </span>
      </div>
    </div>
  );
}
