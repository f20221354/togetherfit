"use client";

import { createJSONStorage, type StateStorage } from "zustand/middleware";
import type { StoreApi } from "zustand";

/**
 * Per-account storage for the app's stores (workouts, wellness, breathing,
 * camera and reminder settings). Each store's key is suffixed with the
 * signed-in user's id, so two accounts on one browser never see each other's
 * data. With nobody signed in, nothing is read or written.
 *
 * localStorage is a cache: every change is also saved to the server
 * (/api/state, a few seconds after the last edit), and signing in on a new
 * device downloads it. Each save names the server revision it was based on;
 * if another device saved first, the newer edit wins (see reconcile()).
 */
let currentUserId: string | null = null;

const scopedKey = (name: string) => `${name}:${currentUserId}`;

/** Wait this long after the last change before saving to the server. */
const PUSH_DELAY_MS = 2_000;
/** Coming back to the tab checks for changes from other devices, at most this often. */
const PULL_MIN_INTERVAL_MS = 30_000;

/** Sync bookkeeping per store: the server revision this copy is based on, and when it was last changed here without being saved. */
interface SyncMeta {
  rev: number;
  dirtyAt: number | null;
}
interface ServerState {
  data: unknown;
  revision: number;
  updatedAt: string;
}

const metaKey = (name: string) => `${scopedKey(name)}#sync`;

function readMeta(name: string): SyncMeta {
  try {
    const raw = localStorage.getItem(metaKey(name));
    if (raw) return JSON.parse(raw) as SyncMeta;
  } catch {}
  return { rev: 0, dirtyAt: null };
}

function writeMeta(name: string, meta: SyncMeta) {
  try {
    localStorage.setItem(metaKey(name), JSON.stringify(meta));
  } catch {}
}

/** True once this session's first download finished; until then, local changes wait. */
let syncReady = false;
/** The last download, so stores that load later (with their page) can catch up. */
let serverSnapshot: Record<string, ServerState> = {};
let lastPullAt = 0;
const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();
/** Set while copying the server's data in, so that write isn't treated as a local edit. */
let applyingRemote = false;

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
      // Storage full or blocked — the server copy still gets it.
    }
    if (applyingRemote) return;
    writeMeta(name, { ...readMeta(name), dirtyAt: Date.now() });
    schedulePush(name);
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
  rehydrate: () => Promise<void>;
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
  api: StoreApi<T> & { getInitialState: () => T; persist: { getOptions: () => { name?: string }; rehydrate: () => Promise<void> | void } }
) {
  const store: ScopedStore = {
    name: api.persist.getOptions().name ?? "",
    reset: () => api.setState(api.getInitialState(), true),
    rehydrate: async () => {
      await api.persist.rehydrate();
    },
  };
  stores.push(store);
  // Stores load lazily with their pages; one created after sign-in still needs the legacy hand-over and the server's copy.
  if (!currentUserId) return;
  if (adoptLegacyData(store.name)) void store.rehydrate();
  if (syncReady) void reconcile(store, serverSnapshot[store.name]);
}

/** Points every registered store at this user's saved data (or empty state when signed out). */
export function switchStorageUser(userId: string | null) {
  if (userId === currentUserId) return;
  // Reset while no user is set, so the reset isn't written into anyone's storage.
  currentUserId = null;
  syncReady = false;
  serverSnapshot = {};
  for (const timer of pushTimers.values()) clearTimeout(timer);
  pushTimers.clear();
  for (const store of stores) store.reset();
  currentUserId = userId;
  if (!userId) return;
  for (const store of stores) {
    adoptLegacyData(store.name);
    void store.rehydrate();
  }
  void pullFromServer();
}

// ---------- Server sync ----------

function schedulePush(name: string) {
  if (!syncReady) return; // the first download will push it if it's still newer
  const existing = pushTimers.get(name);
  if (existing) clearTimeout(existing);
  pushTimers.set(
    name,
    setTimeout(() => {
      pushTimers.delete(name);
      void push(name);
    }, PUSH_DELAY_MS)
  );
}

/** Copies the server's version into this browser and reloads the store from it. */
async function adopt(store: ScopedStore, state: ServerState) {
  applyingRemote = true;
  try {
    try {
      localStorage.setItem(scopedKey(store.name), JSON.stringify(state.data));
    } catch {}
    writeMeta(store.name, { rev: state.revision, dirtyAt: null });
    await store.rehydrate();
  } finally {
    applyingRemote = false;
  }
}

/** Saves this browser's copy. On a conflict the newer edit wins: ours (retry on top) or theirs (adopt it). */
async function push(name: string, attempt = 0): Promise<void> {
  const userId = currentUserId;
  if (!userId) return;
  const meta = readMeta(name);
  const raw = storage.getItem(name);
  if (meta.dirtyAt === null || typeof raw !== "string") return;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }
  const sentDirtyAt = meta.dirtyAt;
  let res: Response;
  try {
    res = await fetch(`/api/state/${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, baseRevision: meta.rev }),
    });
  } catch {
    return; // offline: still marked as changed; saved on the next pull or edit
  }
  if (currentUserId !== userId) return;
  const body = await res.json().catch(() => ({}));
  if (res.ok) {
    // Edited again while saving? Keep it marked so the newer edit is saved too.
    const latest = readMeta(name);
    const stillDirty = latest.dirtyAt !== null && latest.dirtyAt > sentDirtyAt;
    writeMeta(name, { rev: body.revision, dirtyAt: stillDirty ? latest.dirtyAt : null });
    if (stillDirty) schedulePush(name);
    return;
  }
  if (res.status === 409 && attempt < 2) {
    const current: ServerState | null = body.current ?? null;
    const store = stores.find((s) => s.name === name);
    if (current && store && Date.parse(current.updatedAt) > sentDirtyAt) {
      await adopt(store, current);
      return;
    }
    writeMeta(name, { ...readMeta(name), rev: current?.revision ?? 0 });
    await push(name, attempt + 1);
  }
}

/** Decides between this browser's copy and the server's for one store. */
async function reconcile(store: ScopedStore, server: ServerState | undefined) {
  const meta = readMeta(store.name);
  const hasLocal = typeof storage.getItem(store.name) === "string";
  if (!server) {
    // Never saved to the server (e.g. data from before sync existed): upload it.
    if (hasLocal) {
      writeMeta(store.name, { rev: 0, dirtyAt: meta.dirtyAt ?? Date.now() });
      void push(store.name);
    }
    return;
  }
  if (server.revision > meta.rev) {
    // A browser that has never synced this store (rev 0) always takes the server's copy: its
    // "edits" are just the empty starting state written before the download finished.
    const localIsNewer = meta.rev > 0 && meta.dirtyAt !== null && meta.dirtyAt > Date.parse(server.updatedAt);
    if (localIsNewer) {
      writeMeta(store.name, { rev: server.revision, dirtyAt: meta.dirtyAt });
      void push(store.name);
    } else {
      await adopt(store, server);
    }
    return;
  }
  if (meta.dirtyAt !== null) void push(store.name);
}

/** Downloads every store's server copy and reconciles it with this browser. */
async function pullFromServer() {
  const userId = currentUserId;
  if (!userId) return;
  lastPullAt = Date.now();
  let remote: Record<string, ServerState>;
  try {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) return;
    remote = (await res.json()).stores ?? {};
  } catch {
    return; // offline: work locally, try again when the tab comes back
  }
  if (currentUserId !== userId) return;
  serverSnapshot = remote;
  await Promise.all(stores.map((store) => reconcile(store, remote[store.name])));
  syncReady = true;
}

if (typeof window !== "undefined") {
  const catchUp = () => {
    if (!currentUserId || document.visibilityState !== "visible") return;
    if (Date.now() - lastPullAt < PULL_MIN_INTERVAL_MS) return;
    void pullFromServer();
  };
  document.addEventListener("visibilitychange", catchUp);
  window.addEventListener("online", catchUp);
}

/** Deletes every user-scoped key for this user (after account deletion). */
export function clearStorageForUser(userId: string) {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.endsWith(`:${userId}`) || key.endsWith(`:${userId}#sync`)) localStorage.removeItem(key);
    }
  } catch {
    // Storage blocked — nothing stored.
  }
}

/** Current user's data as this browser has it (may include changes not yet saved), for the data export. */
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
