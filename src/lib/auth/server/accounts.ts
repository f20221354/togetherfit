import { NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getOrCreateIdentity } from "@/lib/network/friendsDb";
import { isValidEmail } from "@/lib/auth/validation";
import type { VerifyResult } from "./otp";

export interface AuthUserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string | null;
}

export async function findAuthUser(email: string): Promise<AuthUserRow | null> {
  const result = await getPool().query<AuthUserRow>(
    "select id, email, name, password_hash from app_users where email = $1",
    [email]
  );
  return result.rows[0] ?? null;
}

/**
 * Creates the account after its email is verified — or claims a pre-auth row
 * (one created before real login existed) that has no password yet.
 * Returns null if the email already has a password-protected account.
 */
export async function createVerifiedAccount(email: string, name: string, passwordHash: string): Promise<string | null> {
  await getOrCreateIdentity(email, name);
  const result = await getPool().query<{ id: string }>(
    `update app_users set name = $2, password_hash = $3, email_verified_at = now()
     where email = $1 and password_hash is null returning id`,
    [email, name, passwordHash]
  );
  return result.rows[0]?.id ?? null;
}

export async function setPassword(userId: string, passwordHash: string): Promise<void> {
  await getPool().query(
    "update app_users set password_hash = $2, email_verified_at = coalesce(email_verified_at, now()) where id = $1",
    [userId, passwordHash]
  );
}

export async function readJson(req: NextRequest): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

export function parseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && isValidEmail(email) ? email : null;
}

export const OTP_ERRORS: Record<Exclude<VerifyResult, { ok: true }>["reason"], string> = {
  invalid: "That code isn't right. Check the email and try again.",
  expired: "That code has expired. Request a new one.",
  too_many_attempts: "Too many wrong codes. Request a new one.",
};
