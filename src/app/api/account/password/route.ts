import { NextRequest, NextResponse } from "next/server";
import { endOtherSessions, requireUser } from "@/lib/auth/server/session";
import { findAuthUser, readJson, setPassword } from "@/lib/auth/server/accounts";
import { hashPassword, verifyPassword } from "@/lib/auth/server/password";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { sendPasswordChangedNotice } from "@/lib/auth/server/email";
import { checkPassword } from "@/lib/auth/validation";
import { bad, serverError } from "@/lib/network/apiHelpers";
import { reportError } from "@/lib/observability/report";

/** Change password while signed in: needs the current one, and signs out every other device. */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson(req);
  const current = typeof body.currentPassword === "string" ? body.currentPassword.slice(0, 128) : "";
  const next = typeof body.newPassword === "string" ? body.newPassword : "";
  if (!current) return bad("Enter your current password");
  const check = checkPassword(next);
  if (!check.valid) return bad(check.message ?? "Choose a stronger password");
  if (current === next) return bad("Your new password must be different from the current one");
  const limited = await rateLimit({ key: `password-change:${user.id}`, limit: 5, windowSeconds: 900 });
  if (limited) return limited;
  try {
    const account = await findAuthUser(user.email);
    if (!account?.password_hash || !(await verifyPassword(current, account.password_hash))) {
      return bad("Your current password isn't right.", 401);
    }
    await setPassword(user.id, await hashPassword(next));
    await endOtherSessions(req, user.id);
    await sendPasswordChangedNotice(user.email).catch((err) => reportError(err, { where: "email password-changed notice" }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
