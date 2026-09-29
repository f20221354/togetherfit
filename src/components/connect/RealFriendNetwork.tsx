"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/authStore";
import { IncomingRequestActions, IncomingRequestView } from "./IncomingRequestActions";

interface NetworkUser {
  email: string;
  name: string;
  code: string;
}

interface FriendsListResponse {
  ok: boolean;
  friends: (NetworkUser & { connectionId: string })[];
  incoming: (IncomingRequestView & { createdAt: string })[];
  outgoing: { id: string; to: NetworkUser; createdAt: string }[];
}

/**
 * Real, cross-device friends: a shareable code backed by a real database
 * (src/lib/network/friendsDb.ts), unlike the rest of Connect which is
 * simulated against local demo partners. Two different real people, on two
 * different devices, can find each other with this.
 */
export function RealFriendNetwork() {
  const user = useCurrentUser();
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [list, setList] = useState<FriendsListResponse | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async (email: string) => {
    const res = await fetch(`/api/friends/list?email=${encodeURIComponent(email)}`);
    const data: FriendsListResponse = await res.json();
    if (data.ok) setList(data);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setStatus("loading");
      try {
        const res = await fetch("/api/friends/identity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email, name: user.name }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data.ok) {
          setStatus("error");
          setMessage(data.error);
          return;
        }
        setCode(data.identity.code);
        await refresh(user.email);
        setStatus("idle");
      } catch {
        if (!cancelled) {
          setStatus("error");
          setMessage("Couldn't reach the friend network — is DATABASE_URL configured?");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, refresh]);

  if (!user) return null;

  async function sendByCode() {
    if (!codeInput.trim() || !user) return;
    setMessage(null);
    const res = await fetch("/api/friends/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromEmail: user.email, fromName: user.name, toCode: codeInput.trim() }),
    });
    const data = await res.json();
    if (data.ok) {
      setMessage("Request sent!");
      setCodeInput("");
      await refresh(user.email);
    } else {
      setMessage(data.error ?? "Something went wrong.");
    }
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-5">
      <div>
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-accent-foreground">
          Real Friends (share your code)
        </h2>
        <p className="text-xs text-muted">
          Works across real devices — give this code to a friend who&apos;s also using स्वस्थ Bharat.
        </p>
      </div>

      {status === "error" && <p className="text-sm text-danger">{message}</p>}

      {code && (
        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-border bg-surface px-4 py-2 font-mono text-sm text-foreground">
            {code}
          </span>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(code).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              });
            }}
            className="rounded-full border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-2"
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendByCode()}
          placeholder="Enter a friend's code, e.g. SB-7K2QAF"
          className="flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <button
          onClick={sendByCode}
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          Send Request
        </button>
      </div>
      {message && status !== "error" && <p className="text-xs text-muted">{message}</p>}

      {list && list.incoming.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
            Incoming ({list.incoming.length})
          </h3>
          <div className="flex flex-col gap-2">
            {list.incoming.map((req) => (
              <div key={req.id} className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3">
                <div className="text-sm font-medium text-foreground">{req.from.name}</div>
                <IncomingRequestActions
                  request={req}
                  email={user.email}
                  onDone={(outcome) => {
                    if (outcome === "accepted") router.push(`/connect/messages/${req.id}?new=1`); // open the chat automatically
                    else refresh(user.email);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {list && list.outgoing.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
            Outgoing ({list.outgoing.length})
          </h3>
          <div className="flex flex-col gap-2">
            {list.outgoing.map((req) => (
              <div key={req.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 text-sm text-muted">
                {req.to.name} — waiting for them to respond
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
          Friends {list && list.friends.length > 0 && `(${list.friends.length})`}
        </h3>
        {!list || list.friends.length === 0 ? (
          <p className="text-sm text-muted">No real friends yet — share your code above.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {list.friends.map((f) => (
              <Link
                key={f.email}
                href={`/connect/messages/${f.connectionId}`}
                className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-surface-2"
              >
                {f.name} <span aria-hidden="true">💬</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
