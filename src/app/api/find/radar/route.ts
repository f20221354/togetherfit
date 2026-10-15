import { NextRequest, NextResponse } from "next/server";
import { radar } from "@/lib/network/findDb";
import { requireUser } from "@/lib/auth/server/session";
import { bad, serverError } from "@/lib/network/apiHelpers";

/** Live matches for one search: same sport, inside the radius, overlapping time slot. */
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const intentId = req.nextUrl.searchParams.get("intentId");
  if (!intentId) return bad("intentId is required");
  try {
    const result = await radar(user.email, intentId);
    if (!result) return bad("Search not found", 404);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return serverError(err);
  }
}
