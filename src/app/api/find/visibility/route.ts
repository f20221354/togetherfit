import { NextRequest, NextResponse } from "next/server";
import { setHidden } from "@/lib/network/findDb";
import { requireUser } from "@/lib/auth/server/session";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** "Hide me from radar": you keep seeing others, they stop seeing you. */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readBody(req);
  if (typeof body.intentId !== "string" || typeof body.hidden !== "boolean") return bad("intentId and hidden are required");
  try {
    const result = await setHidden(user.email, body.intentId, body.hidden);
    if (!result.ok) return bad("Search not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
