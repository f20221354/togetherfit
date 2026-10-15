import { NextRequest, NextResponse } from "next/server";
import { markConversationRead } from "@/lib/network/chatDb";
import { requireUser } from "@/lib/auth/server/session";
import { bad, serverError } from "@/lib/network/apiHelpers";

/** Marks the friend's messages in this conversation as read (sent while the chat is open and visible). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  try {
    if (!(await markConversationRead(id, user.id))) return bad("Not a participant in this connection, or it isn't accepted yet", 403);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
