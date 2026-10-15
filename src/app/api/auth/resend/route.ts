import { NextRequest, NextResponse } from "next/server";
import { readJson } from "@/lib/auth/server/accounts";
import { findResendable, issueOtp } from "@/lib/auth/server/otp";
import { clientIp, rateLimit } from "@/lib/auth/server/rateLimit";
import { isUuid } from "@/lib/network/friendsDb";
import { bad, serverError } from "@/lib/network/apiHelpers";

/** Emails a fresh code for a recent signup/login/reset challenge. */
export async function POST(req: NextRequest) {
  const body = await readJson(req);
  if (!isUuid(body.challengeId)) return bad("Start again from the previous step");

  const limited = await rateLimit({ key: `resend:ip:${clientIp(req)}`, limit: 10, windowSeconds: 900 });
  if (limited) return limited;

  try {
    const pending = await findResendable(body.challengeId);
    if (!pending) return bad("This code request has expired — start again", 410);
    const emailLimited = await rateLimit({ key: `otp:email:${pending.email}`, limit: 5, windowSeconds: 900 });
    if (emailLimited) return emailLimited;
    const challengeId = await issueOtp(pending.email, pending.purpose, pending.payload);
    return NextResponse.json({ ok: true, challengeId });
  } catch (err) {
    return serverError(err);
  }
}
