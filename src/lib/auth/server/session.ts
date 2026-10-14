import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { clientIp } from "./rateLimit";
import { RESTRICTION_COLUMNS, toRestriction, type Restriction, type RestrictionScope } from "@/lib/safety/restrictions";

export const SESSION_COOKIE = "tf_session";
const SESSION_DAYS = 30;
/** last_seen_at / expiry are refreshed at most this often, not on every request. */
const TOUCH_AFTER_MINUTES = 60;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  code: string;
  onboardingComplete: boolean;
  isAdmin: boolean;
  /** Active safety restriction, if any (see src/lib/safety/restrictions.ts). */
  restriction: Restriction | null;
}

interface UserColumns {
  id: string;
  email: string;
  name: string;
  code: string;
  onboarding_completed_at: string | null;
  role: string;
  restriction_active: boolean | null;
  restriction_scope: RestrictionScope | null;
  restriction_until: Date | null;
  restriction_reason: string | null;
}

function toSessionUser(row: UserColumns): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    code: row.code,
    onboardingComplete: !!row.onboarding_completed_at,
    isAdmin: row.role === "admin",
    restriction: toRestriction(row),
  };
}

function tokenId(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a session row and sets the httpOnly cookie on the response. */
export async function startSession(res: NextResponse, req: NextRequest, userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await getPool().query(
    `insert into auth_sessions (id, user_id, expires_at, user_agent, ip)
     values ($1, $2, now() + make_interval(days => $3), $4, $5)`,
    [tokenId(token), userId, SESSION_DAYS, req.headers.get("user-agent")?.slice(0, 300) ?? null, clientIp(req)]
  );
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function endSession(res: NextResponse, req: NextRequest): Promise<void> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) await getPool().query("delete from auth_sessions where id = $1", [tokenId(token)]);
  res.cookies.delete(SESSION_COOKIE);
}

/** Signs a user out everywhere (after a password reset). */
export async function endAllSessions(userId: string): Promise<void> {
  await getPool().query("delete from auth_sessions where user_id = $1", [userId]);
}

export async function getSessionUserById(userId: string): Promise<SessionUser | null> {
  const result = await getPool().query<UserColumns>(
    `select u.id, u.email, u.name, u.code, u.onboarding_completed_at, u.role, ${RESTRICTION_COLUMNS("u")}
     from app_users u where u.id = $1`,
    [userId]
  );
  const row = result.rows[0];
  return row ? toSessionUser(row) : null;
}

/** The signed-in user for this request, or null. */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const pool = getPool();
  const id = tokenId(token);
  const result = await pool.query<UserColumns & { stale: boolean }>(
    `select u.id, u.email, u.name, u.code, u.onboarding_completed_at, u.role, ${RESTRICTION_COLUMNS("u")},
            s.last_seen_at < now() - make_interval(mins => $2) as stale
     from auth_sessions s join app_users u on u.id = s.user_id
     where s.id = $1 and s.expires_at > now()`,
    [id, TOUCH_AFTER_MINUTES]
  );
  const row = result.rows[0];
  if (!row) return null;
  if (row.stale) {
    // Sliding expiry: an active user stays signed in.
    await pool.query(
      "update auth_sessions set last_seen_at = now(), expires_at = now() + make_interval(days => $2) where id = $1",
      [id, SESSION_DAYS]
    );
  }
  return toSessionUser(row);
}

/**
 * For API routes: the signed-in user, or a 401 response to return as-is.
 * Every route takes identity from here — never from the request body.
 */
export async function requireUser(req: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(req);
  return user ?? NextResponse.json({ ok: false, error: "Please log in again." }, { status: 401 });
}

/** For admin-only routes: the signed-in admin, or a 401/403 response to return as-is. */
export async function requireAdmin(req: NextRequest): Promise<SessionUser | NextResponse> {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  return user.isAdmin ? user : NextResponse.json({ ok: false, error: "Admins only" }, { status: 403 });
}

/** Signs the user out everywhere except this request's session (after a password change). */
export async function endOtherSessions(req: NextRequest, userId: string): Promise<void> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  await getPool().query("delete from auth_sessions where user_id = $1 and id <> $2", [userId, token ? tokenId(token) : ""]);
}
