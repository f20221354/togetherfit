import { after, NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { otherParticipantId } from "@/lib/network/friendsDb";
import { blockUser } from "@/lib/network/findDb";
import { signalUsers } from "@/lib/realtime/server";
import { bad, serverError } from "@/lib/network/apiHelpers";

/** Block the other person in this connection: no chat, no requests, and you disappear from each other's radar. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  try {
    const other = await otherParticipantId(id, user.id);
    if (!other) return bad("Connection not found", 404);
    await blockUser(user.email, other);
    after(() => signalUsers([user.id, other], { type: "chat", connectionId: id }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
