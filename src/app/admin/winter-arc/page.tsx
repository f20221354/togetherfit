"use client";

import { useState } from "react";
import type { WinterArcStats } from "@/lib/network/winterArcDb";
import { useIsClient } from "@/lib/useIsClient";

const KEY_STORAGE = "vitaos-winter-arc-admin-key";

function readSavedKey(): string {
  try {
    return sessionStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

/**
 * Internal Winter Arc metrics. Not linked anywhere in the app; the data comes
 * from /api/winter-arc/stats, which requires WINTER_ARC_ADMIN_KEY.
 */
export default function WinterArcAdminPage() {
  const isClient = useIsClient();
  // The saved key comes from sessionStorage, so render in the browser only.
  return isClient ? <AdminView /> : null;
}

function AdminView() {
  const [key, setKey] = useState(readSavedKey);
  const [stats, setStats] = useState<WinterArcStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!key.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/winter-arc/stats", { headers: { "x-admin-key": key.trim() } });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Couldn't load stats.");
        setStats(null);
        return;
      }
      setStats(data.stats);
      try {
        sessionStorage.setItem(KEY_STORAGE, key.trim());
      } catch {
        // Convenience only.
      }
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 text-2xl font-semibold">❄️ Winter Arc analytics</div>
        <p className="mt-1 text-sm text-muted">
          Internal view.{" "}
          {stats && `${stats.window.start} → ${stats.window.end}, days in ${stats.window.timeZone}.`}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="flex flex-wrap gap-2"
      >
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Admin key"
          aria-label="Admin key"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!key.trim() || loading}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Loading…" : stats ? "Refresh" : "Load"}
        </button>
      </form>
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
