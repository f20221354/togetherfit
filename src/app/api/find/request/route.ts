import { NextRequest, NextResponse } from "next/server";
import { sendRadarRequest } from "@/lib/network/findDb";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

const MESSAGES: Record<string, string> = {
  self: "That's you.",
  not_found: "This person isn't available.",
  already_friends: "You're already connected.",
  already_pending: "A request is already pending between you two.",
  not_on_radar: "They're no longer on your radar.",
};

/** Sends a connection request from the radar (source = find_a_friend, activity_id = your search). */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readBody(req);
  if (typeof body.intentId !== "string" || typeof body.toUserId !== "string") return bad("intentId and toUserId are required");
  const limited = await rateLimit({ key: `connreq:${user.id}`, limit: 30, windowSeconds: 3600 });
  if (limited) return limited;
  try {
    const result = await sendRadarRequest(user.email, user.name, body.intentId, body.toUserId);
    if (!result.ok) return bad(MESSAGES[result.reason] ?? "Request failed", 409);
    return NextResponse.json({ ok: true, connectionId: result.connectionId });
  } catch (err) {
    return serverError(err);
  }
}
