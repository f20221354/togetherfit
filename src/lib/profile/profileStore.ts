"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useCurrentUser } from "@/lib/auth/authStore";
import { uploadProfilePhoto } from "./photoUpload";

/** Mirrors Profile in src/lib/profile/profileDb.ts. */
export interface MyProfile {
  gender: "woman" | "man" | "nonbinary" | null;
  matchPreference: "anyone" | "women" | "men";
  verifiedOnly: boolean;
  photoOnRadar: boolean;
  photoId: string | null;
  verifiedAt: string | null;
  genderLockedUntil: string | null;
}

export type ProfilePatch = Partial<Pick<MyProfile, "gender" | "matchPreference" | "verifiedOnly" | "photoOnRadar">>;
type Result = { ok: true } | { ok: false; error: string };

interface ProfileState {
  userId: string | null;
  profile: MyProfile | null;
  verificationAvailable: boolean;
  error: string | null;
  load: (userId: string) => Promise<void>;
  reload: () => Promise<void>;
  save: (patch: ProfilePatch) => Promise<Result>;
  uploadPhoto: (blob: Blob) => Promise<Result>;
  removePhoto: () => Promise<void>;
}

/**
 * The signed-in user's own profile, shared by the sidebar, the "Me" tab, the
 * profile page and Settings, so it's fetched once and a change (new photo,
 * ✓ badge) shows everywhere at once.
 */
const useProfileStore = create<ProfileState>()((set, get) => ({
  userId: null,
  profile: null,
  verificationAvailable: false,
  error: null,

  load: async (userId) => {
    set({ userId, profile: null, error: null });
    try {
      const data = await fetch("/api/profile", { cache: "no-store" }).then((r) => r.json());
      if (get().userId !== userId) return;
      if (data.ok) set({ profile: data.profile, verificationAvailable: data.verificationAvailable });
      else set({ error: data.error ?? "Couldn't load your profile." });
    } catch {
      if (get().userId === userId) set({ error: "Couldn't load your profile." });
    }
  },

  reload: async () => {
    const { userId, load } = get();
    if (userId) await load(userId);
  },

  save: async (patch) => {
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!data.ok) return { ok: false, error: data.error ?? "Couldn't save. Please try again." };
      set({ profile: data.profile });
      return { ok: true };
    } catch {
      return { ok: false, error: "Can't reach togetherfit. Check your connection." };
    }
  },

  uploadPhoto: async (blob) => {
    const result = await uploadProfilePhoto(blob);
    if (!result.ok) return result;
    await get().reload();
    return { ok: true };
  },

  removePhoto: async () => {
    await fetch("/api/profile/photo", { method: "DELETE" }).catch(() => null);
    await get().reload();
  },
}));

/** The current user's profile, loaded on first use and reloaded when the account changes. */
export function useMyProfile() {
  const userId = useCurrentUser()?.id;
  const state = useProfileStore();
  useEffect(() => {
    if (userId && useProfileStore.getState().userId !== userId) void useProfileStore.getState().load(userId);
  }, [userId]);
  return state.userId === userId ? state : { ...state, profile: null };
}
