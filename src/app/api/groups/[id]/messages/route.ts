import { after, NextRequest, NextResponse } from "next/server";
import { getMessagePage, getMessagesSince, sendChatMessage, type Conversation } from "@/lib/network/chatDb";
import { getGroupInfo } from "@/lib/network/findDb";
import { isUuid } from "@/lib/network/friendsDb";
import { requireUser } from "@/lib/auth/server/session";
import { restrictedResponse } from "@/lib/safety/restrictions";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { signalUsers } from "@/lib/realtime/server";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

const NOT_MEMBER = "Join this group to see its chat";

/**
 * Group chat, members only. Same shape as friend chat:
 * - no params:          the newest page, plus the group's details
 * - `?before=<cursor>`: the page before that message (scrolling up)
 * - `?since=<time>`:    everything created or changed since then (live updates, reconnects)
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const conv: Conversation = { kind: "group", id };
  const search = req.nextUrl.searchParams;
  const since = search.get("since");
  const before = search.get("before");
  const limit = Number(search.get("limit")) || undefined;
  try {
    const result = since ? await getMessagesSince(conv, user.id, since) : await getMessagePage(conv, user.id, { before, limit });
    if (!result.ok) return result.reason === "bad_cursor" ? bad("Invalid cursor") : bad(NOT_MEMBER, 403);
    const group = since || before ? undefined : await getGroupInfo(id);
    return NextResponse.json({ ...result, group }, { headers: { "Cache-Control": "no-store" } });
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
    const result = await sendChatMessage({ kind: "group", id }, user.id, body, clientMessageId ?? null);
    if (!result.ok) return result.reason === "not_a_participant" ? bad("Join this group to chat", 403) : bad("Message cannot be empty");
    after(() => signalUsers(result.participants, { type: "chat", groupId: id }));
    return NextResponse.json({ ok: true, message: result.message });
  } catch (err) {
    return serverError(err);
  }
}
