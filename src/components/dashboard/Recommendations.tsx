"use client";

import { useRouter } from "next/navigation";
import { useWellnessStore, MODULE_ROUTES } from "@/lib/store/wellnessStore";
import { getRecommendations } from "@/lib/recommendations";

export function Recommendations() {
  const scores = useWellnessStore((s) => s.scores);
  const minutesSincePostureCorrection = useWellnessStore((s) => s.minutesSincePostureCorrection);
  const eveningLightHigh = useWellnessStore((s) => s.eveningLightHigh);
  const prolongedGaze = useWellnessStore((s) => s.prolongedGaze);
  const router = useRouter();

  const cards = getRecommendations({
    scores,
    minutesSincePostureCorrection,
    eveningLightHigh,
    prolongedGaze,
  });

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50">
        Everything looks balanced right now. VitaOS will recommend a module here when a score needs attention.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div key={card.id} className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-amber-300/80">
            {card.metric}
          </div>
          <div className="text-sm text-white/90">{card.reason}</div>
          <div className="text-xs text-white/50">{card.action}</div>
          <button
            onClick={() => router.push(MODULE_ROUTES[card.destination])}
            className="mt-2 self-start rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-400/25"
          >
            {card.ctaLabel}
          </button>
        </div>
      ))}
    </div>
  );
}
