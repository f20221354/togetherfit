import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getWinterArcStats } from "@/lib/network/winterArcDb";
import { bad, serverError } from "@/lib/network/apiHelpers";

function keyMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Aggregated Winter Arc metrics for /admin/winter-arc. The app has no admin
 * role, so this is gated by the WINTER_ARC_ADMIN_KEY env var, sent in the
 * x-admin-key header.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.WINTER_ARC_ADMIN_KEY;
  if (!expected) return bad("WINTER_ARC_ADMIN_KEY is not set on the server", 503);
  if (!keyMatches(req.headers.get("x-admin-key") ?? "", expected)) return bad("Wrong admin key", 401);
  try {
    return NextResponse.json({ ok: true, stats: await getWinterArcStats() });
  } catch (err) {
    return serverError(err);
  }
}
