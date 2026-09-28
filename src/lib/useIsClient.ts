"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Avoids the classic "mounted" useState+useEffect pattern (and its lint warnings) for SSR-safe client-only rendering. */
export function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
