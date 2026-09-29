"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/lib/auth/authStore";

interface ConversationSummary {
  connectionId: string;
  with: { email: string; name: string; code: string };
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

const POLL_MS = 8_000;

export default function ConnectMessagesPage() {
  const user = useCurrentUser();
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);

  useEffect(() => {
    if (!user) return;
    async function refresh() {
      try {
        const res = await fetch(`/api/connections?email=${encodeURIComponent(user!.email)}`);
        const data = await res.json();
        if (data.ok) setConversations(data.conversations);
      } catch {
        // Friend network unreachable — the page just keeps showing the last known list.
      }
    }
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader icon="💬" title="Messages" subtitle="Chat unlocks once a connection is accepted." />

      {conversations === null ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : conversations.length === 0 ? (
        <p className="text-sm text-muted">
          No conversations yet — accept a connection on the{" "}
          <Link href="/connect/friends" className="text-accent-foreground hover:underline">
            Friends
          </Link>{" "}
          tab to start chatting.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map((c) => (
            <Link
              key={c.connectionId}
              href={`/connect/messages/${c.connectionId}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{c.with.name}</div>
                <div className="truncate text-xs text-muted">{c.lastMessage ?? "Say hi 👋"}</div>
              </div>
              {c.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-black">
                  {c.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
