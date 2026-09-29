import clsx from "clsx";
import { CelebrationCard } from "@/lib/connect/milestones";
import { sportMeta } from "@/lib/connect/sports";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

/** The celebration card itself — the overlay shows it large, chat shows it compact. */
export function CelebrationCardView({ card, compact = false }: { card: CelebrationCard; compact?: boolean }) {
  const sport = card.sport ? sportMeta(card.sport) : null;
  return (
    <div
      className={clsx(
        "flex flex-col items-center gap-1 rounded-2xl border border-accent/40 bg-gradient-to-br from-emerald-900/80 to-black text-center text-white",
        compact ? "w-56 p-4" : "w-full max-w-xs p-6"
      )}
    >
      <div className={compact ? "text-4xl" : "text-7xl"}>{card.icon}</div>
      <div className={clsx("font-bold", compact ? "text-base" : "text-2xl")}>{card.title}</div>
      <div className="text-xs text-slate-300">{card.description}</div>
      {sport && (
        <div className="mt-1 text-sm font-semibold text-emerald-300">
          {sport.icon} {sport.label}
        </div>
      )}
      <div className="mt-2 text-xs text-slate-400">
        {card.userName} · {formatDate(card.achievedAt)}
      </div>
      {!compact && <div className="mt-2 text-xs font-semibold text-emerald-400">स्वस्थ Bharat</div>}
    </div>
  );
}
