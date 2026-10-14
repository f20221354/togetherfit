"use client";

import { Realtime, type TokenRequest } from "ably";
import { isChatSignal, userChannel } from "../types";
import type { ClientDriverCallbacks } from "../client";

/** Loaded only when the server says mode is "ably", so other modes never download the Ably SDK. */
export function connectAbly(userId: string, firstToken: TokenRequest, on: ClientDriverCallbacks): () => void {
  let pendingToken: TokenRequest | null = firstToken;
  const realtime = new Realtime({
    authCallback: async (_params, callback) => {
      try {
        if (pendingToken) {
          const token = pendingToken;
          pendingToken = null;
          callback(null, token);
          return;
        }
        // Token renewal: same endpoint, which re-checks the session.
        const res = await fetch("/api/realtime/config", { cache: "no-store" });
        const config = res.ok ? await res.json() : null;
        if (config?.mode !== "ably") throw new Error("realtime is no longer Ably");
        callback(null, config.tokenRequest);
      } catch (err) {
        callback(String(err), null);
      }
    },
  });

  let wasLive = false;
  realtime.connection.on((change) => {
    if (change.current === "connected") {
      on.status("live");
      if (wasLive) on.resync();
      wasLive = true;
    } else if (change.current === "failed") {
      on.status("off");
    } else if (change.current !== "closing" && change.current !== "closed") {
      on.status("connecting");
    }
  });

  const channel = realtime.channels.get(userChannel(userId));
  // Ably couldn't guarantee continuity (e.g. a long disconnect): catch up from our API.
  channel.on("attached", (change) => {
    if (!change.resumed && wasLive) on.resync();
  });
  void channel.subscribe("chat", (message) => {
    if (isChatSignal(message.data)) on.signal(message.data);
  });

  return () => realtime.close();
}
