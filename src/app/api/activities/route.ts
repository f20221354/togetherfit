import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/network/milestonesDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

/** Logs a completed activity and returns any milestones it just unlocked. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = normEmail(body.email);
  if (!email || typeof body.name !== "string" || typeof body.sport !== "string") {
    return bad("email, name and sport are required");
  }
  try {
    const result = await logActivity(email, body.name.trim(), {
      sport: body.sport,
      connectionId: typeof body.connectionId === "string" ? body.connectionId : null,
      groupId: typeof body.groupId === "string" ? body.groupId : null,
    });
    if (!result.ok) return bad(result.error);
    return NextResponse.json({ ok: true, newMilestones: result.newMilestones });
  } catch (err) {
    return serverError(err);
  }
}
