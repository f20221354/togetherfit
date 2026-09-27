"use client";

import { useWellnessStore, MODULE_LABELS } from "@/lib/store/wellnessStore";
import { Badge } from "@/components/ui/Badge";

export function ActivityExplorer() {
  const events = useWellnessStore((s) => s.events);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/80">Activity Explorer</h3>
        <span className="text-xs text-white/40">{events.length} events logged</span>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-white/40">
          No activity yet. Complete a module action or turn on Demo Mode to see events flow in here.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/5">
          {events.slice(0, 12).map((event) => (
            <li key={event.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="flex flex-col">
                <span className="text-white/85">{event.label}</span>
                <span className="text-xs text-white/40">
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
