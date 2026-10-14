"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/authStore";
import { useIncomingRequests, type IncomingRequest } from "@/lib/network/useUnreadCount";
import { IncomingRequestActions } from "./IncomingRequestActions";
import { Icon } from "@/components/ui/Icon";

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
 * Global pop-up for incoming connection requests. It reads the shared
 * network poller (useIncomingRequests), which also refreshes on realtime
 * signals, instead of fetching on its own timer. A request disappears once
 * it's dismissed, answered, or no longer pending.
 */
export function FriendRequestNotifier() {
  const user = useCurrentUser();
  // Remount per account, so one person's dismissed pop-ups never apply to another.
  return user ? <Notifier key={user.id} email={user.email} /> : null;
}

function Notifier({ email }: { email: string }) {
  const router = useRouter();
  const incoming = useIncomingRequests();
  const [seen, setSeen] = useState(() => loadSeen(email));
  const visible = incoming.filter((r) => !seen.has(toastKey(r)));

  function dismiss(req: IncomingRequest) {
    const next = new Set(seen).add(toastKey(req));
    saveSeen(email, next);
    setSeen(next);
  }

  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[60] flex flex-col gap-2">
      {visible.map((req) => (
        <div
          key={toastKey(req)}
          className="pointer-events-auto flex w-72 flex-col gap-2 rounded-2xl border border-accent/30 bg-surface p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-medium text-foreground">
              <Icon name="nav.connect" size={16} className="mr-1 inline text-accent-foreground" />
              {req.from.name}{" "}
              {req.proposedTime ? "suggested another time" : req.source === "find_a_friend" ? "found you on the radar" : "sent you a friend request"}
            </div>
            <button onClick={() => dismiss(req)} className="text-muted hover:text-foreground" aria-label="Dismiss">
              ✕
            </button>
          </div>
          <IncomingRequestActions
            request={req}
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
