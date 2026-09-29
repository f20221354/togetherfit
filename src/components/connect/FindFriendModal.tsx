"use client";

import { useEffect, useRef, useState } from "react";
import { useConnectStore } from "@/lib/store/connectStore";
import { MOCK_PARTNERS } from "@/lib/connect/mockPartners";
import { PartnerProfile } from "@/lib/connect/types";

const SEARCH_TIMEOUT_MS = 30_000;
const MIN_MATCH_DELAY_MS = 2_000;
const MAX_MATCH_DELAY_MS = 6_000;

type Status = "searching" | "matched" | "timeout";

/**
 * Simulated live matchmaking queue. There is no real backend or realtime
 * layer in this app (see connectStore.ts), so "another online user" is a
 * random eligible demo partner and the "wait" is a randomized timer. Swap
 * the scheduling in here for a real queue/matchmaking service later; the
 * UI states (searching/matched/timeout) and the Add Friend action underneath
 * don't need to change shape.
 */
export function FindFriendModal({ onClose }: { onClose: () => void }) {
  const friends = useConnectStore((s) => s.friends);
  const connections = useConnectStore((s) => s.connections);
  const blockedIds = useConnectStore((s) => s.blockedIds);
  const friendRequests = useConnectStore((s) => s.friendRequests);
  const sendFriendRequest = useConnectStore((s) => s.sendFriendRequest);

  const [status, setStatus] = useState<Status>("searching");
  const [matched, setMatched] = useState<PartnerProfile | null>(null);
  const [requested, setRequested] = useState(false);
  const skippedIds = useRef<string[]>([]);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimer() {
    if (timeoutId.current) clearTimeout(timeoutId.current);
    timeoutId.current = null;
  }

  function eligiblePartners(): PartnerProfile[] {
    return MOCK_PARTNERS.filter(
      (p) =>
        !friends.includes(p.id) &&
        !connections.includes(p.id) &&
        !blockedIds.includes(p.id) &&
        !skippedIds.current.includes(p.id)
    );
  }

  // Schedules the match/timeout timer only; doesn't touch state synchronously
  // so it's safe to call from an effect. Only the eventual timer callback
  // (or a button's event handler) sets state.
  function scheduleSearch() {
    clearTimer();
    const pool = eligiblePartners();
    if (pool.length === 0) {
      timeoutId.current = setTimeout(() => setStatus("timeout"), SEARCH_TIMEOUT_MS);
      return;
    }

    const matchDelay = Math.min(
      MIN_MATCH_DELAY_MS + Math.random() * (MAX_MATCH_DELAY_MS - MIN_MATCH_DELAY_MS),
      SEARCH_TIMEOUT_MS
    );
    timeoutId.current = setTimeout(() => {
      const found = pool[Math.floor(Math.random() * pool.length)];
      setMatched(found);
      setStatus("matched");
    }, matchDelay);
  }

  function startSearch() {
    setStatus("searching");
    setMatched(null);
    setRequested(false);
    scheduleSearch();
  }

  // Start searching on open, and always clear the pending timer on unmount
  // (covers Cancel, closing the modal, and navigating away mid-search).
  useEffect(() => {
    scheduleSearch();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const alreadyRequestedMatch =
    matched != null && friendRequests.some((r) => r.partnerId === matched.id && r.status !== "declined");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6 text-center">
        {status === "searching" && (
          <div className="flex flex-col items-center gap-4">
            <span className="animate-pulse text-4xl">🔎</span>
            <div className="text-sm font-medium text-foreground">Searching for a wellness partner…</div>
            <div className="text-xs text-muted">Matching you with someone else looking to connect right now.</div>
            <button
              onClick={() => {
                clearTimer();
                onClose();
              }}
              className="mt-2 rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
            >
              Cancel
            </button>
          </div>
        )}

        {status === "matched" && matched && (
          <div className="flex flex-col items-center gap-3">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-3xl">
              {matched.avatar}
            </span>
            <div className="text-lg font-semibold text-foreground">{matched.name}</div>
            <div className="text-xs text-muted">{matched.approxDistanceAway}</div>
            <div className="mt-2 flex w-full gap-2">
              <button
                onClick={() => {
                  setRequested(sendFriendRequest(matched.id) !== null || alreadyRequestedMatch);
                }}
                disabled={requested || alreadyRequestedMatch}
                className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
              >
                {requested || alreadyRequestedMatch ? "Request Sent ✓" : "Add Friend"}
              </button>
              <button
                onClick={() => {
                  skippedIds.current.push(matched.id);
                  startSearch();
                }}
                className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                Skip / Next
              </button>
            </div>
            <button onClick={onClose} className="mt-1 text-xs text-muted hover:text-foreground">
              Done
            </button>
          </div>
        )}

        {status === "timeout" && (
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl">🙁</span>
            <div className="text-sm font-medium text-foreground">No one found. Try again?</div>
            <div className="flex w-full gap-2">
              <button
                onClick={startSearch}
                className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
              >
                Search Again
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
