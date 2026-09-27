"use client";

import { useRouter } from "next/navigation";
import { useWellnessStore } from "@/lib/store/wellnessStore";

const ACTIONS = [
  { label: "Start 90s Reset", type: "urge_reset_completed" as const, href: "/urgesurfer" },
  { label: "Start Sunlight Walk", type: "walk_completed" as const, href: "/micro-stroll" },
  { label: "Check Posture", type: "posture_corrected" as const, href: "/posture" },
  { label: "Log Hydration", type: "hydration_logged" as const, href: "/sanctuary" },
  { label: "View Circadian Plan", type: null, href: "/circadian" },
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
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-emerald-300"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
