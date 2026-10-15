import { after, NextRequest, NextResponse } from "next/server";
import { getMessagePage, getMessagesSince, sendChatMessage } from "@/lib/network/chatDb";
import { isUuid } from "@/lib/network/friendsDb";
import { requireUser } from "@/lib/auth/server/session";
import { restrictedResponse } from "@/lib/safety/restrictions";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { signalUsers } from "@/lib/realtime/server";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

const NOT_PARTICIPANT = "Not a participant in this connection, or it isn't accepted yet";

/**
 * Chat history, only for the two people in an accepted connection.
 * - no params:          the newest page
 * - `?before=<cursor>`: the page before that message (scrolling up)
 * - `?since=<time>`:    everything created or changed since then (live updates, reconnects)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const search = req.nextUrl.searchParams;
  const since = search.get("since");
  const conv = { kind: "connection", id } as const;
  const limit = Number(search.get("limit")) || undefined;
  try {
    const result = since
      ? await getMessagesSince(conv, user.id, since)
      : await getMessagePage(conv, user.id, { before: search.get("before"), limit });
    if (!result.ok) return result.reason === "bad_cursor" ? bad("Invalid cursor") : bad(NOT_PARTICIPANT, 403);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const restricted = restrictedResponse(user.restriction, "full");
  if (restricted) return restricted;
  const { id } = await params;
  const { body, clientMessageId } = await readBody(req);
  if (typeof body !== "string") return bad("body is required");
  if (body.length > 2000) return bad("Messages can be at most 2000 characters");
  if (clientMessageId !== undefined && !isUuid(clientMessageId)) return bad("Invalid clientMessageId");
  const limited = await rateLimit({ key: `msg:${user.id}`, limit: 60, windowSeconds: 60 });
  if (limited) return limited;
  try {
    // Celebration cards go through /api/milestones/[id]/send, which checks you own the milestone.
    const result = await sendChatMessage({ kind: "connection", id }, user.id, body, clientMessageId ?? null);
    if (!result.ok) return result.reason === "not_a_participant" ? bad(NOT_PARTICIPANT, 403) : bad("Message cannot be empty");
    // Saved first, then both people's open tabs are told; the sender gets the response without waiting.
    after(() => signalUsers(result.participants, { type: "chat", connectionId: id }));
    return NextResponse.json({ ok: true, message: result.message });
  } catch (err) {
    return serverError(err);
  }
}
