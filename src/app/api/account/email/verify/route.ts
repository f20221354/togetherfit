import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth/server/session";
import { OTP_ERRORS, readJson } from "@/lib/auth/server/accounts";
import { verifyOtp } from "@/lib/auth/server/otp";
import { rateLimit, clientIp } from "@/lib/auth/server/rateLimit";
import { sendEmailChangedNotice } from "@/lib/auth/server/email";
import { isUuid } from "@/lib/network/friendsDb";
import { bad, serverError } from "@/lib/network/apiHelpers";
import { reportError } from "@/lib/observability/report";

/** Step 2 of changing your email: the code from the new address moves the account there. */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson(req);
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!isUuid(body.challengeId) || !code) return bad("Enter the 6-digit code");
  const limited = await rateLimit({ key: `verify:ip:${clientIp(req)}`, limit: 30, windowSeconds: 900 });
  if (limited) return limited;
  try {
    const result = await verifyOtp(body.challengeId, "email_change", code);
    if (!result.ok) return bad(OTP_ERRORS[result.reason]);
    if (result.payload.userId !== user.id) return bad(OTP_ERRORS.invalid);
    const client = await getPool().connect();
    try {
      await client.query("begin");
      await client.query("update app_users set email = $2 where id = $1", [user.id, result.email]);
      await client.query("update winter_arc_events set user_email = $2 where user_email = $1", [user.email, result.email]);
      await client.query("commit");
    } catch (err) {
      await client.query("rollback").catch(() => {});
      if ((err as { code?: string }).code === "23505") return bad("That email already has an account.", 409);
      throw err;
    } finally {
      client.release();
    }
    await sendEmailChangedNotice(user.email, result.email).catch((err) => reportError(err, { where: "email email-changed notice" }));
    return NextResponse.json({ ok: true, email: result.email });
  } catch (err) {
    return serverError(err);
  }
}
