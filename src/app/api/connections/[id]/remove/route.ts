import { after, NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { otherParticipantId, removeFriend } from "@/lib/network/friendsDb";
import { signalUsers } from "@/lib/realtime/server";
import { bad, serverError } from "@/lib/network/apiHelpers";

/** Remove a friend (silent; either of you can reconnect later). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  try {
    const other = await otherParticipantId(id, user.id);
    if (!other || !(await removeFriend(id, user.id))) return bad("You're not friends with this person", 404);
    // Their open chat with you refreshes and finds it gone.
    after(() => signalUsers([user.id, other], { type: "chat", connectionId: id }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
