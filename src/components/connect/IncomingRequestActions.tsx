"use client";

import { useState } from "react";
import { sportMeta } from "@/lib/connect/sports";
import { formatWhen, timeSlotLabel } from "@/lib/connect/timeSlot";

export interface IncomingRequestView {
  id: string;
  from: { email: string; name: string; code: string };
  source?: "search" | "find_a_friend";
  activity?: { sport: string; mode: "now" | "scheduled"; startTime: string; areaLabel: string | null } | null;
  proposedTime?: string | null;
  hasMatchingSchedule?: boolean;
}

type Outcome = "accepted" | "declined" | "suggested";

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * The responder experience for one incoming request. Used by both the global
 * pop-up and the Friends tab so they always offer the same choices:
 * - a Find a Friend request when you have nothing planned for that sport →
 *   "Join at their time", "Suggest another time", "Decline"
 * - otherwise (matching plan, a counter-offer, or a plain add-by-code) → Accept / Decline
 */
export function IncomingRequestActions({
  request,
  email,
  onDone,
}: {
  request: IncomingRequestView;
  email: string;
  onDone: (outcome: Outcome) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [time, setTime] = useState(() => toLocalInput(new Date(Date.now() + 2 * 3600_000)));
  const [error, setError] = useState<string | null>(null);

  const activity = request.activity ?? null;
  const meta = activity ? sportMeta(activity.sport) : null;
  const offerAlternatives = request.source === "find_a_friend" && !request.proposedTime && !request.hasMatchingSchedule;

  async function respond(status: string, proposedTime?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, respondingEmail: email, status, proposedTime }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "That didn't work — try again.");
        return;
      }
      onDone(status === "declined" ? "declined" : status === "suggest" ? "suggested" : "accepted");
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const primary = "flex-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-60";
  const secondary = "flex-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2 disabled:opacity-60";

  return (
    <div className="flex flex-col gap-2">
      {activity && meta && (
        <div className="text-xs text-muted">
          {request.proposedTime ? (
            <>
              {meta.icon} Suggested a new time for {meta.label}: <b className="text-foreground">{formatWhen(request.proposedTime)}</b>
            </>
          ) : (
            <>
              {meta.icon} Wants to do {meta.label} · <b className="text-foreground">{timeSlotLabel(activity.mode, activity.startTime)}</b>
              {activity.areaLabel ? ` · ${activity.areaLabel}` : ""}
            </>
          )}
        </div>
      )}

      {suggesting ? (
        <div className="flex flex-col gap-2">
          <input
            type="datetime-local"
            value={time}
            min={toLocalInput(new Date())}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-xl border border-border bg-surface-2 px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent"
          />
          <div className="flex gap-2">
            <button onClick={() => respond("suggest", new Date(time).toISOString())} disabled={busy || !time} className={primary}>
              Send suggestion
            </button>
            <button onClick={() => setSuggesting(false)} disabled={busy} className={secondary}>
              Back
            </button>
          </div>
        </div>
      ) : offerAlternatives ? (
        <div className="flex flex-col gap-2">
          <button onClick={() => respond("join_their_time")} disabled={busy} className={primary}>
            Join at their time
          </button>
          <div className="flex gap-2">
            <button onClick={() => setSuggesting(true)} disabled={busy} className={secondary}>
              Suggest another time
            </button>
            <button onClick={() => respond("declined")} disabled={busy} className={secondary}>
              Decline
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => respond("accepted")} disabled={busy} className={primary}>
            Accept
          </button>
          <button onClick={() => respond("declined")} disabled={busy} className={secondary}>
            Decline
          </button>
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
