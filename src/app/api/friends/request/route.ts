import { NextRequest, NextResponse } from "next/server";
import { sendFriendRequest } from "@/lib/network/friendsDb";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

const REASON_MESSAGES: Record<string, string> = {
  self: "That's your own code.",
  not_found: "No one has that code.",
  already_friends: "You're already friends.",
  already_pending: "A request is already pending between you two.",
};

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { toCode } = await readBody(req);
  if (typeof toCode !== "string" || !toCode.trim() || toCode.length > 20) return bad("Enter a friend code");
  // Also stops friend codes from being guessed by brute force.
  const limited = await rateLimit({ key: `friendreq:${user.id}`, limit: 20, windowSeconds: 3600 });
  if (limited) return limited;
  try {
    const result = await sendFriendRequest(user.email, user.name, toCode);
    if (!result.ok) {
      const status = result.reason === "not_found" ? 404 : result.reason === "self" ? 400 : 409;
      return bad(REASON_MESSAGES[result.reason], status);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
