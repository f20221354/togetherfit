import { NextRequest, NextResponse } from "next/server";
import { requireUser, SESSION_COOKIE } from "@/lib/auth/server/session";
import { findAuthUser, readJson } from "@/lib/auth/server/accounts";
import { deleteAccount } from "@/lib/auth/server/accountData";
import { verifyPassword } from "@/lib/auth/server/password";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, serverError } from "@/lib/network/apiHelpers";

/** Permanently deletes the signed-in account. Asks for the password again so a borrowed, unlocked device can't do it. */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson(req);
  const password = typeof body.password === "string" ? body.password.slice(0, 128) : "";
  if (!password) return bad("Enter your password to confirm");

  const limited = await rateLimit({ key: `delete:${user.id}`, limit: 5, windowSeconds: 900 });
  if (limited) return limited;

  try {
    const account = await findAuthUser(user.email);
    if (!account?.password_hash || !(await verifyPassword(password, account.password_hash))) {
      return bad("That password isn't right.", 401);
    }
    await deleteAccount(user.id, user.email);
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  } catch (err) {
    return serverError(err);
  }
}
