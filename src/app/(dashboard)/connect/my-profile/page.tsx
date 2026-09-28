"use client";

import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { useConnectStore } from "@/lib/store/connectStore";
import { useCurrentUser } from "@/lib/auth/authStore";
import { ACTIVITY_META, ActivityType } from "@/lib/connect/types";
import clsx from "clsx";

const ALL_ACTIVITIES: ActivityType[] = ["running", "walking", "gym", "cycling", "yoga", "sports", "hiking", "sunlightWalk"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MyProfilePage() {
  const user = useCurrentUser();
  const profile = useConnectStore((s) => s.profile);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader icon="🎯" title="Wellness Profile" subtitle="What स्वस्थ Bharat Connect shows other members." />

      <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-8 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-2 text-4xl">🙂</span>
        <div className="text-lg font-semibold text-foreground">{user?.name ?? "You"}</div>
        <div className="flex flex-wrap justify-center gap-2">
          {profile.activities.map((a) => (
            <Badge key={a}>
              {ACTIVITY_META[a].icon} {ACTIVITY_META[a].label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Preferred</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted">Time</div>
            <div className="text-foreground capitalize">{profile.preferredTime}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Experience</div>
            <div className="text-foreground capitalize">{profile.experienceLevel}</div>
          </div>
          {profile.distanceKm && (
            <div>
              <div className="text-xs text-muted">Distance</div>
              <div className="text-foreground">{profile.distanceKm[0]}–{profile.distanceKm[1]} km</div>
            </div>
          )}
          {profile.paceMinPerKm && (
            <div>
              <div className="text-xs text-muted">Pace</div>
              <div className="text-foreground">{profile.paceMinPerKm[0]}–{profile.paceMinPerKm[1]} min/km</div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Availability</h3>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((day) => (
            <span
              key={day}
              className={clsx(
                "rounded-full px-2.5 py-1 text-xs",
                profile.availability.includes(day) ? "bg-accent/15 text-accent-foreground" : "bg-surface-2 text-muted"
              )}
            >
              {day}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Wellness Interests</h3>
        <div className="flex flex-wrap gap-2">
          {ALL_ACTIVITIES.map((a) => (
            <span
              key={a}
              className={clsx(
                "rounded-full px-2.5 py-1 text-xs",
                profile.activities.includes(a) ? "bg-accent/15 text-accent-foreground" : "bg-surface-2 text-muted"
              )}
            >
              {ACTIVITY_META[a].icon} {ACTIVITY_META[a].label}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Activity History</h3>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div>
            <div className="text-xl font-semibold text-foreground">{profile.runsCompleted}</div>
            <div className="text-xs text-muted">runs</div>
          </div>
          <div>
            <div className="text-xl font-semibold text-foreground">{profile.walksCompleted}</div>
            <div className="text-xs text-muted">walks</div>
          </div>
          <div>
            <div className="text-xl font-semibold text-foreground">{profile.gymSessionsCompleted}</div>
            <div className="text-xs text-muted">gym sessions</div>
          </div>
        </div>
      </div>
    </div>
  );
}
