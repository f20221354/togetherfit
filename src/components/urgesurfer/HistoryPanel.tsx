"use client";

import { useBreathingStore } from "@/lib/store/breathingStore";
import { formatPattern } from "@/lib/breathing/types";

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function HistoryPanel() {
  const history = useBreathingStore((s) => s.history);
  const todayEntries = history.filter((h) => isToday(h.timestamp));

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted">Today</div>
      {todayEntries.length === 0 ? (
        <p className="text-xs text-muted">No sessions yet today.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {todayEntries.map((entry) => (
            <div key={entry.id} className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{formatPattern(entry.pattern)}</span>
                <span className={entry.completed ? "text-success" : "text-muted"}>
                  {entry.completed ? "✓ Completed" : "Ended early"}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                <span>{entry.sessionDuration}s</span>
                <span>·</span>
                <span>{entry.cyclesCompleted} cycles</span>
                {entry.urgeBefore != null && entry.urgeAfter != null && (
                  <>
                    <span>·</span>
                    <span>
                      Urge {entry.urgeBefore} → {entry.urgeAfter}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
