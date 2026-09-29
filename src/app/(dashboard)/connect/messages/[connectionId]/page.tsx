"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/lib/auth/authStore";
import { SPORTS } from "@/lib/connect/sports";
import { CELEBRATION_REACTIONS, CelebrationCard } from "@/lib/connect/milestones";
import { logActivityAndCelebrate } from "@/lib/connect/logActivity";
import { CelebrationCardView } from "@/components/connect/CelebrationCardView";

interface ChatMessage {
  id: string;
  senderEmail: string;
  type: "text" | "celebration";
  body: string;
  createdAt: string;
  mine: boolean;
  expiresAt?: string | null;
  reaction?: string | null;
}

const POLL_MS = 3_000;

function parseCard(body: string): CelebrationCard | null {
  try {
    return JSON.parse(body) as CelebrationCard;
  } catch {
    return null;
  }
}

function expiresLabel(expiresAt: string | null | undefined): string {
  if (!expiresAt) return "";
  const hours = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3_600_000));
  return hours <= 1 ? "Disappears within the hour" : `Disappears in ${hours}h`;
}

async function fetchMessages(connectionId: string, email: string) {
  const res = await fetch(`/api/connections/${connectionId}/messages?email=${encodeURIComponent(email)}`);
  return res.json();
}

export default function ConnectionChatPage() {
  const user = useCurrentUser();
  const router = useRouter();
  const { connectionId } = useParams<{ connectionId: string }>();
  const justConnected = useSearchParams().get("new") === "1";

  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [logging, setLogging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    async function tick() {
      try {
        const data = await fetchMessages(connectionId, user!.email);
        if (data.ok) {
          setMessages(data.messages);
          setError(null);
        } else {
          setError(data.error ?? "Couldn't load this conversation.");
        }
      } catch {
        setError("Couldn't reach the friend network — is DATABASE_URL configured?");
      }
    }
    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => clearInterval(interval);
  }, [user, connectionId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    if (!user || !draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      const res = await fetch(`/api/connections/${connectionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, body: text }),
      });
      const data = await res.json();
      if (data.ok) {
        const refreshed = await fetchMessages(connectionId, user.email);
        if (refreshed.ok) setMessages(refreshed.messages);
      } else {
        setError(data.error ?? "Message failed to send.");
      }
    } finally {
      setSending(false);
    }
  }

  async function logSession(sport: string) {
    if (!user) return;
    setLogging(false);
    const result = await logActivityAndCelebrate(user, { sport, connectionId });
    setNotice(result.ok ? "Session logged together ✅" : (result.error ?? "Couldn't log the session."));
  }

  async function react(messageId: string, emoji: string) {
    if (!user) return;
    const res = await fetch(`/api/connections/${connectionId}/messages/${messageId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: user.email, emoji }),
    });
    const data = await res.json();
    if (data.ok) setMessages((current) => current?.map((m) => (m.id === messageId ? { ...m, reaction: emoji } : m)) ?? null);
  }

  function renderCelebration(m: ChatMessage) {
    const card = parseCard(m.body);
    if (!card) return null;
    return (
      <div className="flex flex-col gap-1.5">
        <CelebrationCardView card={card} compact />
        <div className="text-[11px] text-muted">🎉 Celebration · {expiresLabel(m.expiresAt)}</div>
        {m.mine ? (
          <div className="text-xs text-muted">{m.reaction ? `They reacted ${m.reaction}` : "No reaction yet"}</div>
        ) : (
          <div className="flex gap-1">
            {CELEBRATION_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => react(m.id, emoji)}
                aria-label={`React ${emoji}`}
                className={`rounded-full px-2 py-0.5 text-base ${m.reaction === emoji ? "bg-accent/30" : "hover:bg-surface-2"}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-160px)] max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/connect/messages")} className="text-muted hover:text-foreground">
          ← Back
        </button>
        <PageHeader icon="💬" title="Conversation" subtitle="" />
      </div>

      {justConnected && (
        <div className="rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-medium text-foreground">
          🎉 You&apos;re connected — say hi 👋
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex flex-col gap-2">
        {logging ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted">What did you do together?</span>
            {SPORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => logSession(s.key)}
                className="rounded-full border border-border px-3 py-1 text-xs text-foreground hover:bg-surface-2"
              >
                {s.icon} {s.label}
              </button>
            ))}
            <button onClick={() => setLogging(false)} className="text-xs text-muted hover:text-foreground">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setLogging(true);
              setNotice(null);
            }}
            className="self-start rounded-full border border-accent/40 px-4 py-1.5 text-xs font-medium text-foreground hover:bg-accent/10"
          >
            ✅ Log a session together
          </button>
        )}
        {notice && <p className="text-xs text-muted">{notice}</p>}
      </div>

      <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-surface p-4">
        {messages === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted">You&apos;re connected — say hi 👋</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
              {m.type === "celebration" ? (
                renderCelebration(m)
              ) : (
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    m.mine ? "bg-accent text-black" : "bg-surface-2 text-foreground"
                  }`}
                >
                  {m.body}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}
