"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useCurrentUser } from "@/lib/auth/authStore";
import { useChatSignals } from "@/lib/realtime/client";
import { refreshNetworkSummary } from "@/lib/network/useUnreadCount";
import { IncomingRequestActions, IncomingRequestView } from "./IncomingRequestActions";
import { ConnectionMenu } from "./ConnectionMenu";
import { Avatar } from "@/components/profile/Avatar";
import { Icon } from "@/components/ui/Icon";

interface Friend {
  name: string;
  code: string;
  connectionId: string;
  photoId: string | null;
  verified: boolean;
}

interface FriendsListResponse {
  ok: boolean;
  friends: Friend[];
  incoming: (IncomingRequestView & { createdAt: string })[];
  outgoing: { id: string; to: { name: string; code: string }; createdAt: string }[];
}

type Tab = "friends" | "received" | "sent";

const sentAgo = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

/** Links like /connect/friends?tab=received open that tab. Rendered client-only behind AuthGuard. */
function tabFromUrl(): Tab {
  if (typeof window === "undefined") return "friends";
  const tab = new URLSearchParams(window.location.search).get("tab");
  return tab === "received" || tab === "sent" ? tab : "friends";
}

/** Friends page: add by code, then Friends / Received / Sent tabs. */
export function RealFriendNetwork() {
  const user = useCurrentUser();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(tabFromUrl);
  const [list, setList] = useState<FriendsListResponse | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const apply = useCallback((data: FriendsListResponse) => {
    if (data.ok) setList(data);
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await fetch("/api/friends/list").then((r) => r.json()));
    } catch {
      setMessage("Couldn't reach togetherfit. Check your connection.");
    }
    refreshNetworkSummary();
  }, [apply]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/friends/list")
      .then((r) => r.json())
      .then(apply)
      .catch(() => setMessage("Couldn't reach togetherfit. Check your connection."));
  }, [user, apply]);

  // New requests and changes made elsewhere show up without a reload.
  useChatSignals(() => {
    void refresh();
  });

  if (!user) return null;

  async function sendByCode() {
    if (!codeInput.trim()) return;
    setMessage(null);
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toCode: codeInput.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (data.ok) {
      setMessage("Request sent! You'll find it under Sent.");
      setCodeInput("");
      await refresh();
    } else {
      setMessage(data.error ?? "Something went wrong.");
    }
  }

  async function cancel(requestId: string) {
    await fetch("/api/friends/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    }).catch(() => null);
    await refresh();
  }

  const counts = { friends: list?.friends.length ?? 0, received: list?.incoming.length ?? 0, sent: list?.outgoing.length ?? 0 };
  const TABS: { key: Tab; label: string }[] = [
    { key: "friends", label: "Friends" },
    { key: "received", label: "Received" },
    { key: "sent", label: "Sent" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          Your code
          <span className="rounded-lg border border-border bg-surface px-3 py-1 font-mono text-foreground">{user.code}</span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(user.code).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-2"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendByCode()}
            placeholder="Friend's code, e.g. SB-7K2QAF"
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-base text-foreground outline-none focus:border-accent md:text-sm"
          />
          <button onClick={sendByCode} className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
            Add
          </button>
        </div>
        {message && <p className="text-xs text-muted">{message}</p>}
      </section>

      <div role="tablist" aria-label="Friends" className="grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-medium transition-colors",
              tab === t.key ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground"
            )}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span
                className={clsx(
                  "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  t.key === "received" ? "bg-accent text-black" : "bg-border text-foreground"
                )}
              >
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {!list ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : tab === "friends" ? (
        list.friends.length === 0 ? (
          <p className="text-sm text-muted">No friends yet. Share your code above, or use Find a Friend.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.friends.map((f) => (
              <li key={f.connectionId} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
                <Avatar name={f.name} photoId={f.photoId} verified={f.verified} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{f.name}</div>
                  <div className="font-mono text-xs text-muted">{f.code}</div>
                </div>
                <Link
                  href={`/connect/messages/${f.connectionId}`}
                  className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
                >
                  <Icon name="action.chat" size={14} className="mr-1 inline" />
                  Chat
                </Link>
                <ConnectionMenu
                  connectionId={f.connectionId}
                  name={f.name}
                  onDone={(action) => {
                    setMessage(action === "removed" ? `${f.name} was removed.` : action === "blocked" ? `${f.name} is blocked.` : `Thanks — ${f.name} was reported and blocked.`);
                    void refresh();
                  }}
                />
              </li>
            ))}
          </ul>
        )
      ) : tab === "received" ? (
        list.incoming.length === 0 ? (
          <p className="text-sm text-muted">No requests waiting for you.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.incoming.map((req) => (
              <li key={req.id} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
                <div className="flex items-center gap-3">
                  <Avatar name={req.from.name} verified={req.from.verified} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{req.from.name}</div>
                    <div className="text-xs text-muted">
                      {req.source === "find_a_friend" ? "Found you on Find a Friend" : "Used your friend code"} · {sentAgo(req.createdAt)}
                    </div>
                  </div>
                </div>
                <IncomingRequestActions
                  request={req}
                  onDone={(outcome) => {
                    if (outcome === "accepted") router.push(`/connect/messages/${req.id}?new=1`); // open the chat automatically
                    else void refresh();
                  }}
                />
              </li>
            ))}
          </ul>
        )
      ) : list.outgoing.length === 0 ? (
        <p className="text-sm text-muted">You haven&apos;t sent any requests that are still waiting.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.outgoing.map((req) => (
            <li key={req.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
              <Avatar name={req.to.name} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{req.to.name}</div>
                <div className="text-xs text-muted">Waiting for them · sent {sentAgo(req.createdAt)}</div>
              </div>
              <button
                onClick={() => cancel(req.id)}
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
              >
                Cancel request
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
