import type { TokenRequest } from "ably";

/**
 * How "a conversation changed" reaches open browser tabs. Set with the
 * REALTIME env var:
 *
 * - "poll": nothing pushed; browsers check for changes every few seconds.
 *           Works on any hosting, needs no extra service. The default.
 * - "ably": pushed through Ably (hosted). Needs ABLY_API_KEY. Use on Vercel.
 * - "sse":  pushed by our own server: Server-Sent Events, with Postgres
 *           LISTEN/NOTIFY carrying signals between server processes. Needs a
 *           long-running server (Docker, a VPS), not serverless functions.
 *
 * Whatever the mode, a signal only says *which* conversation changed; the
 * browser always fetches the change from our API, which checks permissions.
 */
export const REALTIME_MODES = ["poll", "ably", "sse"] as const;
export type RealtimeMode = (typeof REALTIME_MODES)[number];

/** A friend conversation (connectionId) or a group chat (groupId) changed. */
export type ChatSignal = { type: "chat"; connectionId: string } | { type: "chat"; groupId: string };

export function isChatSignal(value: unknown): value is ChatSignal {
  const v = value as Record<string, unknown> | null;
  return v?.type === "chat" && (typeof v.connectionId === "string" || typeof v.groupId === "string");
}

/** What GET /api/realtime/config tells the browser about how to listen. */
export type RealtimeClientConfig = { mode: "poll" } | { mode: "sse" } | { mode: "ably"; tokenRequest: TokenRequest };

/** Each server driver: deliver signals to users, and describe how a browser should connect. */
export interface RealtimeServerDriver {
  mode: RealtimeMode;
  publish(userIds: string[], signal: ChatSignal): Promise<void>;
  clientConfig(userId: string): Promise<RealtimeClientConfig>;
}

export const userChannel = (userId: string) => `user:${userId}`;
