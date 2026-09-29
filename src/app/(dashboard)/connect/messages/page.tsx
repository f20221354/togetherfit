"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/lib/auth/authStore";
import { sportMeta } from "@/lib/connect/sports";
import { timeSlotLabel } from "@/lib/connect/timeSlot";

interface ConversationSummary {
  connectionId: string;
  with: { email: string; name: string; code: string };
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface GroupSummary {
  groupId: string;
  name: string;
  sport: string;
  mode: "now" | "scheduled";
  startTime: string;
  memberCount: number;
  lastMessage: string | null;
}

const POLL_MS = 8_000;

export default function ConnectMessagesPage() {
  const user = useCurrentUser();
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [groups, setGroups] = useState<GroupSummary[]>([]);

  useEffect(() => {
    if (!user) return;
    async function refresh() {
      try {
        const res = await fetch(`/api/connections?email=${encodeURIComponent(user!.email)}`);
        const data = await res.json();
        if (data.ok) setConversations(data.conversations);
        const groupsRes = await fetch(`/api/groups?email=${encodeURIComponent(user!.email)}`);
        const groupsData = await groupsRes.json();
        if (groupsData.ok) setGroups(groupsData.groups);
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

      {groups.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Groups</h2>
          {groups.map((g) => (
            <Link
              key={g.groupId}
              href={`/connect/groups/${g.groupId}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2"
            >
              <span className="text-xl">{sportMeta(g.sport).icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{g.name}</div>
                <div className="truncate text-xs text-muted">
                  {timeSlotLabel(g.mode, g.startTime)} · {g.memberCount} {g.memberCount === 1 ? "member" : "members"} · {g.lastMessage ?? "Say hi 👋"}
                </div>
              </div>
            </Link>
          ))}
          <h2 className="mt-2 text-xs font-semibold uppercase tracking-widest text-muted">Friends</h2>
        </div>
      )}

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
