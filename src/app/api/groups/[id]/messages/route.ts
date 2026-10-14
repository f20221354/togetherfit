import { NextRequest, NextResponse } from "next/server";
import { getGroupChat, sendGroupMessage } from "@/lib/network/findDb";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** Group chat: members only. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  try {
    const chat = await getGroupChat(user.email, id);
    if (!chat) return bad("Join this group to see its chat", 403);
    return NextResponse.json({ ok: true, ...chat });
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
    const result = await sendGroupMessage(user.email, id, body);
    if (!result.ok) return bad("Join this group to chat", 403);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
