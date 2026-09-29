import { NextRequest, NextResponse } from "next/server";
import { listMilestones } from "@/lib/network/milestonesDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

/** Your milestones plus current progress (activities, streak, group sessions). */
export async function GET(req: NextRequest) {
  const email = normEmail(req.nextUrl.searchParams.get("email"));
  if (!email) return bad("email is required");
  try {
    return NextResponse.json({ ok: true, ...(await listMilestones(email)) });
  } catch (err) {
    return serverError(err);
  }
}
