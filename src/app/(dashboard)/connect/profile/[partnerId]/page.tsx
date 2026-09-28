"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { ConnectRequestModal } from "@/components/connect/ConnectRequestModal";
import { SafetyReminder } from "@/components/connect/SafetyReminder";
import { useConnectStore } from "@/lib/store/connectStore";
import { MOCK_PARTNERS } from "@/lib/connect/mockPartners";
import { computeCompatibility } from "@/lib/connect/compatibility";
import { ACTIVITY_META } from "@/lib/connect/types";

export default function PartnerProfilePage() {
  const params = useParams<{ partnerId: string }>();
  const router = useRouter();
  const partner = MOCK_PARTNERS.find((p) => p.id === params.partnerId);

  const criteria = useConnectStore((s) => s.criteria);
  const connections = useConnectStore((s) => s.connections);
  const conversations = useConnectStore((s) => s.conversations);
  const sendRequest = useConnectStore((s) => s.sendRequest);
  const blockUser = useConnectStore((s) => s.blockUser);
  const removeConnection = useConnectStore((s) => s.removeConnection);

  const [showRequest, setShowRequest] = useState(false);
  const [showConfirmBlock, setShowConfirmBlock] = useState(false);

  if (!partner) {
    return <div className="mx-auto max-w-lg text-sm text-muted">This profile isn&apos;t available.</div>;
  }

  const isConnected = connections.includes(partner.id);
  const conversation = conversations.find((c) => c.participantIds.includes(partner.id));
  const { score, reasons } = computeCompatibility(criteria, partner);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader icon="👤" title="Wellness Profile" subtitle="Demo profile — स्वस्थ Bharat Connect prototype." />

      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-8 text-center">
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-surface-2 text-5xl">
          {partner.avatar}
        </span>
        <div className="text-xl font-semibold text-foreground">
          {partner.name}, {partner.age}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {partner.activities.map((a) => (
            <Badge key={a}>
              {ACTIVITY_META[a].icon} {ACTIVITY_META[a].label}
            </Badge>
          ))}
        </div>
        <div className="text-xs text-muted">📍 {partner.approxDistanceAway}</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Preferred</div>
          <div className="mt-1 text-sm text-foreground capitalize">{partner.preferredTime} runner/session</div>
          {partner.distanceKm && (
            <div className="mt-1 text-sm text-foreground">{partner.distanceKm[0]}–{partner.distanceKm[1]} km</div>
          )}
          {partner.paceMinPerKm && (
            <div className="mt-1 text-sm text-foreground">{partner.paceMinPerKm[0]}–{partner.paceMinPerKm[1]} min/km pace</div>
          )}
          {partner.workoutType && <div className="mt-1 text-sm text-foreground">{partner.workoutType} training</div>}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted">Availability</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {partner.availability.map((day) => (
              <span key={day} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-foreground">
                {day}
              </span>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted capitalize">{partner.experienceLevel}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Wellness Compatibility</span>
          <span className="font-semibold text-accent-foreground">{score}%</span>
        </div>
        <ul className="flex flex-col gap-0.5 text-xs text-muted">
          {reasons.map((r) => (
            <li key={r}>✓ {r}</li>
          ))}
        </ul>
      </div>

      <SafetyReminder />

      <div className="flex flex-wrap gap-2">
        {isConnected && conversation ? (
          <button
            onClick={() => router.push(`/connect/chat/${conversation.id}`)}
            className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            Open Chat
          </button>
        ) : (
          <button
            onClick={() => setShowRequest(true)}
            className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            Connect
          </button>
        )}
        {isConnected && (
          <button
            onClick={() => removeConnection(partner.id)}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
          >
            Remove Connection
          </button>
        )}
        <button
          onClick={() => setShowConfirmBlock(true)}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10"
        >
          Block / Report
        </button>
      </div>

      {showRequest && (
        <ConnectRequestModal
          partner={partner}
          criteria={criteria}
          onCancel={() => setShowRequest(false)}
          onSend={(message) => {
            sendRequest(partner.id, message);
            setShowRequest(false);
            router.push("/connect");
          }}
        />
      )}

      {showConfirmBlock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5">
            <h3 className="text-sm font-semibold text-foreground">Block {partner.name}?</h3>
            <p className="mt-2 text-xs text-muted">
              They won&apos;t be able to contact you, and this also reports the profile for review.
              This removes any existing connection.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setShowConfirmBlock(false)}
                className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  blockUser(partner.id);
                  setShowConfirmBlock(false);
                  router.push("/connect");
                }}
                className="flex-1 rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Block & Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
