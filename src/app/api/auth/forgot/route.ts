import { NextRequest, NextResponse } from "next/server";
import { findAuthUser, parseEmail, readJson } from "@/lib/auth/server/accounts";
import { issueOtp } from "@/lib/auth/server/otp";
import { clientIp, rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, serverError } from "@/lib/network/apiHelpers";

/**
 * Step 1 of a password reset: emails a code if the account exists. The
 * response is identical either way, so it can't be used to probe emails.
 * This is also how accounts created before real login set their password.
 */
export async function POST(req: NextRequest) {
  const body = await readJson(req);
  const email = parseEmail(body.email);
  if (!email) return bad("Enter a valid email address");

  const limited = await rateLimit(
    { key: `forgot:ip:${clientIp(req)}`, limit: 10, windowSeconds: 3600 },
    { key: `otp:email:${email}`, limit: 5, windowSeconds: 900 }
  );
  if (limited) return limited;

  try {
    const user = await findAuthUser(email);
    const challengeId = await issueOtp(email, "reset", user ? {} : { dud: true });
    return NextResponse.json({ ok: true, challengeId });
  } catch (err) {
    return serverError(err);
  }
}
