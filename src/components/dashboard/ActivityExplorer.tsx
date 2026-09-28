"use client";

import { useWellnessStore, MODULE_LABELS } from "@/lib/store/wellnessStore";
import { Badge } from "@/components/ui/Badge";

export function ActivityExplorer() {
  const events = useWellnessStore((s) => s.events);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Activity Explorer</h3>
        <span className="text-xs text-muted">{events.length} events logged</span>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted">
          No activity yet. Complete a module action or turn on Demo Mode to see events flow in here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {events.slice(0, 12).map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="flex flex-col">
                <span className="text-foreground">{event.label}</span>
                <span className="text-xs text-muted">
                  {MODULE_LABELS[event.module]} · {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <Badge tone={event.severity === "warning" ? "warning" : event.severity === "positive" ? "positive" : "neutral"}>
                {event.severity}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
