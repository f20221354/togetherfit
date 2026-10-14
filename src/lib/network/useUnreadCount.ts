"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useCurrentUser } from "@/lib/auth/authStore";

const POLL_MS = 20_000;

interface NetworkSummary {
  /** Unread chat messages across all accepted connections. */
  totalUnread: number;
  friendCount: number;
}

const EMPTY: NetworkSummary = { totalUnread: 0, friendCount: 0 };
const useSummaryStore = create<NetworkSummary>(() => EMPTY);

// One poller shared by every component that shows these numbers (sidebar,
// mobile tab bar, overview), however many are mounted.
let subscribers = 0;
let timer: ReturnType<typeof setInterval> | null = null;

async function poll() {
  try {
    const res = await fetch("/api/friends/list");
    const data = await res.json();
    if (data.ok) useSummaryStore.setState({ totalUnread: data.totalUnread ?? 0, friendCount: data.friends?.length ?? 0 });
  } catch {
    // Friend network unreachable — numbers stay at their last known values.
  }
}

function useNetworkPolling(userId: string | undefined) {
  useEffect(() => {
    if (!userId) {
      useSummaryStore.setState(EMPTY);
      return;
    }
    subscribers++;
    if (subscribers === 1) {
      poll();
      timer = setInterval(poll, POLL_MS);
    }
    return () => {
      subscribers--;
      if (subscribers === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, [userId]);
}

export function useUnreadConnectionsCount(): number {
  useNetworkPolling(useCurrentUser()?.id);
  return useSummaryStore((s) => s.totalUnread);
}

export function useFriendCount(): number {
  useNetworkPolling(useCurrentUser()?.id);
  return useSummaryStore((s) => s.friendCount);
}
