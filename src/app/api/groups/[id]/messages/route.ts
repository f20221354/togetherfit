import { NextRequest, NextResponse } from "next/server";
import { getGroupChat, sendGroupMessage } from "@/lib/network/findDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

/** Group chat: members only. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = normEmail(req.nextUrl.searchParams.get("email"));
  if (!email) return bad("email is required");
  try {
    const chat = await getGroupChat(email, id);
    if (!chat) return bad("Join this group to see its chat", 403);
    return NextResponse.json({ ok: true, ...chat });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = normEmail(body.email);
  if (!email || typeof body.body !== "string") return bad("email and body are required");
  try {
    const result = await sendGroupMessage(email, id, body.body);
    if (!result.ok) return bad("Join this group to chat", 403);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
