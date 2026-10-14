import { getPool } from "@/lib/db";
import { isUuid } from "@/lib/network/friendsDb";
import { mutualMatchSql } from "@/lib/trust/matching";
import type { VerificationDecision } from "@/lib/trust/types";

export const GENDERS = ["woman", "man", "nonbinary"] as const;
export type Gender = (typeof GENDERS)[number];
export const MATCH_PREFERENCES = ["anyone", "women", "men"] as const;
export type MatchPreference = (typeof MATCH_PREFERENCES)[number];

const GENDER_CHANGE_DAYS = 30;

export interface Profile {
  gender: Gender | null;
  matchPreference: MatchPreference;
  verifiedOnly: boolean;
  photoOnRadar: boolean;
  photoId: string | null;
  verifiedAt: string | null;
  /** When gender can next be changed (null = now). */
  genderLockedUntil: string | null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const result = await getPool().query<{
    gender: Gender | null;
    match_preference: MatchPreference;
    verified_only: boolean;
    photo_on_radar: boolean;
    photo_id: string | null;
    verified_at: Date | null;
    locked_until: Date | null;
  }>(
    `select u.gender, u.match_preference, u.verified_only, u.photo_on_radar, p.id as photo_id, u.verified_at,
            case when u.gender_changed_at > now() - make_interval(days => $2)
                 then u.gender_changed_at + make_interval(days => $2) end as locked_until
     from app_users u left join profile_photos p on p.user_id = u.id
     where u.id = $1`,
    [userId, GENDER_CHANGE_DAYS]
  );
  const r = result.rows[0];
  if (!r) return null;
  return {
    gender: r.gender,
    matchPreference: r.match_preference,
    verifiedOnly: r.verified_only,
    photoOnRadar: r.photo_on_radar,
    photoId: r.photo_id,
    verifiedAt: r.verified_at?.toISOString() ?? null,
    genderLockedUntil: r.locked_until?.toISOString() ?? null,
  };
}

export interface ProfilePatch {
  gender?: Gender | null;
  matchPreference?: MatchPreference;
  verifiedOnly?: boolean;
  photoOnRadar?: boolean;
}

export type UpdateResult = { ok: true; profile: Profile } | { ok: false; error: string };

/**
 * Saves profile settings. Gender may change at most once every 30 days
 * (setting it for the very first time is always allowed), so nobody can flip
 * it to get into women-only or men-only matching.
 */
export async function updateProfile(userId: string, patch: ProfilePatch): Promise<UpdateResult> {
  const current = await getProfile(userId);
  if (!current) return { ok: false, error: "Account not found" };

  const sets: string[] = [];
  const values: unknown[] = [userId];
  const set = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (patch.gender !== undefined && patch.gender !== current.gender) {
    if (current.genderLockedUntil) {
      const until = new Date(current.genderLockedUntil).toLocaleDateString("en-IN", { day: "numeric", month: "long" });
      return { ok: false, error: `You can change your gender again after ${until}.` };
    }
    set("gender", patch.gender);
    sets.push("gender_changed_at = now()");
  }
  if (patch.matchPreference !== undefined) set("match_preference", patch.matchPreference);
  if (patch.verifiedOnly !== undefined) set("verified_only", patch.verifiedOnly);
  if (patch.photoOnRadar !== undefined) set("photo_on_radar", patch.photoOnRadar);

  if (sets.length > 0) await getPool().query(`update app_users set ${sets.join(", ")} where id = $1`, values);
  return { ok: true, profile: (await getProfile(userId)) as Profile };
}

/** Replaces the user's photo. A new photo means a new id (so old links stop working) and removes the ✓ badge until re-verified. */
export async function saveProfilePhoto(userId: string, large: Buffer, small: Buffer): Promise<string> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("delete from profile_photos where user_id = $1", [userId]);
    const inserted = await client.query<{ id: string }>(
      "insert into profile_photos (user_id, large, small) values ($1, $2, $3) returning id",
      [userId, large, small]
    );
    await client.query("update app_users set verified_at = null where id = $1", [userId]);
    await client.query("commit");
    return inserted.rows[0].id;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteProfilePhoto(userId: string): Promise<void> {
  const pool = getPool();
  await pool.query("delete from profile_photos where user_id = $1", [userId]);
  await pool.query("update app_users set verified_at = null where id = $1", [userId]);
}

export async function getOwnPhotoLarge(userId: string): Promise<Buffer | null> {
  const result = await getPool().query<{ large: Buffer }>("select large from profile_photos where user_id = $1", [userId]);
  return result.rows[0]?.large ?? null;
}

/**
 * A photo, if this viewer may see it (Option A):
 * - the owner;
 * - accepted friends;
 * - people who could see the owner on Find a Friend right now, only if the
 *   owner turned on "show my photo on Find a Friend".
 * Never across a block.
 */
export async function getPhotoForViewer(photoId: string, viewerId: string, size: "small" | "large"): Promise<Buffer | null> {
  if (!isUuid(photoId)) return null;
  const result = await getPool().query<{ data: Buffer }>(
    `select case when $3 = 'small' then p.small else p.large end as data
     from profile_photos p
     join app_users o on o.id = p.user_id
     join app_users v on v.id = $2
     where p.id = $1
       and not exists (
         select 1 from connections c where c.status = 'blocked'
           and ((c.requester_id = o.id and c.receiver_id = v.id) or (c.requester_id = v.id and c.receiver_id = o.id)))
       and (
         o.id = v.id
         or exists (
           select 1 from connections c where c.status = 'accepted'
             and ((c.requester_id = o.id and c.receiver_id = v.id) or (c.requester_id = v.id and c.receiver_id = o.id)))
         or (o.photo_on_radar and ${mutualMatchSql("o", "v")} and exists (
           select 1 from activity_intents a join activity_intents b on b.sport = a.sport
           where a.user_id = o.id and a.status = 'active' and a.hidden = false
             and b.user_id = v.id and b.status = 'active'))
       )`,
    [photoId, viewerId, size]
  );
  return result.rows[0]?.data ?? null;
}

/** Stores the decision (scores only, never images). A pass sets the ✓ badge. */
export async function recordVerification(
  userId: string,
  provider: string,
  decision: VerificationDecision,
  scores: { liveness: number; similarity: number },
  reason: string | null
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `insert into verification_attempts (user_id, provider, status, liveness_confidence, similarity, reason)
     values ($1, $2, $3, $4, $5, $6)`,
    [userId, provider, decision, scores.liveness, scores.similarity, reason]
  );
  if (decision === "verified") await pool.query("update app_users set verified_at = now() where id = $1", [userId]);
}
