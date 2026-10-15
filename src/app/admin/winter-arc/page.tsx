"use client";

import { useCallback, useEffect, useState } from "react";
import type { WinterArcStats } from "@/lib/network/winterArcDb";
import { Icon } from "@/components/ui/Icon";

/**
 * Internal Winter Arc metrics, for admins (npm run admin:grant). Signed-out
 * visitors are sent to login by the proxy; signed-in non-admins see a notice.
 */
export default function WinterArcAdminPage() {
  const [stats, setStats] = useState<WinterArcStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const apply = useCallback((res: { status: number; data: { ok: boolean; error?: string; stats?: WinterArcStats } }) => {
    setLoading(false);
    if (res.status === 403) return setError("This page is for togetherfit admins.");
    if (!res.data.ok || !res.data.stats) return setError(res.data.error ?? "Couldn't load stats.");
    setError(null);
    setStats(res.data.stats);
  }, []);

  const fetchStats = useCallback(
    () =>
      fetch("/api/winter-arc/stats", { cache: "no-store" })
        .then(async (r) => ({ status: r.status, data: await r.json() }))
        .then(apply)
        .catch(() => {
          setLoading(false);
          setError("Couldn't reach the server.");
        }),
    [apply]
  );

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><Icon name="season.winter" size={24} /> Winter Arc analytics</h1>
          <p className="mt-1 text-sm text-muted">
            Internal view.{" "}
            {stats && `${stats.window.start} → ${stats.window.end}, days in ${stats.window.timeZone}.`}
          </p>
        </div>
        {stats && (
          <button
            onClick={() => {
              setLoading(true);
              void fetchStats();
            }}
            disabled={loading}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        )}
      </div>
      {loading && !stats && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {stats && <StatsView stats={stats} />}
    </div>
  );
}

function StatsView({ stats }: { stats: WinterArcStats }) {
  const latestWeek = stats.weekly[stats.weekly.length - 1];
  const t = stats.totals;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Total opt-ins" value={stats.optIns} hint={`${t.winter_arc_joined.events} join events`} />
        <Card
          label="Opt-in rate"
          value={`${stats.optInRatePerShowPct}%`}
          hint={`joined ÷ popup shown · ${stats.optInRatePerUserPct}% per user`}
        />
        <Card
          label="Weekly active participants"
          value={latestWeek?.activeParticipants ?? 0}
          hint={latestWeek ? `Week ${latestWeek.week} · ${latestWeek.retentionPct}% of joined` : undefined}
        />
        <Card
          label="Find-partner CTR"
          value={`${stats.findPartnerCtrPct}%`}
          hint={`${t.winter_arc_find_partner_clicked.events} clicks ÷ ${t.winter_arc_page_viewed.events} page views`}
        />
      </div>

      <Section title="Event totals">
        <Table
          head={["Event", "Events", "Distinct users"]}
          rows={Object.entries(t).map(([event, v]) => [event, v.events, v.users])}
        />
      </Section>

      <Section title="Retention by arc week">
        <Table
          head={["Week", "Starts", "Active participants", "Joined so far", "Retention"]}
          rows={stats.weekly.map((w) => [w.week, w.startDay, w.activeParticipants, w.joinedSoFar, `${w.retentionPct}%`])}
        />
      </Section>

      <Section title="Daily">
        <Table
          head={["Day", "Popup shown", "Joined", "Dismissed", "Page views", "Partner clicks", "Active users", "Active participants"]}
          rows={[...stats.daily]
            .reverse()
            .map((d) => [d.day, d.popupShown, d.joined, d.dismissed, d.pageViews, d.partnerClicks, d.activeUsers, d.activeParticipants])}
        />
      </Section>
    </>
  );
}

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      <div className="text-xs font-medium text-muted">{label}</div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">{title}</h3>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-border text-xs text-muted">
          {head.map((h) => (
            <th key={h} className="whitespace-nowrap px-2 py-2 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-border/60 last:border-0">
            {row.map((cell, j) => (
              <td key={j} className="whitespace-nowrap px-2 py-1.5 text-foreground">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
