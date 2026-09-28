"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { hashPassword } from "./hash";

export interface WellnessSetupPrefs {
  wakeTime?: string;
  sleepTime?: string;
  workDurationHours?: number;
  preferredWalkMinutes?: number;
}

interface StoredUser {
  name: string;
  email: string;
  passwordHash: string;
}

interface AuthState {
  users: StoredUser[];
  currentUserEmail: string | null;
  onboardingComplete: Record<string, boolean>;
  wellnessSetup: Record<string, WellnessSetupPrefs>;
  cameraPermissionAcknowledged: Record<string, boolean>;

  signUp: (name: string, email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logOut: () => void;
  completeOnboarding: (email: string, prefs: WellnessSetupPrefs, cameraAllowed: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserEmail: null,
      onboardingComplete: {},
      wellnessSetup: {},
      cameraPermissionAcknowledged: {},

      signUp: async (name, email, password) => {
        const normalized = email.trim().toLowerCase();
        if (get().users.some((u) => u.email === normalized)) {
          return { ok: false, error: "An account with this email already exists." };
        }
        const passwordHash = await hashPassword(password, normalized);
        set((state) => ({
          users: [...state.users, { name, email: normalized, passwordHash }],
          currentUserEmail: normalized,
        }));
        return { ok: true };
      },

      logIn: async (email, password) => {
        const normalized = email.trim().toLowerCase();
        const user = get().users.find((u) => u.email === normalized);
        if (!user) {
          return { ok: false, error: "Invalid email or password." };
        }
        const passwordHash = await hashPassword(password, normalized);
        if (passwordHash !== user.passwordHash) {
          return { ok: false, error: "Invalid email or password." };
        }
        set({ currentUserEmail: normalized });
        return { ok: true };
      },

      logOut: () => set({ currentUserEmail: null }),

      completeOnboarding: (email, prefs, cameraAllowed) =>
        set((state) => ({
          onboardingComplete: { ...state.onboardingComplete, [email]: true },
          wellnessSetup: { ...state.wellnessSetup, [email]: prefs },
          cameraPermissionAcknowledged: {
            ...state.cameraPermissionAcknowledged,
            [email]: cameraAllowed,
          },
        })),
    }),
    { name: "vitaos-auth-store" }
  )
);

export function useCurrentUser() {
  const currentUserEmail = useAuthStore((s) => s.currentUserEmail);
  const users = useAuthStore((s) => s.users);
  return users.find((u) => u.email === currentUserEmail) ?? null;
}

/** True once the persisted auth state has been read back from localStorage. */
export function useAuthHydrated() {
  return useSyncExternalStore(
    (onChange) => useAuthStore.persist.onFinishHydration(onChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false
  );
}
