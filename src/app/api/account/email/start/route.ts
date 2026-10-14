import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { findAuthUser, parseEmail, readJson } from "@/lib/auth/server/accounts";
import { verifyPassword } from "@/lib/auth/server/password";
import { issueOtp } from "@/lib/auth/server/otp";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, serverError } from "@/lib/network/apiHelpers";

/**
 * Step 1 of changing your email: confirm your password, then a code goes to
 * the NEW address. If that address already has an account, no code is sent
 * and the response looks the same (so this can't be used to probe emails);
 * the final step then fails.
 */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson(req);
  const newEmail = parseEmail(body.newEmail);
  const password = typeof body.password === "string" ? body.password.slice(0, 128) : "";
  if (!newEmail) return bad("Enter a valid email address");
  if (newEmail === user.email) return bad("That's already your email address");
  if (!password) return bad("Enter your password to confirm");
  const limited = await rateLimit(
    { key: `email-change:${user.id}`, limit: 5, windowSeconds: 3600 },
    { key: `otp:email:${newEmail}`, limit: 5, windowSeconds: 900 }
  );
  if (limited) return limited;
  try {
    const account = await findAuthUser(user.email);
    if (!account?.password_hash || !(await verifyPassword(password, account.password_hash))) {
      return bad("That password isn't right.", 401);
    }
    const taken = await findAuthUser(newEmail);
    const challengeId = await issueOtp(newEmail, "email_change", taken ? { dud: true } : { userId: user.id });
    return NextResponse.json({ ok: true, challengeId });
  } catch (err) {
    return serverError(err);
  }
}
