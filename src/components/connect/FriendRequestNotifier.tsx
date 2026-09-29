"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/authStore";

interface IncomingRequest {
  id: string;
  from: { email: string; name: string; code: string };
  createdAt: string;
}

const POLL_MS = 20_000;

function seenKey(email: string) {
  return `sb-seen-friend-requests-${email}`;
}

function loadSeen(email: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(email));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSeen(email: string, ids: Set<string>) {
  try {
    localStorage.setItem(seenKey(email), JSON.stringify([...ids]));
  } catch {
    // localStorage unavailable — notifications just won't dedupe across reloads.
  }
}

/**
 * Global pop-up for incoming real friend requests (src/lib/network/friendsDb.ts).
 * There's no realtime layer in this app, so this polls periodically; a real
 * push/websocket notification could later replace just the polling loop below
 * without changing the toast UI or accept/decline logic.
 */
export function FriendRequestNotifier() {
  const user = useCurrentUser();
  const router = useRouter();
  const [visible, setVisible] = useState<IncomingRequest[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const poll = useCallback(async (email: string) => {
    try {
      const res = await fetch(`/api/friends/list?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!data.ok) return;
      const incoming: IncomingRequest[] = data.incoming ?? [];
      const unseen = incoming.filter((r) => !seenRef.current.has(r.id));
      if (unseen.length > 0) {
        setVisible((current) => {
          const existingIds = new Set(current.map((r) => r.id));
          return [...current, ...unseen.filter((r) => !existingIds.has(r.id))];
        });
      }
    } catch {
      // Friend network unreachable (e.g. DATABASE_URL not configured) — fail silently, no toast.
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    seenRef.current = loadSeen(user.email);
    poll(user.email);
    const interval = setInterval(() => poll(user.email), POLL_MS);
    return () => clearInterval(interval);
  }, [user, poll]);

  function dismiss(id: string) {
    if (!user) return;
    seenRef.current.add(id);
    saveSeen(user.email, seenRef.current);
    setVisible((current) => current.filter((r) => r.id !== id));
  }

  async function respond(requestId: string, status: "accepted" | "declined") {
    if (!user) return;
    setBusyId(requestId);
    try {
      await fetch("/api/friends/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, respondingEmail: user.email, status }),
      });
    } finally {
      setBusyId(null);
      dismiss(requestId);
      if (status === "accepted") router.push(`/connect/messages/${requestId}`); // open the chat automatically
    }
  }

  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex flex-col gap-2">
      {visible.map((req) => (
        <div
          key={req.id}
          className="pointer-events-auto flex w-72 flex-col gap-2 rounded-2xl border border-accent/30 bg-surface p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-medium text-foreground">
              🤝 {req.from.name} sent you a friend request
            </div>
            <button onClick={() => dismiss(req.id)} className="text-muted hover:text-foreground" aria-label="Dismiss">
              ✕
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => respond(req.id, "accepted")}
              disabled={busyId === req.id}
              className="flex-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-60"
            >
              Accept
            </button>
            <button
              onClick={() => respond(req.id, "declined")}
              disabled={busyId === req.id}
              className="flex-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2 disabled:opacity-60"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
