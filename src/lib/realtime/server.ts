import { reportError } from "@/lib/observability/report";
import { createAblyDriver } from "./drivers/ablyServer";
import { pollDriver } from "./drivers/pollServer";
import { sseDriver } from "./drivers/sseServer";
import { REALTIME_MODES, type ChatSignal, type RealtimeMode, type RealtimeServerDriver } from "./types";

/**
 * Picks the realtime driver from REALTIME (see types.ts). A misconfiguration
 * never breaks chat: it falls back to "poll" and says why in the server log.
 */
let driver: RealtimeServerDriver | null = null;

function resolveDriver(): RealtimeServerDriver {
  const raw = (process.env.REALTIME ?? "poll").trim().toLowerCase();
  if (!REALTIME_MODES.includes(raw as RealtimeMode)) {
    console.warn(`REALTIME="${raw}" is not one of ${REALTIME_MODES.join(", ")} — using "poll".`);
    return pollDriver;
  }
  if (raw === "ably") {
    const key = process.env.ABLY_API_KEY;
    if (!key) {
      console.warn('REALTIME="ably" but ABLY_API_KEY is not set — using "poll".');
      return pollDriver;
    }
    return createAblyDriver(key);
  }
  if (raw === "sse") return sseDriver;
  return pollDriver;
}

export function realtime(): RealtimeServerDriver {
  driver ??= resolveDriver();
  return driver;
}

/** Tells each user's open tabs that a conversation changed. Never throws: the change is already saved and clients catch up on their own. */
export async function signalUsers(userIds: string[], signal: ChatSignal): Promise<void> {
  try {
    await realtime().publish(userIds, signal);
  } catch (err) {
    reportError(err, { where: "realtime publish" });
  }
}

/** How this user's browser should listen (and, for Ably, a fresh subscribe-only token). */
export function realtimeClientConfig(userId: string) {
  return realtime().clientConfig(userId);
}
