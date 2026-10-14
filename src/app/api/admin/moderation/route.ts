import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server/session";
import { listOpenReports, listStuckUsers } from "@/lib/admin/moderationDb";
import { serverError } from "@/lib/network/apiHelpers";

/** Open reports and people stuck in automatic verification. Admins only. */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  try {
    const [reports, stuck] = await Promise.all([listOpenReports(), listStuckUsers()]);
    return NextResponse.json({ ok: true, reports, stuck }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return serverError(err);
  }
}
