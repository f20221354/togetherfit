"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { registerUserScopedStore, userScopedStorage } from "./userScopedStorage";

interface PreferencesState {
  wellnessReminders: boolean;
  setWellnessReminders: (on: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      wellnessReminders: true,
      setWellnessReminders: (wellnessReminders) => set({ wellnessReminders }),
    }),
    { name: "vitaos-preferences-store", storage: userScopedStorage }
  )
);

registerUserScopedStore(usePreferencesStore);
