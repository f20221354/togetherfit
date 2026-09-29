"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { FindFriendModal } from "@/components/connect/FindFriendModal";
import { useConnectStore } from "@/lib/store/connectStore";
import { MOCK_PARTNERS } from "@/lib/connect/mockPartners";
import { computeCompatibility } from "@/lib/connect/compatibility";
import { ACTIVITY_META, ActivityType } from "@/lib/connect/types";

const QUICK_ACTIVITIES: ActivityType[] = ["walking", "running", "gym", "cycling", "yoga", "hiking"];

export default function ConnectDashboardPage() {
  const criteria = useConnectStore((s) => s.criteria);
  const plans = useConnectStore((s) => s.plans);
  const connections = useConnectStore((s) => s.connections);
  const blockedIds = useConnectStore((s) => s.blockedIds);
  const [findFriendOpen, setFindFriendOpen] = useState(false);

  const upcomingPlans = plans.filter((p) => p.status === "upcoming");
  const groupPlans = upcomingPlans.filter((p) => p.groupSize > 2);

  const suggested = MOCK_PARTNERS.filter((p) => !blockedIds.includes(p.id))
    .map((partner) => ({ partner, ...computeCompatibility(criteria, partner) }))
    .filter((r) => r.score >= 40)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <PageHeader icon="🤝" title="Activity" subtitle="Find an activity, and people who fit your wellness routine." />
        <div className="mt-1 flex shrink-0 items-center gap-3">
          <button
            onClick={() => setFindFriendOpen(true)}
            className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black hover:opacity-90"
          >
            🔎 Find a Friend
          </button>
          <Link href="/connect/my-profile" className="text-xs font-medium text-accent-foreground hover:underline">
            My Profile →
          </Link>
        </div>
      </div>

      {findFriendOpen && <FindFriendModal onClose={() => setFindFriendOpen(false)} />}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">What do you want to do?</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {QUICK_ACTIVITIES.map((activity) => (
            <Link
              key={activity}
              href={activity === "walking" ? "/move/walk" : `/connect/discover?activity=${activity}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-surface-2"
            >
              <span className="text-2xl">{ACTIVITY_META[activity].icon}</span>
              {ACTIVITY_META[activity].label}
            </Link>
          ))}
        </div>
      </section>

      {upcomingPlans.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Active Plans</h2>
          <div className="flex flex-col gap-3">
            {upcomingPlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/connect/plan/${plan.id}`}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2"
              >
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {ACTIVITY_META[plan.activity].icon} {ACTIVITY_META[plan.activity].label}
                  </div>
                  <div className="text-xs text-muted">{plan.scheduledLabel}</div>
                </div>
                <Badge tone="positive">
                  {plan.participants.filter((p) => p.confirmed).length} / {plan.groupSize} confirmed
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Suggested Partners</h2>
          <Link href="/connect/discover" className="text-xs font-medium text-accent-foreground hover:underline">
            Find more →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {suggested.map(({ partner, score }) => (
            <Link
              key={partner.id}
              href={`/connect/profile/${partner.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-2 text-xl">
                {partner.avatar}
              </span>
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{partner.name}</div>
                <div className="text-xs text-muted">{partner.approxDistanceAway}</div>
              </div>
              <span className="text-xs font-semibold text-accent-foreground">{score}%</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Your Connections</h2>
        {connections.length === 0 ? (
          <p className="text-sm text-muted">No connections yet — find a partner to get started.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {connections.map((id) => {
              const partner = MOCK_PARTNERS.find((p) => p.id === id);
              if (!partner) return null;
              return (
                <Link
                  key={id}
                  href={`/connect/profile/${id}`}
                  className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-surface-2"
                >
                  <span>{partner.avatar}</span>
                  {partner.name}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {groupPlans.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Group Activities</h2>
          <div className="flex flex-col gap-3">
            {groupPlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/connect/plan/${plan.id}`}
                className="rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2"
              >
                <div className="text-sm font-medium text-foreground">
                  {ACTIVITY_META[plan.activity].icon} {ACTIVITY_META[plan.activity].label} Group
                </div>
                <div className="text-xs text-muted">
                  {plan.scheduledLabel} · {plan.participants.length} / {plan.groupSize} participants
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
