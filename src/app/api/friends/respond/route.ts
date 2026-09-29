import { NextRequest, NextResponse } from "next/server";
import { respondToRequest, RespondAction } from "@/lib/network/friendsDb";

const ACTIONS: RespondAction[] = ["accepted", "declined", "blocked", "join_their_time", "suggest"];

export async function POST(req: NextRequest) {
  const { requestId, respondingEmail, status, proposedTime } = await req.json();
  if (typeof requestId !== "string" || typeof respondingEmail !== "string" || !ACTIONS.includes(status)) {
    return NextResponse.json(
      { ok: false, error: `requestId, respondingEmail and status (${ACTIONS.join(" | ")}) are required` },
      { status: 400 }
    );
  }
  if (status === "suggest" && typeof proposedTime !== "string") {
    return NextResponse.json({ ok: false, error: "proposedTime is required when suggesting another time" }, { status: 400 });
  }
  try {
    const result = await respondToRequest(requestId, respondingEmail.trim().toLowerCase(), status, proposedTime);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: "Request not found, already resolved, or the time is invalid" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
