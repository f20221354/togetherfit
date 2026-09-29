"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/auth/authStore";

const POLL_MS = 20_000;

/** Total unread chat messages across all accepted connections, for the sidebar badge. */
export function useUnreadConnectionsCount(): number {
  const user = useCurrentUser();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/friends/list?email=${encodeURIComponent(user!.email)}`);
        const data = await res.json();
        if (!cancelled && data.ok) setCount(data.totalUnread ?? 0);
      } catch {
        // Friend network unreachable — badge just stays at its last known value.
      }
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  return count;
}
