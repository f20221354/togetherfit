"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { SafetyReminder } from "@/components/connect/SafetyReminder";
import { useConnectStore } from "@/lib/store/connectStore";
import { ACTIVITY_META } from "@/lib/connect/types";

export default function ActivityPlanPage() {
  const params = useParams<{ planId: string }>();
  const router = useRouter();
  const plans = useConnectStore((s) => s.plans);
  const confirmAttendance = useConnectStore((s) => s.confirmAttendance);
  const cancelPlan = useConnectStore((s) => s.cancelPlan);
  const leaveGroup = useConnectStore((s) => s.leaveGroup);
  const [routeNote, setRouteNote] = useState(false);

  const plan = plans.find((p) => p.id === params.planId);

  if (!plan) {
    return <div className="mx-auto max-w-lg text-sm text-muted">This activity plan isn&apos;t available.</div>;
  }

  const meta = ACTIVITY_META[plan.activity];
  const isGroup = plan.groupSize > 2;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        icon={meta.icon}
        title={`${meta.label}${isGroup ? " Group" : ""}`}
        subtitle={plan.scheduledLabel}
      />

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Details</span>
          <Badge tone={plan.status === "upcoming" ? "positive" : plan.status === "completed" ? "neutral" : "warning"}>
            {plan.status}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {plan.distanceKm && (
            <div>
              <div className="text-xs text-muted">Distance</div>
              <div className="text-foreground">{plan.distanceKm} km</div>
            </div>
          )}
          {plan.pace && (
            <div>
              <div className="text-xs text-muted">Pace</div>
              <div className="text-foreground">{plan.pace}</div>
            </div>
          )}
          <div>
            <div className="text-xs text-muted">Group</div>
            <div className="text-foreground">{plan.participants.length} / {plan.groupSize} participants</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="mb-3 text-sm font-semibold text-foreground">Participants</div>
        <div className="flex flex-col gap-2">
          {plan.participants.map((participant) => (
            <div key={participant.partnerId} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{participant.name}</span>
              <span className={participant.confirmed ? "text-success" : "text-muted"}>
                {participant.confirmed ? "✓ Confirmed" : "○ Pending"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <SafetyReminder />

      {routeNote && (
        <div className="rounded-xl bg-surface-2 p-3 text-xs text-muted">
          Exact routes/meeting points are shared in chat once everyone has confirmed.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => router.push(`/connect/chat/${plan.conversationId}`)}
          className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          Open Chat
        </button>
        <button
          onClick={() => setRouteNote(true)}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
        >
          View Route
        </button>
        {plan.status === "upcoming" && (
          <button
            onClick={() => confirmAttendance(plan.id)}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
          >
            Confirm Attendance
          </button>
        )}
        {isGroup ? (
          <button
            onClick={() => {
              leaveGroup(plan.id);
              router.push("/connect");
            }}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
          >
            Leave Group
          </button>
        ) : (
          plan.status === "upcoming" && (
            <button
              onClick={() => cancelPlan(plan.id)}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
            >
              Cancel
            </button>
          )
        )}
      </div>
    </div>
  );
}
