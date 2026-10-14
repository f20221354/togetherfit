import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server/session";
import { listOpenReports, listRestricted, listStuckUsers } from "@/lib/admin/moderationDb";
import { serverError } from "@/lib/network/apiHelpers";

/** Open reports, current restrictions, and people stuck in automatic verification. Admins only. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  try {
    const [reports, stuck, restricted] = await Promise.all([listOpenReports(), listStuckUsers(), listRestricted()]);
    return NextResponse.json({ ok: true, reports, stuck, restricted }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return serverError(err);
  }
}
