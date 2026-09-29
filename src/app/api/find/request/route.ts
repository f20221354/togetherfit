import { NextRequest, NextResponse } from "next/server";
import { sendRadarRequest } from "@/lib/network/findDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

const MESSAGES: Record<string, string> = {
  self: "That's you.",
  not_found: "This person isn't available.",
  already_friends: "You're already connected.",
  already_pending: "A request is already pending between you two.",
  not_on_radar: "They're no longer on your radar.",
};

/** Sends a connection request from the radar (source = find_a_friend, activity_id = your search). */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = normEmail(body.email);
  if (!email || typeof body.name !== "string" || typeof body.intentId !== "string" || typeof body.toUserId !== "string") {
    return bad("email, name, intentId and toUserId are required");
  }
  try {
    const result = await sendRadarRequest(email, body.name.trim(), body.intentId, body.toUserId);
    if (!result.ok) return bad(MESSAGES[result.reason] ?? "Request failed", 409);
    return NextResponse.json({ ok: true, connectionId: result.connectionId });
  } catch (err) {
    return serverError(err);
  }
}
