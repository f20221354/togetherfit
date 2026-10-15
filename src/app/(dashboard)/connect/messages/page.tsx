"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/lib/auth/authStore";
import { useChatSignals, useRealtimeStatus } from "@/lib/realtime/client";
import { sportMeta } from "@/lib/connect/sports";
import { timeSlotLabel } from "@/lib/connect/timeSlot";
import { Avatar } from "@/components/profile/Avatar";
import { Icon } from "@/components/ui/Icon";

interface ConversationSummary {
  connectionId: string;
  with: { name: string; code: string; photoId: string | null; verified: boolean };
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
/** With realtime live, friend chats refresh on each new message; the timer mainly keeps group previews fresh. */
const LIVE_POLL_MS = 30_000;

function fetchLists() {
  return Promise.all([fetch("/api/connections").then((r) => r.json()), fetch("/api/groups").then((r) => r.json())]);
}

export default function ConnectMessagesPage() {
  const user = useCurrentUser();
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [groups, setGroups] = useState<GroupSummary[]>([]);

  const applyLists = useCallback(([conversationsData, groupsData]: [{ ok: boolean; conversations: ConversationSummary[] }, { ok: boolean; groups: GroupSummary[] }]) => {
    if (conversationsData.ok) setConversations(conversationsData.conversations);
    if (groupsData.ok) setGroups(groupsData.groups);
  }, []);

  // Friend network unreachable — the page just keeps showing the last known list.
  const refresh = useCallback(() => fetchLists().then(applyLists).catch(() => {}), [applyLists]);

  const intervalMs = useRealtimeStatus() === "live" ? LIVE_POLL_MS : POLL_MS;
  useEffect(() => {
    if (!user) return;
    fetchLists().then(applyLists).catch(() => {});
    const interval = setInterval(refresh, intervalMs);
    return () => clearInterval(interval);
  }, [user, refresh, applyLists, intervalMs]);

  // A new message in any conversation (or reconnecting) refreshes previews and unread counts.
  useChatSignals(() => {
    if (user) void refresh();
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader icon="action.chat" title="Messages" subtitle="Chat unlocks once a connection is accepted." />

      {groups.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Groups</h2>
          {groups.map((g) => (
            <Link
              key={g.groupId}
              href={`/connect/groups/${g.groupId}`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2"
            >
              <Icon name={sportMeta(g.sport).icon} size={22} className="text-accent-foreground" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{g.name}</div>
                <div className="truncate text-xs text-muted">
                  {timeSlotLabel(g.mode, g.startTime)} · {g.memberCount} {g.memberCount === 1 ? "member" : "members"} · {g.lastMessage ?? "Say hi!"}
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
              <Avatar name={c.with.name} photoId={c.with.photoId} verified={c.with.verified} />
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{c.with.name}</div>
                <div className="truncate text-xs text-muted">{c.lastMessage ?? "Say hi!"}</div>
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
