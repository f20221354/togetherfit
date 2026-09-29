import { NextRequest, NextResponse } from "next/server";
import { radar } from "@/lib/network/findDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

/** Live matches for one search: same sport, inside the radius, overlapping time slot. */
export async function GET(req: NextRequest) {
  const email = normEmail(req.nextUrl.searchParams.get("email"));
  const intentId = req.nextUrl.searchParams.get("intentId");
  if (!email || !intentId) return bad("email and intentId are required");
  try {
    const result = await radar(email, intentId);
    if (!result) return bad("Search not found", 404);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return serverError(err);
  }
}
