"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { useConnectStore } from "@/lib/store/connectStore";
import { MOCK_PARTNERS, searchPartners } from "@/lib/connect/mockPartners";

export default function ConnectFriendsPage() {
  const friends = useConnectStore((s) => s.friends);
  const friendRequests = useConnectStore((s) => s.friendRequests);
  const sendFriendRequest = useConnectStore((s) => s.sendFriendRequest);
  const respondFriendRequest = useConnectStore((s) => s.respondFriendRequest);

  const [query, setQuery] = useState("");
  const results = searchPartners(query);
  const pendingRequests = friendRequests.filter((r) => r.status === "pending");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader icon="👥" title="Friends" subtitle="Search by name and send a friend request." />

      <section>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
        />
        {query.trim() && (
          <div className="mt-3 flex flex-col gap-2">
            {results.length === 0 && <p className="text-sm text-muted">No one found with that name.</p>}
            {results.map((partner) => {
              const isFriend = friends.includes(partner.id);
              const pending = friendRequests.some((r) => r.partnerId === partner.id && r.status === "pending");
              return (
                <div key={partner.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                  <Link href={`/connect/profile/${partner.id}`} className="flex flex-1 items-center gap-3 hover:opacity-80">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-xl">
                      {partner.avatar}
                    </span>
                    <div className="text-sm font-medium text-foreground">{partner.name}</div>
                  </Link>
                  <button
                    onClick={() => sendFriendRequest(partner.id)}
                    disabled={isFriend || pending}
                    className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-60"
                  >
                    {isFriend ? "Friends ✓" : pending ? "Pending…" : "Add Friend"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
          Pending Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-muted">No pending requests.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pendingRequests.map((request) => {
              const partner = MOCK_PARTNERS.find((p) => p.id === request.partnerId);
              if (!partner) return null;
              return (
                <div key={request.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-xl">
                    {partner.avatar}
                  </span>
                  <div className="flex-1 text-sm font-medium text-foreground">{partner.name}</div>
                  <button
                    onClick={() => respondFriendRequest(request.id, "accepted")}
                    className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respondFriendRequest(request.id, "declined")}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
                  >
                    Decline
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
          Friends {friends.length > 0 && `(${friends.length})`}
        </h2>
        {friends.length === 0 ? (
          <p className="text-sm text-muted">No friends yet — search above or try Find a Friend.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {friends.map((id) => {
              const partner = MOCK_PARTNERS.find((p) => p.id === id);
              if (!partner) return null;
              return (
                <Link
                  key={id}
                  href={`/connect/profile/${id}`}
                  className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-surface-2"
                >
                  <span>{partner.avatar}</span>
                  {partner.name}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-xs text-muted">
        Friend requests here auto-resolve after a short delay, simulating the other person&apos;s response, since
        there&apos;s no real backend yet.
      </p>
    </div>
  );
}
