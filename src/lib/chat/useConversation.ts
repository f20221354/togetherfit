"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChatSignals, useRealtimeStatus } from "@/lib/realtime/client";
import { refreshNetworkSummary } from "@/lib/network/useUnreadCount";

/** Mirrors ChatMessage in src/lib/network/chatDb.ts, plus local send state. */
export interface ChatMessage {
  id: string;
  type: "text" | "celebration";
  body: string;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
  senderName: string;
  expiresAt: string | null;
  reaction: string | null;
  clientMessageId: string | null;
  cursor: string;
  /** Shown right away, before the server has confirmed it. */
  pending?: boolean;
  /** The send failed; the user can retry with the same clientMessageId, so it can't be saved twice. */
  failed?: boolean;
}

/** Realtime isn't available: check for changes this often (only changes are downloaded). */
const FALLBACK_SYNC_MS = 5_000;
/** Realtime is live: a slow safety net in case a signal is ever lost. */
const SAFETY_SYNC_MS = 60_000;
const EXPIRY_TICK_MS = 60_000;

const localId = (clientMessageId: string) => `local:${clientMessageId}`;

function byTime(a: ChatMessage, b: ChatMessage): number {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Adds or replaces messages by id; a confirmed message replaces its optimistic copy. */
function merge(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const map = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) {
    if (m.clientMessageId) map.delete(localId(m.clientMessageId));
    map.set(m.id, m);
  }
  return [...map.values()].sort(byTime);
}

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}

/** Header details the first page of a group chat carries (see GroupInfo in findDb.ts). */
export interface GroupInfo {
  id: string;
  name: string;
  sport: string;
  mode: "now" | "scheduled";
  startTime: string;
  members: string[];
}

/**
 * One conversation, with a friend or in a group: the newest page on open,
 * older pages on demand, and only *changes* afterwards. Changes are fetched
 * when the realtime signal arrives, after reconnecting or coming back to the
 * tab, and on a timer as a fallback.
 */
export function useConversation(id: string, kind: "connection" | "group" = "connection") {
  const base = kind === "group" ? `/api/groups/${id}/messages` : `/api/connections/${id}/messages`;
  const status = useRealtimeStatus();

  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [partner, setPartner] = useState<{ name: string; photoId: string | null; verified: boolean } | null>(null);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  /** The conversation is gone: unfriended, blocked or reported (by either side), or you left the group. */
  const [ended, setEnded] = useState(false);

  const syncCursor = useRef<string | null>(null);
  const syncing = useRef(false);
  const syncAgain = useRef(false);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markReadSoon = useCallback(() => {
    // Unread counts are for friend chats only.
    if (kind !== "connection" || document.visibilityState !== "visible") return;
    if (readTimer.current) clearTimeout(readTimer.current);
    readTimer.current = setTimeout(() => {
      fetch(`/api/connections/${id}/read`, { method: "POST" })
        .then(() => refreshNetworkSummary())
        .catch(() => {});
    }, 800);
  }, [id, kind]);

  /** Replaces the view with a fresh newest page, keeping messages that are still being sent. */
  const applyLatest = useCallback(
    (data: {
      ok: boolean;
      error?: string;
      messages: ChatMessage[];
      hasMore: boolean;
      syncCursor: string;
      partner?: { name: string; photoId: string | null; verified: boolean };
      group?: GroupInfo;
    }) => {
      if (!data.ok) {
        setError(data.error ?? "Couldn't load this conversation.");
        return;
      }
      if (data.partner) setPartner(data.partner);
      if (data.group) setGroup(data.group);
      syncCursor.current = data.syncCursor;
      setHasMore(data.hasMore);
      setMessages((current) => merge((current ?? []).filter((m) => m.pending || m.failed), data.messages));
      setError(null);
      if (data.messages.some((m) => !m.mine)) markReadSoon();
    },
    [markReadSoon]
  );

  const loadLatest = useCallback(async () => applyLatest(await getJson(base)), [base, applyLatest]);

  /** Fetches what changed since the last sync. Calls that overlap are folded into one extra run. */
  const sync = useCallback(async () => {
    if (!syncCursor.current) return;
    if (syncing.current) {
      syncAgain.current = true;
      return;
    }
    syncing.current = true;
    try {
      do {
        syncAgain.current = false;
        const cursor: string | null = syncCursor.current;
        if (!cursor) break;
        const res: Response = await fetch(`${base}?since=${encodeURIComponent(cursor)}`, { cache: "no-store" });
        const data: { ok: boolean; error?: string; reset?: boolean; syncCursor: string; messages: ChatMessage[] } = await res.json();
        if (res.status === 403) {
          setEnded(true);
          break;
        }
        if (!data.ok) {
          setError(data.error ?? "Couldn't load new messages.");
          break;
        }
        if (data.reset) {
          await loadLatest();
          continue;
        }
        syncCursor.current = data.syncCursor;
        if (data.messages.length > 0) {
          setMessages((current) => merge(current ?? [], data.messages));
          if (data.messages.some((m: ChatMessage) => !m.mine)) markReadSoon();
        }
        setError(null);
      } while (syncAgain.current);
    } catch {
      setError("You're offline. New messages will appear when you reconnect.");
    } finally {
      syncing.current = false;
    }
  }, [base, loadLatest, markReadSoon]);

  // First page.
  useEffect(() => {
    getJson(base)
      .then(applyLatest)
      .catch(() => setError("Couldn't reach togetherfit. Check your connection."));
    return () => {
      if (readTimer.current) clearTimeout(readTimer.current);
    };
  }, [base, applyLatest]);

  // Realtime signal for this conversation, reconnects, tab focus, coming back online.
  useChatSignals((signal) => {
    if (!signal) void sync();
    else if (kind === "group" ? "groupId" in signal && signal.groupId === id : "connectionId" in signal && signal.connectionId === id) void sync();
  });

  // Fallback / safety-net timer; skipped while the tab is hidden.
  useEffect(() => {
    const interval = setInterval(
      () => {
        if (document.visibilityState === "visible") void sync();
      },
      status === "live" ? SAFETY_SYNC_MS : FALLBACK_SYNC_MS
    );
    return () => clearInterval(interval);
  }, [status, sync]);

  // Celebration cards hide themselves when they expire, without a refetch.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), EXPIRY_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  /** Loads the page before the oldest message shown. Returns how many messages were added. */
  const loadOlder = useCallback(async (): Promise<number> => {
    const oldest = messages?.find((m) => !m.pending && !m.failed);
    if (!oldest || loadingOlder) return 0;
    setLoadingOlder(true);
    try {
      const data = await getJson(`${base}?before=${encodeURIComponent(oldest.cursor)}`);
      if (!data.ok) return 0;
      setMessages((current) => merge(current ?? [], data.messages));
      setHasMore(data.hasMore);
      return data.messages.length;
    } catch {
      setError("Couldn't load older messages.");
      return 0;
    } finally {
      setLoadingOlder(false);
    }
  }, [base, messages, loadingOlder]);

  /** POSTs a message; a network failure is retried once with the same clientMessageId. */
  const post = useCallback(
    async (text: string, clientMessageId: string): Promise<{ ok: boolean; error?: string }> => {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(base, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: text, clientMessageId }),
          });
          const data = await res.json();
          if (data.ok) {
            setMessages((current) => merge(current ?? [], [data.message]));
            return { ok: true };
          }
          // The server said no (not friends any more, rate limit…): retrying won't help.
          setMessages((current) => (current ?? []).filter((m) => m.id !== localId(clientMessageId)));
          return { ok: false, error: data.error ?? "Message failed to send." };
        } catch {
          if (attempt === 0) await new Promise((r) => setTimeout(r, 1_000));
        }
      }
      setMessages((current) =>
        (current ?? []).map((m) => (m.id === localId(clientMessageId) ? { ...m, pending: false, failed: true } : m))
      );
      return { ok: false, error: "Couldn't send. Check your connection and tap Retry." };
    },
    [base]
  );

  const send = useCallback(
    (text: string) => {
      const clientMessageId = crypto.randomUUID();
      const at = new Date().toISOString();
      const optimistic: ChatMessage = {
        id: localId(clientMessageId),
        type: "text",
        body: text,
        createdAt: at,
        updatedAt: at,
        mine: true,
        senderName: "",
        expiresAt: null,
        reaction: null,
        clientMessageId,
        cursor: "",
        pending: true,
      };
      setMessages((current) => merge(current ?? [], [optimistic]));
      return post(text, clientMessageId);
    },
    [post]
  );

  const retry = useCallback(
    (message: ChatMessage): Promise<{ ok: boolean; error?: string }> => {
      if (!message.clientMessageId) return Promise.resolve({ ok: false });
      setMessages((current) =>
        (current ?? []).map((m) => (m.id === message.id ? { ...m, pending: true, failed: false } : m))
      );
      return post(message.body, message.clientMessageId);
    },
    [post]
  );

  const react = useCallback(
    async (messageId: string, emoji: string) => {
      setMessages((current) => (current ?? []).map((m) => (m.id === messageId ? { ...m, reaction: emoji } : m)));
      const res = await fetch(`${base}/${messageId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      }).catch(() => null);
      if (!res?.ok) void sync();
    },
    [base, sync]
  );

  const visible = useMemo(
    () => messages?.filter((m) => !m.expiresAt || Date.parse(m.expiresAt) > now) ?? null,
    [messages, now]
  );

  return { messages: visible, partner, group, ended, hasMore, loadingOlder, error, loadOlder, send, retry, react, live: status === "live" };
}
