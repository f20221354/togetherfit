"use client";

import Link from "next/link";
import { PartnerProfile, ACTIVITY_META, ActivityType } from "@/lib/connect/types";

export function PartnerCard({
  partner,
  activity,
  compatibility,
  reasons,
  onConnect,
  onSkip,
}: {
  partner: PartnerProfile;
  activity: ActivityType;
  compatibility: number;
  reasons: string[];
  onConnect: () => void;
  onSkip?: () => void;
}) {
  const meta = ACTIVITY_META[activity];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-2xl">
          {partner.avatar}
        </span>
        <div>
          <div className="text-sm font-semibold text-foreground">
            {partner.name}, {partner.age}
          </div>
          <div className="text-xs text-muted">
            {meta.icon} {meta.label}
            {partner.distanceKm && ` · ${partner.distanceKm[0]}–${partner.distanceKm[1]} km`}
          </div>
          {partner.paceMinPerKm && (
            <div className="text-xs text-muted">{partner.paceMinPerKm[0]}–{partner.paceMinPerKm[1]} min/km</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted">
        <span>
          {partner.preferredTime === "morning" ? "🌅" : partner.preferredTime === "evening" ? "🌆" : "🕐"}{" "}
          {capitalize(partner.preferredTime)}
        </span>
        <span>📍 {partner.approxDistanceAway}</span>
      </div>

      <div className="rounded-xl bg-surface-2 p-3">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">Wellness Compatibility</span>
          <span className="font-semibold text-accent-foreground">{compatibility}%</span>
        </div>
        <ul className="flex flex-col gap-0.5 text-xs text-muted">
          {reasons.map((reason) => (
            <li key={reason}>✓ {reason}</li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href={`/connect/profile/${partner.id}`}
          className="flex-1 rounded-full border border-border px-4 py-2 text-center text-sm font-medium text-foreground hover:bg-surface-2"
        >
          View Profile
        </Link>
        <button
          onClick={onConnect}
          className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          Connect
        </button>
      </div>
      {onSkip && (
        <button onClick={onSkip} className="text-xs text-muted hover:text-foreground">
          × Skip
        </button>
      )}
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
