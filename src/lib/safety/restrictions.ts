import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

/**
 * What happens after reports. One report never bans anyone (that would let
 * people get others banned out of spite); it always blocks the two people
 * from each other, though.
 *
 * - Serious categories (felt unsafe, harassment/threats): hidden from Find a
 *   Friend right away ("radar" restriction) while an admin reviews.
 * - Reports from 3+ "points" of different people within 30 days: a full
 *   restriction. Each reporter counts 1, +0.5 if verified, +0.5 if their
 *   account is over a week old; someone whose reports keep getting dismissed
 *   counts only 0.25.
 * - Escalation: 1st full restriction 7 days, 2nd 30 days, 3rd permanent.
 *
 * Restricted people can still sign in, see why, export their data and appeal.
 */

export type RestrictionScope = "radar" | "full";

export interface Restriction {
  scope: RestrictionScope;
  /** ISO time it ends, or null when permanent. */
  until: string | null;
  reason: string;
}

const WINDOW_DAYS = 30;
const THRESHOLD = 3;
const SERIOUS = new Set(["safety", "harassment"]);
const RADAR_REVIEW_DAYS = 7;

const MESSAGES: Record<RestrictionScope, string> = {
  radar: "Your account is hidden from Find a Friend while we review a safety report.",
  full: "Your account is restricted after reports from other members.",
};

/**
 * Weighted number of different people who reported this user recently.
 * Only reports nobody has acted on yet count: dismissed ones don't, and
 * ones that already led to a restriction are used up.
 */
async function reportScore(userId: string): Promise<number> {
  const result = await getPool().query<{ score: string | null }>(
    `select sum(w) as score from (
       select distinct on (r.reporter_id) r.reporter_id,
         case
           when (select count(*) from reports d
                 where d.reporter_id = r.reporter_id and d.resolution like 'dismiss%'
                   and d.resolved_at > now() - interval '90 days') >= 2 then 0.25
           else 1
             + case when a.verified_at is not null then 0.5 else 0 end
             + case when a.created_at < now() - interval '7 days' then 0.5 else 0 end
         end as w
       from reports r join app_users a on a.id = r.reporter_id
       where r.reported_id = $1
         and r.created_at > now() - make_interval(days => $2)
         and r.resolution is null
       order by r.reporter_id
     ) per_reporter`,
    [userId, WINDOW_DAYS]
  );
  return Number(result.rows[0]?.score ?? 0);
}

/** Ends any live Find a Friend search, so a restricted person disappears from radars now, not later. */
async function endSearches(userId: string) {
  await getPool().query("update activity_intents set status = 'cancelled' where user_id = $1 and status = 'active'", [userId]);
}

/** Next step on the escalation ladder: 7 days, then 30 days, then permanent. */
export async function applyStrike(userId: string, reason: string): Promise<void> {
  await getPool().query(
    `update app_users set
       strikes = strikes + 1,
       restriction_scope = 'full',
       restriction_reason = $2,
       restricted_until = case
         when strikes + 1 >= 3 then 'infinity'::timestamptz
         when strikes + 1 = 2 then now() + interval '30 days'
         else now() + interval '7 days' end
     where id = $1`,
    [userId, reason]
  );
  await endSearches(userId);
}

export async function liftRestriction(userId: string): Promise<void> {
  await getPool().query(
    "update app_users set restricted_until = null, restriction_scope = null, restriction_reason = null where id = $1",
    [userId]
  );
}

/** Called after every report is saved. */
export async function evaluateAfterReport(reportedId: string, category: string): Promise<void> {
  const pool = getPool();
  const current = await pool.query<{ scope: RestrictionScope | null; active: boolean }>(
    "select restriction_scope as scope, coalesce(restricted_until > now(), false) as active from app_users where id = $1",
    [reportedId]
  );
  const state = current.rows[0];
  if (!state || (state.active && state.scope === "full")) return;

  if ((await reportScore(reportedId)) >= THRESHOLD) {
    await applyStrike(reportedId, "Several members reported this account.");
    // These reports have done their job; they stay in the admin queue (resolved_at is still null) for review.
    await pool.query("update reports set resolution = 'auto_restricted' where reported_id = $1 and resolution is null", [reportedId]);
    return;
  }
  if (SERIOUS.has(category) && !state.active) {
    await pool.query(
      `update app_users set restriction_scope = 'radar', restriction_reason = $2,
         restricted_until = now() + make_interval(days => $3)
       where id = $1`,
      [reportedId, "Reported for a safety concern; under review.", RADAR_REVIEW_DAYS]
    );
    await endSearches(reportedId);
  }
}

/** Restriction columns → Restriction, for the session user. */
export function toRestriction(row: {
  restriction_active: boolean | null;
  restriction_scope: RestrictionScope | null;
  restriction_until: Date | null;
  restriction_reason: string | null;
}): Restriction | null {
  if (!row.restriction_active || !row.restriction_scope) return null;
  return {
    scope: row.restriction_scope,
    until: row.restriction_until?.toISOString() ?? null,
    reason: row.restriction_reason ?? MESSAGES[row.restriction_scope],
  };
}

/** SQL columns for toRestriction(), over an `app_users` alias. Permanent ("infinity") comes back as a null `until`. */
export const RESTRICTION_COLUMNS = (u: string) => `coalesce(${u}.restricted_until > now(), false) as restriction_active,
  ${u}.restriction_scope,
  case when ${u}.restricted_until = 'infinity' then null else ${u}.restricted_until end as restriction_until,
  ${u}.restriction_reason`;

/**
 * For routes: a 403 to return if this restriction forbids the action, else null.
 * "radar" actions (Find a Friend, groups) are blocked by any restriction;
 * "full" actions (friend requests, messages) only by a full one.
 */
export function restrictedResponse(restriction: Restriction | null, action: RestrictionScope): NextResponse | null {
  if (!restriction) return null;
  if (action === "full" && restriction.scope !== "full") return null;
  return NextResponse.json({ ok: false, restricted: true, error: MESSAGES[restriction.scope] }, { status: 403 });
}
