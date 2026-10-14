import { NextRequest, NextResponse } from "next/server";
import { reactToCelebration } from "@/lib/network/milestonesDb";
import { requireUser } from "@/lib/auth/server/session";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** The receiver of a celebration card reacts with one emoji. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id, messageId } = await params;
  const body = await readBody(req);
  if (typeof body.emoji !== "string") return bad("emoji is required");
  try {
    const result = await reactToCelebration(user.email, id, messageId, body.emoji);
    if (!result.ok) return bad("You can react only to celebrations you received", 403);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
