"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useCurrentUser } from "@/lib/auth/authStore";
import { useChatSignals, useRealtimeStatus } from "@/lib/realtime/client";
import type { IncomingRequest } from "./friendsDb";

export type { IncomingRequest } from "./friendsDb";

const POLL_MS = 20_000;
/** With realtime live, new messages trigger a refresh, so the timer is only a safety net. */
const LIVE_POLL_MS = 120_000;

interface NetworkSummary {
  /** Unread chat messages across all accepted connections. */
  totalUnread: number;
  friendCount: number;
  /** Pending connection requests to you (the pop-up and the Friends page read these). */
  incoming: IncomingRequest[];
}

const EMPTY: NetworkSummary = { totalUnread: 0, friendCount: 0, incoming: [] };
const useSummaryStore = create<NetworkSummary>(() => EMPTY);

// One poller shared by every component that shows these numbers (sidebar,
// mobile tab bar, overview, request pop-up), however many are mounted;
// overlapping refreshes share one request.
let subscribers = 0;
let timer: ReturnType<typeof setInterval> | null = null;

let inflight: Promise<void> | null = null;

function poll(): Promise<void> {
  inflight ??= fetch("/api/friends/list")
    .then((res) => res.json())
    .then((data) => {
      if (data.ok) {
        useSummaryStore.setState({
          totalUnread: data.totalUnread ?? 0,
          friendCount: data.friends?.length ?? 0,
          incoming: data.incoming ?? [],
        });
      }
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

export function useIncomingRequests(): IncomingRequest[] {
  useNetworkPolling(useCurrentUser()?.id);
  return useSummaryStore((s) => s.incoming);
}

/** Connect tab badge: unread messages plus requests waiting for you. */
export function useConnectBadgeCount(): number {
  useNetworkPolling(useCurrentUser()?.id);
  return useSummaryStore((s) => s.totalUnread + s.incoming.length);
}
