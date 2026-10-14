"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWellnessStore } from "@/lib/store/wellnessStore";
import { dayKey, weekAverage } from "@/lib/wellness/dailyScore";

export function WellnessTrendChart() {
  const history = useWellnessStore((s) => s.history);
  const today = useWellnessStore((s) => s.day);

  // The last 14 days, oldest first; days with no activity show as gaps, not zeros.
  const data = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - (13 - i));
    const key = dayKey(d);
    return { day: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), score: history[key] ?? null };
  });
  const { average, activeDays } = weekAverage(history, today);
  const empty = data.every((d) => d.score === null);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Last 14 days</h3>
        <span className="text-xs text-muted">
          {average === null ? "No active days this week yet" : `7-day average ${average} · ${activeDays} active day${activeDays === 1 ? "" : "s"}`}
        </span>
      </div>
      {empty ? (
        <p className="py-10 text-center text-sm text-muted">Your daily scores will appear here as you use togetherfit.</p>
      ) : (
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
            <XAxis dataKey="day" stroke="var(--muted)" fontSize={11} tickLine={false} />
            <YAxis domain={[0, 100]} stroke="var(--muted)" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontSize: 12,
                color: "var(--foreground)",
              }}
            />
            <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}
