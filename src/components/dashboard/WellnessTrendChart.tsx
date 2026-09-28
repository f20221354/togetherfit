"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useWellnessStore } from "@/lib/store/wellnessStore";

export function WellnessTrendChart() {
  const history = useWellnessStore((s) => s.scoreHistory);

  const data = history.map((h) => ({
    time: new Date(h.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    score: h.score,
  }));

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Wellness Impact / Trend</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
            <XAxis dataKey="time" stroke="var(--muted)" fontSize={11} tickLine={false} />
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
            <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
