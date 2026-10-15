import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { requireUser } from "@/lib/auth/server/session";
import { readJson } from "@/lib/auth/server/accounts";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, serverError } from "@/lib/network/apiHelpers";

/** Change your display name (what friends see). */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson(req);
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 60) return bad("Enter a name between 2 and 60 characters");
  const limited = await rateLimit({ key: `name:${user.id}`, limit: 10, windowSeconds: 86_400 });
  if (limited) return limited;
  try {
    await getPool().query("update app_users set name = $2 where id = $1", [user.id, name]);
    return NextResponse.json({ ok: true, name });
  } catch (err) {
    return serverError(err);
  }
}
