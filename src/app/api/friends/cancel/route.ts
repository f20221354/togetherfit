import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { cancelSentRequest } from "@/lib/network/friendsDb";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** Withdraw a friend request you sent. */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { requestId } = await readBody(req);
  if (typeof requestId !== "string") return bad("requestId is required");
  try {
    if (!(await cancelSentRequest(requestId, user.id))) return bad("That request was already answered or withdrawn", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
