import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { exportAccountData } from "@/lib/auth/server/accountData";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { serverError } from "@/lib/network/apiHelpers";

/** Everything the server stores about the signed-in user, as JSON. */
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const limited = await rateLimit({ key: `export:${user.id}`, limit: 5, windowSeconds: 3600 });
  if (limited) return limited;
  try {
    return NextResponse.json({ ok: true, data: await exportAccountData(user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return serverError(err);
  }
}
