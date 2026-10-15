import { Client } from "pg";
import { sslConfig } from "@/lib/db";
import type { ChatSignal, RealtimeServerDriver } from "../types";

/**
 * REALTIME=sse: browsers keep one Server-Sent Events stream open
 * (/api/realtime/stream). A message can be saved by any server process, so
 * signals travel through Postgres: `publish` runs NOTIFY, and every process
 * LISTENs on one dedicated connection and forwards each signal to the
 * streams it holds for those users.
 */

const CHANNEL = "togetherfit_realtime";
/** NOTIFY payloads must stay under 8000 bytes; 100 user ids is about 4 KB. */
const USERS_PER_NOTIFY = 100;
const RECONNECT_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

export type StreamEvent = { kind: "signal"; signal: ChatSignal } | { kind: "resync" };
type Listener = (event: StreamEvent) => void;

interface Hub {
  listeners: Map<string, Set<Listener>>;
  client: Client | null;
  connecting: Promise<void> | null;
  attempt: number;
}

declare global {
  var _realtimeHub: Hub | undefined;
}

function hub(): Hub {
  globalThis._realtimeHub ??= { listeners: new Map(), client: null, connecting: null, attempt: 0 };
  return globalThis._realtimeHub;
}

function broadcastAll(event: StreamEvent) {
  for (const set of hub().listeners.values()) for (const listener of set) listener(event);
}

function onNotification(payload: string | undefined) {
  if (!payload) return;
  let data: { u?: unknown; s?: ChatSignal };
  try {
    data = JSON.parse(payload);
  } catch {
    return;
  }
  if (!Array.isArray(data.u) || !data.s) return;
  for (const userId of data.u) {
    const set = hub().listeners.get(String(userId));
    if (set) for (const listener of set) listener({ kind: "signal", signal: data.s });
  }
}

/** Opens the LISTEN connection once per process; reconnects with backoff if it drops. */
function ensureListening(): Promise<void> {
  const h = hub();
  if (h.client) return Promise.resolve();
  h.connecting ??= (async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: sslConfig() });
    client.on("notification", (msg) => onNotification(msg.payload));
    client.on("error", (err) => {
      console.error("Realtime listener lost its database connection:", err.message);
      if (h.client === client) h.client = null;
      client.end().catch(() => {});
      scheduleReconnect();
    });
    try {
      await client.connect();
      await client.query(`listen ${CHANNEL}`);
      const recovered = h.attempt > 0;
      h.client = client;
      h.attempt = 0;
      // Signals sent while we were disconnected are lost; open tabs catch up from the API.
      if (recovered) broadcastAll({ kind: "resync" });
    } catch (err) {
      client.end().catch(() => {});
      console.error("Realtime listener couldn't connect:", (err as Error).message);
      scheduleReconnect();
    } finally {
      h.connecting = null;
    }
  })();
  return h.connecting;
}

function scheduleReconnect() {
  const h = hub();
  if (h.listeners.size === 0) return; // reconnects on the next subscribe
  const delay = RECONNECT_MS[Math.min(h.attempt, RECONNECT_MS.length - 1)];
  h.attempt++;
  setTimeout(() => void ensureListening(), delay).unref?.();
}

/** Registers a stream for this user. Returns the unsubscribe function. */
export async function subscribe(userId: string, listener: Listener): Promise<() => void> {
  const h = hub();
  let set = h.listeners.get(userId);
  if (!set) h.listeners.set(userId, (set = new Set()));
  set.add(listener);
  await ensureListening();
  return () => {
    set.delete(listener);
    if (set.size === 0 && h.listeners.get(userId) === set) h.listeners.delete(userId);
  };
}

/** How many streams this process holds for a user (to cap them). */
export function streamCount(userId: string): number {
  return hub().listeners.get(userId)?.size ?? 0;
}

export const sseDriver: RealtimeServerDriver = {
  mode: "sse",
  async publish(userIds, signal) {
    const unique = [...new Set(userIds)];
    // Imported lazily so this module doesn't open the pool just by loading.
    const { getPool } = await import("@/lib/db");
    for (let i = 0; i < unique.length; i += USERS_PER_NOTIFY) {
      const payload = JSON.stringify({ u: unique.slice(i, i + USERS_PER_NOTIFY), s: signal });
      await getPool().query("select pg_notify($1, $2)", [CHANNEL, payload]);
    }
  },
  async clientConfig() {
    return { mode: "sse" };
  },
};
