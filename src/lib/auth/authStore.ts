"use client";

import { create } from "zustand";

/**
 * Client view of the server session. The session itself lives in an
 * httpOnly cookie and the database (src/lib/auth/server/session.ts); this
 * store only caches GET /api/auth/me so components can render the user.
 */
export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  code: string;
  onboardingComplete: boolean;
}

export interface WellnessSetupPrefs {
  wakeTime?: string;
  sleepTime?: string;
  workDurationHours?: number;
  preferredWalkMinutes?: number;
}

interface AuthState {
  user: CurrentUser | null;
  /** True once /api/auth/me has answered at least once. */
  loaded: boolean;
  refresh: () => Promise<CurrentUser | null>;
  setUser: (user: CurrentUser | null) => void;
  logOut: () => Promise<void>;
  completeOnboarding: (prefs: WellnessSetupPrefs, cameraAllowed: boolean) => Promise<boolean>;
}

let inflight: Promise<CurrentUser | null> | null = null;

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  loaded: false,

  refresh: () => {
    inflight ??= fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data: { user: CurrentUser | null }) => {
        set({ user: data.user ?? null, loaded: true });
        return data.user ?? null;
      })
      .catch(() => {
        set({ loaded: true });
        return get().user;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  },

  setUser: (user) => set({ user, loaded: true }),

  logOut: async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    set({ user: null, loaded: true });
  },

  completeOnboarding: async (prefs, cameraAllowed) => {
    const res = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wellnessSetup: { ...prefs, cameraAllowed } }),
    }).catch(() => null);
    if (!res?.ok) return false;
    const user = get().user;
    if (user) set({ user: { ...user, onboardingComplete: true } });
    return true;
  },
}));

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}

/** True once the session has been checked with the server. */
export function useAuthHydrated() {
  return useAuthStore((s) => s.loaded);
}

// The old client-only auth kept accounts and password hashes in localStorage.
// Remove that copy now that accounts live on the server.
if (typeof window !== "undefined") {
  try {
    window.localStorage.removeItem("vitaos-auth-store");
  } catch {
    // Storage unavailable (private mode) — nothing to clean up.
  }
}
