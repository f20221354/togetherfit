import { NextRequest, NextResponse } from "next/server";
import { getMessages, sendMessage } from "@/lib/network/friendsDb";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

const NOT_PARTICIPANT = "Not a participant in this connection, or it isn't accepted yet";

/** Chat unlocks only once the connection's status is 'accepted' — enforced in friendsDb.ts. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  try {
    const result = await getMessages(id, user.email);
    if (!result.ok) return bad(NOT_PARTICIPANT, 403);
    return NextResponse.json({ ok: true, messages: result.messages });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const { body } = await readBody(req);
  if (typeof body !== "string") return bad("body is required");
  if (body.length > 2000) return bad("Messages can be at most 2000 characters");
  const limited = await rateLimit({ key: `msg:${user.id}`, limit: 60, windowSeconds: 60 });
  if (limited) return limited;
  try {
    // Celebration cards go through /api/milestones/[id]/send, which checks you own the milestone.
    const result = await sendMessage(id, user.email, body, "text");
    if (!result.ok) {
      return result.reason === "not_a_participant" ? bad(NOT_PARTICIPANT, 403) : bad("Message cannot be empty");
    }
    return NextResponse.json({ ok: true, message: result.message });
  } catch (err) {
    return serverError(err);
  }
}
