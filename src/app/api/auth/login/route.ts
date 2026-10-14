import { NextRequest, NextResponse } from "next/server";
import { findAuthUser, parseEmail, readJson } from "@/lib/auth/server/accounts";
import { issueOtp } from "@/lib/auth/server/otp";
import { dummyPasswordHash, verifyPassword } from "@/lib/auth/server/password";
import { clientIp, rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, serverError } from "@/lib/network/apiHelpers";

/** Step 1 of login: checks the password, then emails a one-time code. */
export async function POST(req: NextRequest) {
  const body = await readJson(req);
  const email = parseEmail(body.email);
  const password = typeof body.password === "string" ? body.password.slice(0, 128) : "";
  if (!email || !password) return bad("Enter your email and password");

  const limited = await rateLimit(
    { key: `login:ip:${clientIp(req)}`, limit: 20, windowSeconds: 900 },
    { key: `login:email:${email}`, limit: 10, windowSeconds: 900 }
  );
  if (limited) return limited;

  try {
    const user = await findAuthUser(email);
    const valid = await verifyPassword(password, user?.password_hash ?? (await dummyPasswordHash()));
    if (!user?.password_hash || !valid) {
      // Accounts from before real login have no password yet; they reset it to claim the account.
      return bad("Invalid email or password.", 401);
    }
    const otpLimited = await rateLimit({ key: `otp:email:${email}`, limit: 5, windowSeconds: 900 });
    if (otpLimited) return otpLimited;
    const challengeId = await issueOtp(email, "login");
    return NextResponse.json({ ok: true, challengeId });
  } catch (err) {
    return serverError(err);
  }
}
