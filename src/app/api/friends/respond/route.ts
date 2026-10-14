import { NextRequest, NextResponse } from "next/server";
import { respondToRequest, RespondAction } from "@/lib/network/friendsDb";
import { requireUser } from "@/lib/auth/server/session";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

const ACTIONS: RespondAction[] = ["accepted", "declined", "blocked", "join_their_time", "suggest"];

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { requestId, status, proposedTime } = await readBody(req);
  if (typeof requestId !== "string" || !ACTIONS.includes(status as RespondAction)) {
    return bad(`requestId and status (${ACTIONS.join(" | ")}) are required`);
  }
  if (status === "suggest" && typeof proposedTime !== "string") {
    return bad("proposedTime is required when suggesting another time");
  }
  try {
    const result = await respondToRequest(
      requestId,
      user.email,
      status as RespondAction,
      typeof proposedTime === "string" ? proposedTime : undefined
    );
    if (!result.ok) return bad("Request not found, already resolved, or the time is invalid", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
