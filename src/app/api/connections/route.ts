import { NextRequest, NextResponse } from "next/server";
import { listConversations } from "@/lib/network/friendsDb";

/** Lists this user's accepted connections as a chat inbox: last message + unread count each. */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ ok: false, error: "email query param is required" }, { status: 400 });
  }
  try {
    const conversations = await listConversations(email.trim().toLowerCase());
    return NextResponse.json({ ok: true, conversations });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
