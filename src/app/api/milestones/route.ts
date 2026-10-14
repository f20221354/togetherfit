import { NextRequest, NextResponse } from "next/server";
import { listMilestones } from "@/lib/network/milestonesDb";
import { requireUser } from "@/lib/auth/server/session";
import { serverError } from "@/lib/network/apiHelpers";

/** Your milestones plus current progress (activities, streak, group sessions). */
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json({ ok: true, ...(await listMilestones(user.email)) });
  } catch (err) {
    return serverError(err);
  }
}
