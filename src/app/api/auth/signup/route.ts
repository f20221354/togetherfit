import { NextRequest, NextResponse } from "next/server";
import { checkPassword } from "@/lib/auth/validation";
import { findAuthUser, parseEmail, readJson } from "@/lib/auth/server/accounts";
import { issueOtp } from "@/lib/auth/server/otp";
import { sendAccountExistsEmail } from "@/lib/auth/server/email";
import { hashPassword } from "@/lib/auth/server/password";
import { clientIp, rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, serverError } from "@/lib/network/apiHelpers";

/**
 * Step 1 of signup: emails a verification code. The account is only created
 * once the code is verified (/api/auth/verify). The response is the same
 * whether or not the email is already registered.
 */
export async function POST(req: NextRequest) {
  const body = await readJson(req);
  const email = parseEmail(body.email);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email) return bad("Enter a valid email address");
  if (name.length < 2 || name.length > 60) return bad("Enter your name (2–60 characters)");
  const passwordCheck = checkPassword(password);
  if (!passwordCheck.valid) return bad(passwordCheck.message ?? "Choose a stronger password");

  const limited = await rateLimit(
    { key: `signup:ip:${clientIp(req)}`, limit: 10, windowSeconds: 3600 },
    { key: `otp:email:${email}`, limit: 5, windowSeconds: 900 }
  );
  if (limited) return limited;

  try {
    const existing = await findAuthUser(email);
    let challengeId: string;
    if (existing?.password_hash) {
      await sendAccountExistsEmail(email).catch(() => {});
      challengeId = await issueOtp(email, "signup", { dud: true });
    } else {
      challengeId = await issueOtp(email, "signup", { name, passwordHash: await hashPassword(password) });
    }
    return NextResponse.json({ ok: true, challengeId });
  } catch (err) {
    return serverError(err);
  }
}
