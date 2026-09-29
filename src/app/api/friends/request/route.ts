import { NextRequest, NextResponse } from "next/server";
import { sendFriendRequest } from "@/lib/network/friendsDb";

const REASON_MESSAGES: Record<string, string> = {
  self: "That's your own code.",
  not_found: "No one has that code.",
  already_friends: "You're already friends.",
  already_pending: "A request is already pending between you two.",
};

export async function POST(req: NextRequest) {
  const { fromEmail, fromName, toCode } = await req.json();
  if (typeof fromEmail !== "string" || typeof fromName !== "string" || typeof toCode !== "string" || !toCode.trim()) {
    return NextResponse.json({ ok: false, error: "fromEmail, fromName and toCode are required" }, { status: 400 });
  }
  try {
    const result = await sendFriendRequest(fromEmail.trim().toLowerCase(), fromName.trim(), toCode);
    if (!result.ok) {
      const status = result.reason === "not_found" ? 404 : result.reason === "self" ? 400 : 409;
      return NextResponse.json({ ok: false, error: REASON_MESSAGES[result.reason] }, { status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
