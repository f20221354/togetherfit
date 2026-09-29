"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/authStore";
import { IncomingRequestActions, IncomingRequestView } from "./IncomingRequestActions";

interface IncomingRequest extends IncomingRequestView {
  createdAt: string;
}

const POLL_MS = 20_000;

function seenKey(email: string) {
  return `sb-seen-friend-requests-${email}`;
}

/** A counter-suggestion reuses the same request id with a new timestamp, so it pops up again. */
function toastKey(r: IncomingRequest) {
  return `${r.id}:${r.createdAt}`;
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
 * Global pop-up for incoming real connection requests (src/lib/network/friendsDb.ts).
 * There's no realtime layer in this app, so this polls periodically; a real
 * push/websocket notification could later replace just the polling loop below
 * without changing the toast UI or the responder actions.
 */
export function FriendRequestNotifier() {
  const user = useCurrentUser();
  const router = useRouter();
  const [visible, setVisible] = useState<IncomingRequest[]>([]);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    seenRef.current = loadSeen(user.email);
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`/api/friends/list?email=${encodeURIComponent(user!.email)}`);
        const data = await res.json();
        if (cancelled || !data.ok) return;
        const incoming: IncomingRequest[] = data.incoming ?? [];
        const unseen = incoming.filter((r) => !seenRef.current.has(toastKey(r)));
        if (unseen.length > 0) {
          setVisible((current) => {
            const existing = new Set(current.map(toastKey));
            return [...current, ...unseen.filter((r) => !existing.has(toastKey(r)))];
          });
        }
      } catch {
        // Network unreachable (e.g. DATABASE_URL not configured) — fail silently, no toast.
      }
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  function dismiss(req: IncomingRequest) {
    if (!user) return;
    seenRef.current.add(toastKey(req));
    saveSeen(user.email, seenRef.current);
    setVisible((current) => current.filter((r) => toastKey(r) !== toastKey(req)));
  }

  if (!user || visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex flex-col gap-2">
      {visible.map((req) => (
        <div
          key={toastKey(req)}
          className="pointer-events-auto flex w-72 flex-col gap-2 rounded-2xl border border-accent/30 bg-surface p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-medium text-foreground">
              🤝 {req.from.name}{" "}
              {req.proposedTime ? "suggested another time" : req.source === "find_a_friend" ? "found you on the radar" : "sent you a friend request"}
            </div>
            <button onClick={() => dismiss(req)} className="text-muted hover:text-foreground" aria-label="Dismiss">
              ✕
            </button>
          </div>
          <IncomingRequestActions
            request={req}
            email={user.email}
            onDone={(outcome) => {
              dismiss(req);
              if (outcome === "accepted") router.push(`/connect/messages/${req.id}?new=1`); // open the chat automatically
            }}
          />
        </div>
      ))}
    </div>
  );
}
