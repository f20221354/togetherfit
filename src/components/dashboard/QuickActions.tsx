"use client";

import { useRouter } from "next/navigation";
import { useWellnessStore } from "@/lib/store/wellnessStore";

const ACTIONS = [
  { label: "Start 90s Reset", type: null, href: "/urgesurfer" },
  { label: "Start Sunlight Walk", type: null, href: "/move/walk" },
  { label: "Check Posture", type: null, href: "/posture" },
  { label: "Log Hydration", type: "hydration_logged" as const, href: "/sanctuary" },
  { label: "View Circadian Plan", type: null, href: "/sanctuary/circadian" },
];

export function QuickActions() {
  const logEvent = useWellnessStore((s) => s.logEvent);
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => (
        <button
          key={action.label}
          onClick={() => {
            if (action.type) logEvent(action.type);
            router.push(action.href);
          }}
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent-foreground"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
