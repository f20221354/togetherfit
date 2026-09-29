"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/shell/PageHeader";
import { useCurrentUser } from "@/lib/auth/authStore";

interface ChatMessage {
  id: string;
  senderEmail: string;
  type: "text" | "celebration";
  body: string;
  createdAt: string;
  mine: boolean;
}

const POLL_MS = 3_000;

async function fetchMessages(connectionId: string, email: string) {
  const res = await fetch(`/api/connections/${connectionId}/messages?email=${encodeURIComponent(email)}`);
  return res.json();
}

export default function ConnectionChatPage() {
  const user = useCurrentUser();
  const router = useRouter();
  const { connectionId } = useParams<{ connectionId: string }>();

  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
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

  return (
    <div className="mx-auto flex h-[calc(100vh-160px)] max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/connect/messages")} className="text-muted hover:text-foreground">
          ← Back
        </button>
        <PageHeader icon="💬" title="Conversation" subtitle="" />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div ref={listRef} className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-surface p-4">
        {messages === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted">You&apos;re connected — say hi 👋</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                  m.mine ? "bg-accent text-black" : "bg-surface-2 text-foreground"
                }`}
              >
                {m.body}
              </div>
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
