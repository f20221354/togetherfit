import { NextRequest, NextResponse } from "next/server";
import { createGroup, listMyGroups } from "@/lib/network/findDb";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** Groups you're a member of (for the Messages inbox). */
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json({ ok: true, groups: await listMyGroups(user.email) });
  } catch (err) {
    return serverError(err);
  }
}

/** Starts a group for your current search's sport, area and time. */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readBody(req);
  if (typeof body.intentId !== "string" || typeof body.name !== "string") return bad("intentId and name are required");
  const limited = await rateLimit({ key: `group:${user.id}`, limit: 10, windowSeconds: 3600 });
  if (limited) return limited;
  try {
    const result = await createGroup(user.email, body.intentId, body.name);
    if (!result.ok) return bad(result.error);
    return NextResponse.json({ ok: true, groupId: result.groupId });
  } catch (err) {
    return serverError(err);
  }
}
