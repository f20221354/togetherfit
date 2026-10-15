import { NextRequest, NextResponse } from "next/server";
import { listConversations } from "@/lib/network/friendsDb";
import { requireUser } from "@/lib/auth/server/session";
import { serverError } from "@/lib/network/apiHelpers";

/** Lists this user's accepted connections as a chat inbox: last message + unread count each. */
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json({ ok: true, conversations: await listConversations(user.email) });
  } catch (err) {
    return serverError(err);
  }
}
