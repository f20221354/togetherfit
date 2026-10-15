import { NextRequest, NextResponse } from "next/server";
import { checkPassword } from "@/lib/auth/validation";
import { findAuthUser, OTP_ERRORS, readJson, setPassword } from "@/lib/auth/server/accounts";
import { verifyOtp } from "@/lib/auth/server/otp";
import { hashPassword } from "@/lib/auth/server/password";
import { clientIp, rateLimit } from "@/lib/auth/server/rateLimit";
import { endAllSessions, getSessionUserById, startSession } from "@/lib/auth/server/session";
import { isUuid } from "@/lib/network/friendsDb";
import { bad, serverError } from "@/lib/network/apiHelpers";

/** Step 2 of a password reset: checks the code, sets the new password, signs out every other device. */
export async function POST(req: NextRequest) {
  const body = await readJson(req);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!isUuid(body.challengeId) || !code) return bad("Enter the 6-digit code");
  const passwordCheck = checkPassword(password);
  if (!passwordCheck.valid) return bad(passwordCheck.message ?? "Choose a stronger password");

  const limited = await rateLimit({ key: `verify:ip:${clientIp(req)}`, limit: 30, windowSeconds: 900 });
  if (limited) return limited;

  try {
    const result = await verifyOtp(body.challengeId, "reset", code);
    if (!result.ok) return bad(OTP_ERRORS[result.reason]);
    const user = await findAuthUser(result.email);
    if (!user) return bad(OTP_ERRORS.invalid);

    await setPassword(user.id, await hashPassword(password));
    await endAllSessions(user.id);
    const res = NextResponse.json({ ok: true, user: await getSessionUserById(user.id) });
    await startSession(res, req, user.id);
    return res;
  } catch (err) {
    return serverError(err);
  }
}
