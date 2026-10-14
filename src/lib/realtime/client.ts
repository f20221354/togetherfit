"use client";

import { useEffect, useRef } from "react";
import { create } from "zustand";
import type { Realtime, TokenRequest } from "ably";
import { useCurrentUser } from "@/lib/auth/authStore";

/**
 * One Ably connection per signed-in browser tab, listening on the user's own
 * channel. Components don't talk to Ably directly: they subscribe to
 * "conversation X changed" and "we reconnected" through the hooks below.
 *
 * status:
 * - "off":       realtime isn't configured on the server (or failed) → callers poll for changes instead
 * - "connecting" / "live": the connection is coming up / delivering signals
 */
type Status = "off" | "connecting" | "live";

export interface ChatSignal {
  type: "chat";
  connectionId: string;
}

const useRealtimeStore = create<{ status: Status }>(() => ({ status: "off" }));

const signalListeners = new Set<(signal: ChatSignal) => void>();
const resyncListeners = new Set<() => void>();

let client: Realtime | null = null;
let clientUserId: string | null = null;

function notifyResync() {
  for (const listener of resyncListeners) listener();
}

async function start(userId: string) {
  if (clientUserId === userId) return;
  stop();
  clientUserId = userId;

  // Ask first, so a server without ABLY_API_KEY costs one request, not an Ably SDK download.
  const probe = await fetch("/api/realtime/token", { cache: "no-store" }).catch(() => null);
  if (!probe?.ok || clientUserId !== userId) return;

  useRealtimeStore.setState({ status: "connecting" });
  const { Realtime } = await import("ably");
  if (clientUserId !== userId) return;

  // The probe already returned a signed token request; use it for the first connection.
  let firstToken: TokenRequest | null = await probe.json();
  const realtime = new Realtime({
    authCallback: async (_params, callback) => {
      try {
        if (firstToken) {
          const token = firstToken;
          firstToken = null;
          callback(null, token);
          return;
        }
        const res = await fetch("/api/realtime/token", { cache: "no-store" });
        if (!res.ok) throw new Error(`token ${res.status}`);
        callback(null, await res.json());
      } catch (err) {
        callback(String(err), null);
      }
    },
  });
  client = realtime;

  let wasLive = false;
  realtime.connection.on((change) => {
    if (change.current === "connected") {
      useRealtimeStore.setState({ status: "live" });
      // Anything sent while we were away is fetched from our API.
      if (wasLive) notifyResync();
      wasLive = true;
    } else if (change.current === "failed") {
      useRealtimeStore.setState({ status: "off" });
    } else if (change.current !== "closing" && change.current !== "closed") {
      useRealtimeStore.setState({ status: "connecting" });
    }
  });

  const channel = realtime.channels.get(`user:${userId}`);
  // Ably couldn't guarantee continuity on this channel (e.g. a long disconnect): catch up from our API.
  channel.on("attached", (change) => {
    if (!change.resumed && wasLive) notifyResync();
  });
  await channel.subscribe("chat", (message) => {
    const signal = message.data as ChatSignal;
    if (signal?.type === "chat" && typeof signal.connectionId === "string") {
      for (const listener of signalListeners) listener(signal);
    }
  });
}

function stop() {
  clientUserId = null;
  client?.close();
  client = null;
  useRealtimeStore.setState({ status: "off" });
}

/** Mounted once in the app shell: connects for the signed-in user, disconnects on logout. */
export function useRealtimeConnection() {
  const userId = useCurrentUser()?.id;
  useEffect(() => {
    if (!userId) return;
    void start(userId).catch(() => useRealtimeStore.setState({ status: "off" }));
    return stop;
  }, [userId]);
}

export function useRealtimeStatus(): Status {
  return useRealtimeStore((s) => s.status);
}

/**
 * Calls `onChange` when a conversation changes (realtime signal) and when the
 * browser comes back after being offline or hidden (so it can catch up).
 */
export function useChatSignals(onChange: (signal: ChatSignal | null) => void) {
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });

  useEffect(() => {
    const onSignal = (signal: ChatSignal) => latest.current(signal);
    const onResync = () => latest.current(null);
    const onVisible = () => {
      if (document.visibilityState === "visible") onResync();
    };
    signalListeners.add(onSignal);
    resyncListeners.add(onResync);
    window.addEventListener("online", onResync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      signalListeners.delete(onSignal);
      resyncListeners.delete(onResync);
      window.removeEventListener("online", onResync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
