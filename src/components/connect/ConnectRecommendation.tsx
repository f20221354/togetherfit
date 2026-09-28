"use client";

import { useRouter } from "next/navigation";
import { useWellnessStore } from "@/lib/store/wellnessStore";

export function ConnectRecommendation() {
  const scores = useWellnessStore((s) => s.scores);
  const sunlightExposureMinutes = useWellnessStore((s) => s.sunlightExposureMinutes);
  const router = useRouter();

  let suggestion: { text: string; activity: string; cta: string } | null = null;

  if (sunlightExposureMinutes < 15) {
    suggestion = {
      text: "Your sunlight exposure is low today.",
      activity: "sunlightWalk",
      cta: "Find someone for a 15-minute sunlight walk?",
    };
  } else if (scores.movement < 65) {
    suggestion = {
      text: "You haven't logged much movement today.",
      activity: "walking",
      cta: "Find a walking partner?",
    };
  } else if (scores.recovery < 65) {
    suggestion = {
      text: "Your gym activity has been light lately.",
      activity: "gym",
      cta: "Find a gym partner for your next session?",
    };
  }

  if (!suggestion) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
      <div>
        <div className="text-sm text-foreground">{suggestion.text}</div>
        <div className="text-xs text-muted">{suggestion.cta}</div>
      </div>
      <button
        onClick={() => router.push(`/move/activity/discover?activity=${suggestion!.activity}`)}
        className="shrink-0 rounded-full bg-accent/15 px-3 py-1.5 text-xs font-medium text-accent-foreground hover:bg-accent/25"
      >
        🤝 Find Partner
      </button>
    </div>
  );
}
