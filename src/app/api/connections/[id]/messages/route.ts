import { NextRequest, NextResponse } from "next/server";
import { getMessages, sendMessage } from "@/lib/network/friendsDb";

/** Chat unlocks only once the connection's status is 'accepted' — enforced in friendsDb.ts. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ ok: false, error: "email query param is required" }, { status: 400 });
  }
  try {
    const result = await getMessages(id, email.trim().toLowerCase());
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: "Not a participant in this connection, or it isn't accepted yet" }, { status: 403 });
    }
    return NextResponse.json({ ok: true, messages: result.messages });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { email, body, type } = await req.json();
  if (typeof email !== "string" || typeof body !== "string") {
    return NextResponse.json({ ok: false, error: "email and body are required" }, { status: 400 });
  }
  try {
    const result = await sendMessage(id, email.trim().toLowerCase(), body, type === "celebration" ? "celebration" : "text");
    if (!result.ok) {
      const status = result.reason === "not_a_participant" ? 403 : 400;
      const error = result.reason === "not_a_participant" ? "Not a participant in this connection, or it isn't accepted yet" : "Message cannot be empty";
      return NextResponse.json({ ok: false, error }, { status });
    }
    return NextResponse.json({ ok: true, message: result.message });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
