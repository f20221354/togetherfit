import { NextRequest, NextResponse } from "next/server";
import { createVerifiedAccount, findAuthUser, OTP_ERRORS, readJson } from "@/lib/auth/server/accounts";
import { verifyOtp } from "@/lib/auth/server/otp";
import { clientIp, rateLimit } from "@/lib/auth/server/rateLimit";
import { getSessionUserById, startSession } from "@/lib/auth/server/session";
import { isUuid } from "@/lib/network/friendsDb";
import { bad, serverError } from "@/lib/network/apiHelpers";

/** Step 2 of signup or login: checks the emailed code and starts a session. */
export async function POST(req: NextRequest) {
  const body = await readJson(req);
  const purpose = body.purpose === "signup" || body.purpose === "login" ? body.purpose : null;
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!purpose || !isUuid(body.challengeId) || !code) return bad("Enter the 6-digit code");

  const limited = await rateLimit({ key: `verify:ip:${clientIp(req)}`, limit: 30, windowSeconds: 900 });
  if (limited) return limited;

  try {
    const result = await verifyOtp(body.challengeId, purpose, code);
    if (!result.ok) return bad(OTP_ERRORS[result.reason], 400);

    let userId: string | null;
    if (purpose === "signup") {
      const { name, passwordHash } = result.payload;
      if (!name || !passwordHash) return bad(OTP_ERRORS.invalid);
      userId = await createVerifiedAccount(result.email, name, passwordHash);
      if (!userId) return bad("This email already has an account. Log in instead.", 409);
    } else {
      userId = (await findAuthUser(result.email))?.id ?? null;
      if (!userId) return bad(OTP_ERRORS.invalid);
    }

    const res = NextResponse.json({ ok: true, user: await getSessionUserById(userId) });
    await startSession(res, req, userId);
    return res;
  } catch (err) {
    return serverError(err);
  }
}
