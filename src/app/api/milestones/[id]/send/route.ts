import { NextRequest, NextResponse } from "next/server";
import { sendCelebration } from "@/lib/network/milestonesDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

/** Sends your milestone's celebration card into a chat with an accepted friend. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = normEmail(body.email);
  if (!email || typeof body.connectionId !== "string") return bad("email and connectionId are required");
  try {
    const result = await sendCelebration(email, id, body.connectionId);
    if (!result.ok) return bad(result.error ?? "Couldn't send", 403);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
