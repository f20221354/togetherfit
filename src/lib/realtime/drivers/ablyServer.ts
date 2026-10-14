import { Rest } from "ably";
import { userChannel, type RealtimeServerDriver } from "../types";

/**
 * Ably holds the browser connections (needed on Vercel, where functions
 * can't keep sockets open); we publish to it over HTTPS. Browsers get a
 * token that can only *subscribe* to their own `user:<id>` channel.
 */
export function createAblyDriver(key: string): RealtimeServerDriver {
  const rest = new Rest({ key });
  return {
    mode: "ably",
    async publish(userIds, signal) {
      const results = await Promise.allSettled(
        [...new Set(userIds)].map((id) => rest.channels.get(userChannel(id)).publish("chat", signal))
      );
      for (const r of results) if (r.status === "rejected") console.error("Realtime publish failed:", r.reason);
    },
    async clientConfig(userId) {
      const tokenRequest = await rest.auth.createTokenRequest({
        clientId: userId,
        capability: { [userChannel(userId)]: ["subscribe"] },
        ttl: 60 * 60 * 1000,
      });
      return { mode: "ably", tokenRequest };
    },
  };
}
