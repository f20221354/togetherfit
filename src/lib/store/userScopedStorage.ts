"use client";

import { createJSONStorage, type StateStorage } from "zustand/middleware";
import type { StoreApi } from "zustand";

/**
 * Per-account localStorage for the client-only stores (workouts, wellness,
 * breathing, camera and reminder settings). Each store's key is suffixed with
 * the signed-in user's id, so two accounts on one browser never see each
 * other's data. With nobody signed in, nothing is read or written.
 */
let currentUserId: string | null = null;

const scopedKey = (name: string) => `${name}:${currentUserId}`;

const storage: StateStorage = {
  getItem: (name) => {
    if (!currentUserId) return null;
    try {
      return localStorage.getItem(scopedKey(name));
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (!currentUserId) return;
    try {
      localStorage.setItem(scopedKey(name), value);
    } catch {
      // Storage full or blocked — the data just won't survive a reload.
    }
  },
  removeItem: (name) => {
    if (!currentUserId) return;
    try {
      localStorage.removeItem(scopedKey(name));
    } catch {
      // Nothing to clean up.
    }
  },
};

export const userScopedStorage = createJSONStorage(() => storage);

interface ScopedStore {
  name: string;
  reset: () => void;
  rehydrate: () => void;
}

const stores: ScopedStore[] = [];

/**
 * Before accounts were scoped, data was saved under the bare key. The first
 * account to sign in on this browser inherits it (it was almost certainly
 * theirs); then the bare key is removed so nobody else can.
 */
function adoptLegacyData(name: string): boolean {
  try {
    const legacy = localStorage.getItem(name);
    if (legacy === null) return false;
    if (localStorage.getItem(scopedKey(name)) === null) localStorage.setItem(scopedKey(name), legacy);
    localStorage.removeItem(name);
    return true;
  } catch {
    return false; // Storage blocked — nothing to migrate.
  }
}

/** Each user-scoped store registers itself so it can be swapped on login/logout. */
export function registerUserScopedStore<T>(
  api: StoreApi<T> & { getInitialState: () => T; persist: { getOptions: () => { name?: string }; rehydrate: () => unknown } }
) {
  const store: ScopedStore = {
    name: api.persist.getOptions().name ?? "",
    reset: () => api.setState(api.getInitialState(), true),
    rehydrate: () => void api.persist.rehydrate(),
  };
  stores.push(store);
  // Stores load lazily with their pages; one created after sign-in still needs the legacy hand-over.
  if (currentUserId && adoptLegacyData(store.name)) store.rehydrate();
}

/** Points every registered store at this user's saved data (or empty state when signed out). */
export function switchStorageUser(userId: string | null) {
  if (userId === currentUserId) return;
  // Reset while no user is set, so the reset isn't written into anyone's storage.
  currentUserId = null;
  for (const store of stores) store.reset();
  currentUserId = userId;
  if (!userId) return;
  for (const store of stores) {
    adoptLegacyData(store.name);
    store.rehydrate();
  }
}

/** Deletes every user-scoped key for this user (after account deletion). */
export function clearStorageForUser(userId: string) {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.endsWith(`:${userId}`)) localStorage.removeItem(key);
    }
  } catch {
    // Storage blocked — nothing stored.
  }
}

/** Current user's local data, for the data export. */
export function exportUserScopedData(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { name } of stores) {
    const raw = storage.getItem(name);
    if (typeof raw === "string") {
      try {
        out[name] = JSON.parse(raw);
      } catch {
        // Corrupt entry — skip it.
      }
    }
  }
  return out;
}
