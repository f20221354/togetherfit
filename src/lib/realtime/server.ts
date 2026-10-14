import { Rest } from "ably";

/**
 * Realtime delivery through Ably. Vercel Functions can't hold WebSockets
 * open, so Ably keeps the browser connections and we publish to it over
 * HTTPS.
 *
 * - Each user has one private channel, `user:<id>`. Only this server can
 *   publish to it; a browser gets a token that can only *subscribe* to its
 *   own channel.
 * - Signals carry ids only, never message text. The browser fetches the
 *   actual change from our API, which checks permissions, so chat content
 *   never passes through Ably.
 *
 * Without ABLY_API_KEY everything still works: browsers fall back to asking
 * our API for changes every few seconds.
 */

export interface ChatSignal {
  type: "chat";
  connectionId: string;
}

let rest: Rest | null = null;

function ablyClient(): Rest | null {
  const key = process.env.ABLY_API_KEY;
  if (!key) return null;
  rest ??= new Rest({ key });
  return rest;
}

export function realtimeEnabled(): boolean {
  return !!process.env.ABLY_API_KEY;
}

export const userChannel = (userId: string) => `user:${userId}`;

/** Tells each user's open tabs that a conversation changed. Never throws: the message is already saved, and clients catch up on their own. */
export async function signalUsers(userIds: string[], signal: ChatSignal): Promise<void> {
  const client = ablyClient();
  if (!client) return;
  const results = await Promise.allSettled(
    [...new Set(userIds)].map((id) => client.channels.get(userChannel(id)).publish("chat", signal))
  );
  for (const r of results) if (r.status === "rejected") console.error("Realtime publish failed:", r.reason);
}

/** A short-lived token that lets this user subscribe to their own channel and nothing else. */
export async function createUserTokenRequest(userId: string) {
  const client = ablyClient();
  if (!client) return null;
  return client.auth.createTokenRequest({
    clientId: userId,
    capability: { [userChannel(userId)]: ["subscribe"] },
    ttl: 60 * 60 * 1000,
  });
}
