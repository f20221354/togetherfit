"use client";

import { useState } from "react";
import { ACTIVITY_META, PartnerProfile, SearchCriteria } from "@/lib/connect/types";

export function ConnectRequestModal({
  partner,
  criteria,
  onSend,
  onCancel,
}: {
  partner: PartnerProfile;
  criteria: SearchCriteria;
  onSend: (message?: string) => void;
  onCancel: () => void;
}) {
  const [message, setMessage] = useState(
    `Hey! I'm planning ${criteria.activity === "running" ? "a run" : `a ${ACTIVITY_META[criteria.activity].label.toLowerCase()} session`} — want to join?`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5">
        <h3 className="text-base font-semibold text-foreground">Connect with {partner.name}?</h3>

        <div className="mt-4 flex flex-col gap-2 text-sm">
          <Row label="Activity" value={`${ACTIVITY_META[criteria.activity].icon} ${ACTIVITY_META[criteria.activity].label}`} />
          <Row label="Preferred time" value={capitalize(criteria.time)} />
          {criteria.distanceKm && <Row label="Distance" value={`${criteria.distanceKm[1]} km`} />}
          <Row label="Group" value={criteria.groupPreference === "group" ? `${criteria.groupSize} people` : "1:1 partner"} />
        </div>

        <label className="mt-4 flex flex-col gap-1.5 text-xs text-muted">
          Optional message
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="rounded-xl border border-border bg-surface-2 p-2.5 text-sm text-foreground outline-none focus:border-accent"
          />
        </label>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
          >
            Cancel
          </button>
          <button
            onClick={() => onSend(message)}
            className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
