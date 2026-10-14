"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useCurrentUser } from "@/lib/auth/authStore";
import { useChatSignals, useRealtimeStatus } from "@/lib/realtime/client";

const POLL_MS = 20_000;
/** With realtime live, new messages trigger a refresh, so the timer is only a safety net. */
const LIVE_POLL_MS = 120_000;

interface NetworkSummary {
  /** Unread chat messages across all accepted connections. */
  totalUnread: number;
  friendCount: number;
}

const EMPTY: NetworkSummary = { totalUnread: 0, friendCount: 0 };
const useSummaryStore = create<NetworkSummary>(() => EMPTY);

// One poller shared by every component that shows these numbers (sidebar,
// mobile tab bar, overview), however many are mounted; overlapping refreshes share one request.
let subscribers = 0;
let timer: ReturnType<typeof setInterval> | null = null;

let inflight: Promise<void> | null = null;

function poll(): Promise<void> {
  inflight ??= fetch("/api/friends/list")
    .then((res) => res.json())
    .then((data) => {
      if (data.ok) useSummaryStore.setState({ totalUnread: data.totalUnread ?? 0, friendCount: data.friends?.length ?? 0 });
    })
    .catch(() => {
      // Friend network unreachable — numbers stay at their last known values.
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Re-reads the counts now (e.g. right after a conversation was marked read). */
export function refreshNetworkSummary() {
  void poll();
}

function useNetworkPolling(userId: string | undefined) {
  const intervalMs = useRealtimeStatus() === "live" ? LIVE_POLL_MS : POLL_MS;
  useChatSignals(() => {
    if (userId) void poll();
  });

  useEffect(() => {
    if (!userId) {
      useSummaryStore.setState(EMPTY);
      return;
    }
    subscribers++;
    if (subscribers === 1) void poll();
    if (timer) clearInterval(timer);
    timer = setInterval(poll, intervalMs);
    return () => {
      subscribers--;
      if (subscribers === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, [userId, intervalMs]);
}

export function useUnreadConnectionsCount(): number {
  useNetworkPolling(useCurrentUser()?.id);
  return useSummaryStore((s) => s.totalUnread);
}

export function useFriendCount(): number {
  useNetworkPolling(useCurrentUser()?.id);
  return useSummaryStore((s) => s.friendCount);
}
