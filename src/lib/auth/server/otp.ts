import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { getPool } from "@/lib/db";
import { sendOtpEmail } from "./email";

export type OtpPurpose = "signup" | "login" | "reset" | "email_change";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
/** A challenge can be re-sent for this long after it was first issued. */
const RESEND_WINDOW_MINUTES = 30;

export interface OtpPayload {
  name?: string;
  passwordHash?: string;
  /** No account behind this challenge: nothing is emailed and it can never verify. */
  dud?: boolean;
  /** email_change: the signed-in account that asked to move to this address. */
  userId?: string;
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET must be set (at least 32 characters)");
  return "dev-only-auth-secret-do-not-use-in-production";
}

function codeHash(challengeId: string, code: string): string {
  return createHmac("sha256", secret()).update(`${challengeId}:${code}`).digest("hex");
}

/**
 * Issues a 6-digit code for this email + purpose and emails it. Any earlier
 * unused code for the same email + purpose stops working.
 */
export async function issueOtp(email: string, purpose: OtpPurpose, payload: OtpPayload = {}): Promise<string> {
  const pool = getPool();
  await pool.query(
    "update auth_otps set consumed_at = now() where email = $1 and purpose = $2 and consumed_at is null",
    [email, purpose]
  );
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const inserted = await pool.query<{ id: string }>(
    `insert into auth_otps (email, purpose, code_hash, payload, expires_at)
     values ($1, $2, '', $3, now() + make_interval(mins => $4)) returning id`,
    [email, purpose, JSON.stringify(payload), OTP_TTL_MINUTES]
  );
  const id = inserted.rows[0].id;
  // A dud stores a hash of random bytes, so no 6-digit code can ever match it.
  const hash = payload.dud ? codeHash(id, randomBytes(16).toString("hex")) : codeHash(id, code);
  await pool.query("update auth_otps set code_hash = $1 where id = $2", [hash, id]);
  if (!payload.dud) await sendOtpEmail(email, purpose, code);
  return id;
}

/** A recent, unused challenge that may be re-sent, or null. */
export async function findResendable(
  challengeId: string
): Promise<{ email: string; purpose: OtpPurpose; payload: OtpPayload } | null> {
  const result = await getPool().query<{ email: string; purpose: OtpPurpose; payload: OtpPayload | null }>(
    `select email, purpose, payload from auth_otps
     where id = $1 and consumed_at is null and created_at > now() - make_interval(mins => $2)`,
    [challengeId, RESEND_WINDOW_MINUTES]
  );
  const row = result.rows[0];
  return row ? { email: row.email, purpose: row.purpose, payload: row.payload ?? {} } : null;
}

export type VerifyResult =
  | { ok: true; email: string; payload: OtpPayload }
  | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" };

/** Checks a code for a challenge of the given purpose. A code can be used once. */
export async function verifyOtp(challengeId: string, purpose: OtpPurpose, code: string): Promise<VerifyResult> {
  const pool = getPool();
  // Count the attempt before comparing, so parallel guesses can't skip the limit.
  const result = await pool.query<{ email: string; code_hash: string; payload: OtpPayload | null; attempts: number; expired: boolean }>(
    `update auth_otps set attempts = attempts + 1
     where id = $1 and purpose = $2 and consumed_at is null
     returning email, code_hash, payload, attempts, expires_at <= now() as expired`,
    [challengeId, purpose]
  );
  const row = result.rows[0];
  if (!row) return { ok: false, reason: "expired" };
  if (row.expired) return { ok: false, reason: "expired" };
  if (row.attempts > MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  const expected = Buffer.from(row.code_hash, "hex");
  const given = Buffer.from(codeHash(challengeId, code), "hex");
  if (!/^\d{6}$/.test(code) || expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: row.attempts >= MAX_ATTEMPTS ? "too_many_attempts" : "invalid" };
  }

  const consumed = await pool.query("update auth_otps set consumed_at = now() where id = $1 and consumed_at is null", [challengeId]);
  if ((consumed.rowCount ?? 0) === 0) return { ok: false, reason: "expired" };
  return { ok: true, email: row.email, payload: row.payload ?? {} };
}
