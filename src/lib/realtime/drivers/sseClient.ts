"use client";

import { isChatSignal } from "../types";
import type { ClientDriverCallbacks } from "../client";

/**
 * REALTIME=sse: one EventSource per tab. The browser reconnects by itself
 * after a drop (and when the server ends a stream to re-check the session);
 * every "ready" after the first means signals may have been missed, so open
 * conversations catch up from the API.
 */
export function connectSse(on: ClientDriverCallbacks): () => void {
  const source = new EventSource("/api/realtime/stream");
  let wasLive = false;

  source.addEventListener("ready", () => {
    on.status("live");
    if (wasLive) on.resync();
    wasLive = true;
  });
  source.addEventListener("resync", () => on.resync());
  source.addEventListener("chat", (event) => {
    try {
      const signal: unknown = JSON.parse((event as MessageEvent<string>).data);
      if (isChatSignal(signal)) on.signal(signal);
    } catch {}
  });
  source.onerror = () => {
    // CONNECTING: retrying by itself. CLOSED: gave up (e.g. signed out, or 4xx) → callers poll.
    on.status(source.readyState === EventSource.CLOSED ? "off" : "connecting");
  };

  return () => source.close();
}
