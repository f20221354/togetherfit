import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server/session";
import { REPORT_ACTIONS, resolveReport, type ReportAction } from "@/lib/admin/moderationDb";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** Resolve a report: dismiss, remove the reported user's photo, or revoke their ✓ badge. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const { id } = await params;
  const { action } = await readBody(req);
  if (!REPORT_ACTIONS.includes(action as ReportAction)) return bad(`action must be one of ${REPORT_ACTIONS.join(", ")}`);
  try {
    if (!(await resolveReport(id, action as ReportAction, admin.id))) return bad("Report not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
