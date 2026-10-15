"use client";

import { useEffect, useRef } from "react";
import { create } from "zustand";
import { useCurrentUser } from "@/lib/auth/authStore";
import type { ChatSignal, RealtimeClientConfig } from "./types";

export type { ChatSignal } from "./types";

/**
 * One realtime connection per signed-in browser tab, whichever mode the
 * server is configured for (REALTIME, see types.ts). Components never see the
 * mode: they subscribe to "conversation X changed" and "we reconnected"
 * through the hooks below.
 *
 * status:
 * - "off":        nothing pushed (poll mode, or the connection failed) → callers check for changes on a timer
 * - "connecting": coming up / reconnecting
 * - "live":       signals are being delivered → callers only keep a slow safety-net timer
 */
type Status = "off" | "connecting" | "live";

/** What a client driver reports back. Each driver lives in ./drivers/<mode>Client.ts. */
export interface ClientDriverCallbacks {
  signal: (signal: ChatSignal) => void;
  resync: () => void;
  status: (status: Status) => void;
}

const useRealtimeStore = create<{ status: Status }>(() => ({ status: "off" }));

const signalListeners = new Set<(signal: ChatSignal) => void>();
const resyncListeners = new Set<() => void>();

let disconnect: (() => void) | null = null;
let activeUserId: string | null = null;

const callbacks: ClientDriverCallbacks = {
  signal: (signal) => {
    for (const listener of signalListeners) listener(signal);
  },
  resync: () => {
    for (const listener of resyncListeners) listener();
  },
  status: (status) => useRealtimeStore.setState({ status }),
};

async function start(userId: string) {
  if (activeUserId === userId) return;
  stop();
  activeUserId = userId;

  const res = await fetch("/api/realtime/config", { cache: "no-store" }).catch(() => null);
  const config: RealtimeClientConfig | null = res?.ok ? await res.json() : null;
  if (!config || activeUserId !== userId) return;

  switch (config.mode) {
    case "ably": {
      callbacks.status("connecting");
      const { connectAbly } = await import("./drivers/ablyClient");
      if (activeUserId !== userId) return;
      disconnect = connectAbly(userId, config.tokenRequest, callbacks);
      break;
    }
    case "sse": {
      callbacks.status("connecting");
      const { connectSse } = await import("./drivers/sseClient");
      if (activeUserId !== userId) return;
      disconnect = connectSse(callbacks);
      break;
    }
    case "poll":
    default:
      // Nothing to connect to; useConversation & co. check for changes on their timers.
      break;
  }
}

function stop() {
  activeUserId = null;
  disconnect?.();
  disconnect = null;
  callbacks.status("off");
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
