"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { AddFriendModal } from "@/components/connect/AddFriendModal";
import { SPORTS, sportMeta } from "@/lib/connect/sports";
import { useCurrentUser } from "@/lib/auth/authStore";
import { Icon } from "@/components/ui/Icon";

interface Friend {
  name: string;
  code: string;
  connectionId: string;
}

interface GroupSummary {
  groupId: string;
  name: string;
  sport: string;
  memberCount: number;
  lastMessage: string | null;
}

export default function ConnectDashboardPage() {
  const user = useCurrentUser();
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      const [friendsRes, groupsRes] = await Promise.allSettled([
        fetch("/api/friends/list").then((r) => r.json()),
        fetch("/api/groups").then((r) => r.json()),
      ]);
      if (cancelled) return;
      // Unreachable network: sections just show their empty states.
      setFriends(friendsRes.status === "fulfilled" && friendsRes.value.ok ? friendsRes.value.friends : []);
      setGroups(groupsRes.status === "fulfilled" && groupsRes.value.ok ? groupsRes.value.groups : []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader icon="nav.connect" title="Connect" subtitle="Find real people nearby to move with." />
        <div className="flex flex-wrap items-center gap-2 sm:mt-1 sm:shrink-0">
          <Link
            href="/connect/find"
            className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-black hover:opacity-90"
          >
            <Icon name="action.search" size={14} weight="bold" className="mr-1 inline-block align-[-0.15em]" />
            Find a Friend
          </Link>
          <button
            onClick={() => setAddFriendOpen(true)}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-2"
          >
            <Icon name="action.add" size={14} weight="bold" className="mr-1 inline-block align-[-0.15em]" />
            Add Friend
          </button>
        </div>
      </div>

      {addFriendOpen && <AddFriendModal onClose={() => setAddFriendOpen(false)} />}

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">What do you want to do?</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SPORTS.map((s) => (
            <Link
              key={s.key}
              href={`/connect/find?sport=${s.key}`}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:bg-surface-2"
            >
              <Icon name={s.icon} size={28} className="text-accent-foreground" />
              {s.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
            Your Friends {friends && friends.length > 0 && `(${friends.length})`}
          </h2>
          <Link href="/connect/friends" className="text-xs font-medium text-accent-foreground hover:underline">
            Manage →
          </Link>
        </div>
        {friends === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : friends.length === 0 ? (
          <p className="text-sm text-muted">
            No friends yet — share your code on the{" "}
            <Link href="/connect/friends" className="text-accent-foreground hover:underline">
              Friends
            </Link>{" "}
            tab, or tap Find a Friend above.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {friends.map((f) => (
              <Link
                key={f.connectionId}
                href={`/connect/messages/${f.connectionId}`}
                className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-surface-2"
              >
                <span className="truncate">{f.name}</span> <Icon name="action.chat" size={14} className="shrink-0 text-muted" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {groups && groups.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Your Groups</h2>
          <div className="flex flex-col gap-3">
            {groups.map((g) => (
              <Link
                key={g.groupId}
                href={`/connect/groups/${g.groupId}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    <Icon name={sportMeta(g.sport).icon} size={16} className="inline-block align-[-0.2em]" /> {g.name}
                  </div>
                  {g.lastMessage && <div className="truncate text-xs text-muted">{g.lastMessage}</div>}
                </div>
                <span className="shrink-0 text-xs text-muted">{g.memberCount} members</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
