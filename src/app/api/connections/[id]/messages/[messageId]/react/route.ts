import { NextRequest, NextResponse } from "next/server";
import { reactToCelebration } from "@/lib/network/milestonesDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

/** The receiver of a celebration card reacts with one emoji. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const { id, messageId } = await params;
  const body = await req.json();
  const email = normEmail(body.email);
  if (!email || typeof body.emoji !== "string") return bad("email and emoji are required");
  try {
    const result = await reactToCelebration(email, id, messageId, body.emoji);
    if (!result.ok) return bad("You can react only to celebrations you received", 403);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
