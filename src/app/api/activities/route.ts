import { NextRequest, NextResponse } from "next/server";
import { logActivity } from "@/lib/network/milestonesDb";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** Logs a completed activity and returns any milestones it just unlocked. */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readBody(req);
  if (typeof body.sport !== "string") return bad("sport is required");
  const limited = await rateLimit({ key: `activities:${user.id}`, limit: 30, windowSeconds: 3600 });
  if (limited) return limited;
  try {
    const result = await logActivity(user.email, user.name, {
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
