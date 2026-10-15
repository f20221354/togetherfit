import { getPool } from "@/lib/db";

/**
 * Server copy of the browser stores (wellness, workouts and goals, breathing,
 * settings). Each is one JSON document with a revision number; saves must
 * name the revision they were based on (optimistic concurrency).
 */

/** The persisted store names (see src/lib/store/*). Anything else is refused. */
export const SYNCED_STORES = [
  "vitaos-wellness-store",
  "vitaos-move-store",
  "vitaos-breathing-store",
  "vitaos-preferences-store",
  "vitaos-camera-store",
] as const;
export type SyncedStore = (typeof SYNCED_STORES)[number];

export const MAX_STORE_BYTES = 256 * 1024;

export function isSyncedStore(name: string): name is SyncedStore {
  return (SYNCED_STORES as readonly string[]).includes(name);
}

export interface StoredState {
  data: unknown;
  revision: number;
  updatedAt: string;
}

export async function getAllState(userId: string): Promise<Record<string, StoredState>> {
  const result = await getPool().query<{ store: string; data: unknown; revision: number; updated_at: Date }>(
    "select store, data, revision, updated_at from user_app_state where user_id = $1",
    [userId]
  );
  return Object.fromEntries(result.rows.map((r) => [r.store, { data: r.data, revision: r.revision, updatedAt: r.updated_at.toISOString() }]));
}

export type PutResult = { ok: true; revision: number; updatedAt: string } | { ok: false; current: StoredState | null };

/** Saves if the server is still at `baseRevision` (0 = nothing saved yet); otherwise returns what's there now. */
export async function putState(userId: string, store: SyncedStore, data: unknown, baseRevision: number): Promise<PutResult> {
  const pool = getPool();
  const json = JSON.stringify(data);
  const saved =
    baseRevision === 0
      ? await pool.query<{ revision: number; updated_at: Date }>(
          `insert into user_app_state (user_id, store, data) values ($1, $2, $3::jsonb)
           on conflict (user_id, store) do nothing returning revision, updated_at`,
          [userId, store, json]
        )
      : await pool.query<{ revision: number; updated_at: Date }>(
          `update user_app_state set data = $3::jsonb, revision = revision + 1, updated_at = now()
           where user_id = $1 and store = $2 and revision = $4 returning revision, updated_at`,
          [userId, store, json, baseRevision]
        );
  const row = saved.rows[0];
  if (row) return { ok: true, revision: row.revision, updatedAt: row.updated_at.toISOString() };
  const current = await pool.query<{ data: unknown; revision: number; updated_at: Date }>(
    "select data, revision, updated_at from user_app_state where user_id = $1 and store = $2",
    [userId, store]
  );
  const c = current.rows[0];
  return { ok: false, current: c ? { data: c.data, revision: c.revision, updatedAt: c.updated_at.toISOString() } : null };
}
