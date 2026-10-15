import { getPool } from "@/lib/db";
import { isUuid } from "@/lib/network/friendsDb";
import { deleteProfilePhoto } from "@/lib/profile/profileDb";
import { applyStrike, liftRestriction } from "@/lib/safety/restrictions";

/**
 * The small amount of manual work left after automation: user reports, and
 * people automatic verification couldn't confirm after several tries.
 */

export interface OpenReport {
  id: string;
  category: string;
  reason: string;
  createdAt: string;
  reporter: { name: string; code: string };
  reported: {
    id: string;
    name: string;
    code: string;
    verified: boolean;
    hasPhoto: boolean;
    reportCount: number;
    strikes: number;
    restriction: { scope: "radar" | "full"; until: string | null } | null;
  };
}

export interface RestrictedUser {
  id: string;
  name: string;
  code: string;
  scope: "radar" | "full";
  until: string | null;
  reason: string | null;
  strikes: number;
}

export interface StuckUser {
  id: string;
  name: string;
  code: string;
  failedAttempts: number;
  lastAttemptAt: string;
}

export async function listOpenReports(): Promise<OpenReport[]> {
  const result = await getPool().query<{
    id: string;
    category: string;
    reason: string;
    created_at: Date;
    reporter_name: string;
    reporter_code: string;
    reported_id: string;
    reported_name: string;
    reported_code: string;
    verified: boolean;
    has_photo: boolean;
    report_count: string;
    strikes: number;
    restriction_active: boolean;
    restriction_scope: "radar" | "full" | null;
    restriction_until: Date | null;
  }>(
    `select r.id, r.category, r.reason, r.created_at,
            a.name as reporter_name, a.code as reporter_code,
            b.id as reported_id, b.name as reported_name, b.code as reported_code,
            b.verified_at is not null as verified,
            exists (select 1 from profile_photos p where p.user_id = b.id) as has_photo,
            (select count(*) from reports x where x.reported_id = b.id) as report_count,
            b.strikes, coalesce(b.restricted_until > now(), false) as restriction_active, b.restriction_scope,
            case when b.restricted_until = 'infinity' then null else b.restricted_until end as restriction_until
     from reports r
     join app_users a on a.id = r.reporter_id
     join app_users b on b.id = r.reported_id
     where r.resolved_at is null
     order by report_count desc, r.created_at asc
     limit 100`
  );
  return result.rows.map((r) => ({
    id: r.id,
    category: r.category,
    reason: r.reason,
    createdAt: r.created_at.toISOString(),
    reporter: { name: r.reporter_name, code: r.reporter_code },
    reported: {
      id: r.reported_id,
      name: r.reported_name,
      code: r.reported_code,
      verified: r.verified,
      hasPhoto: r.has_photo,
      reportCount: Number(r.report_count),
      strikes: r.strikes,
      restriction:
        r.restriction_active && r.restriction_scope
          ? { scope: r.restriction_scope, until: r.restriction_until?.toISOString() ?? null }
          : null,
    },
  }));
}

/** Not verified, and 3+ unsuccessful automatic attempts in the last week. */
export async function listStuckUsers(): Promise<StuckUser[]> {
  const result = await getPool().query<{ id: string; name: string; code: string; failed: string; last_at: Date }>(
    `select u.id, u.name, u.code, count(*) as failed, max(v.created_at) as last_at
     from verification_attempts v join app_users u on u.id = v.user_id
     where v.status <> 'verified' and v.created_at > now() - interval '7 days' and u.verified_at is null
     group by u.id having count(*) >= 3
     order by last_at desc
     limit 100`
  );
  return result.rows.map((r) => ({ id: r.id, name: r.name, code: r.code, failedAttempts: Number(r.failed), lastAttemptAt: r.last_at.toISOString() }));
}

export const REPORT_ACTIONS = ["dismiss", "remove_photo", "revoke_verification", "restrict"] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];

/**
 * Applies the action to the reported user and closes every open report about them.
 * - dismiss: also lifts an automatic Find a Friend restriction (it was waiting on this review).
 * - restrict: next step on the 7 days → 30 days → permanent ladder.
 */
export async function resolveReport(reportId: string, action: ReportAction, adminId: string): Promise<boolean> {
  if (!isUuid(reportId)) return false;
  const pool = getPool();
  const found = await pool.query<{ reported_id: string }>("select reported_id from reports where id = $1", [reportId]);
  const reportedId = found.rows[0]?.reported_id;
  if (!reportedId) return false;
  if (action === "remove_photo") await deleteProfilePhoto(reportedId);
  if (action === "revoke_verification") await pool.query("update app_users set verified_at = null where id = $1", [reportedId]);
  if (action === "restrict") await applyStrike(reportedId, "Restricted by a moderator after reviewing reports.");
  if (action === "dismiss") {
    await pool.query(
      `update app_users set restricted_until = null, restriction_scope = null, restriction_reason = null
       where id = $1 and restriction_scope = 'radar'`,
      [reportedId]
    );
  }
  await pool.query(
    "update reports set resolved_at = now(), resolution = $2 where reported_id = $1 and resolved_at is null",
    [reportedId, `${action === "dismiss" ? "dismissed" : action} by ${adminId}`]
  );
  return true;
}

export const USER_ACTIONS = ["allow_retry", "mark_verified", "lift_restriction"] as const;
export type UserAction = (typeof USER_ACTIONS)[number];

/**
 * allow_retry: lets someone try automatic verification again today.
 * mark_verified: only after checking them some other way (e.g. a video call).
 */
export async function applyUserAction(userId: string, action: UserAction, adminId: string): Promise<boolean> {
  if (!isUuid(userId)) return false;
  const pool = getPool();
  if (action === "lift_restriction") {
    await liftRestriction(userId);
    return true;
  }
  if (action === "allow_retry") {
    await pool.query("delete from rate_limits where key = $1", [`verify-selfie:${userId}`]);
    // Older failures stop counting towards "stuck", so they leave the list.
    await pool.query("delete from verification_attempts where user_id = $1 and status <> 'verified'", [userId]);
    return true;
  }
  const updated = await pool.query("update app_users set verified_at = now() where id = $1", [userId]);
  await pool.query(
    "insert into verification_attempts (user_id, provider, status, reason) values ($1, 'manual', 'verified', $2)",
    [userId, `approved by ${adminId}`]
  );
  return (updated.rowCount ?? 0) > 0;
}

/** Admins can see any photo, to review reports. */
export async function getPhotoForAdmin(userId: string, size: "small" | "large"): Promise<Buffer | null> {
  if (!isUuid(userId)) return null;
  const result = await getPool().query<{ data: Buffer }>(
    "select case when $2 = 'small' then small else large end as data from profile_photos where user_id = $1",
    [userId, size]
  );
  return result.rows[0]?.data ?? null;
}

/** Everyone currently restricted, newest first. */
export async function listRestricted(): Promise<RestrictedUser[]> {
  const result = await getPool().query<{
    id: string;
    name: string;
    code: string;
    restriction_scope: "radar" | "full";
    until: Date | null;
    restriction_reason: string | null;
    strikes: number;
  }>(
    `select id, name, code, restriction_scope, restriction_reason, strikes,
            case when restricted_until = 'infinity' then null else restricted_until end as until
     from app_users
     where restricted_until > now() and restriction_scope is not null
     order by restricted_until desc
     limit 100`
  );
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    scope: r.restriction_scope,
    until: r.until?.toISOString() ?? null,
    reason: r.restriction_reason,
    strikes: r.strikes,
  }));
}
