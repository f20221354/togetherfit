import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server/session";
import { getWinterArcStats } from "@/lib/network/winterArcDb";
import { serverError } from "@/lib/network/apiHelpers";

/** Aggregated Winter Arc metrics for /admin/winter-arc. Admins only (npm run admin:grant). */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  try {
    return NextResponse.json({ ok: true, stats: await getWinterArcStats() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return serverError(err);
  }
}
