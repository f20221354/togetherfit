import { NextRequest, NextResponse } from "next/server";
import { REPORT_CATEGORIES, reportUser, type ReportCategory } from "@/lib/network/findDb";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** Records a report and blocks the person so they disappear from your radar. */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readBody(req);
  if (typeof body.targetUserId !== "string") return bad("targetUserId is required");
  const limited = await rateLimit({ key: "report:" + user.id, limit: 20, windowSeconds: 3600 });
  if (limited) return limited;
  try {
    const category: ReportCategory = REPORT_CATEGORIES.includes(body.category as ReportCategory)
      ? (body.category as ReportCategory)
      : "other";
    const result = await reportUser(user.email, body.targetUserId, category, typeof body.reason === "string" ? body.reason : "");
    if (!result.ok) return bad("User not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
