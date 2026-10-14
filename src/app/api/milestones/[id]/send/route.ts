import { NextRequest, NextResponse } from "next/server";
import { sendCelebration } from "@/lib/network/milestonesDb";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** Sends your milestone's celebration card into a chat with an accepted friend. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const body = await readBody(req);
  if (typeof body.connectionId !== "string") return bad("connectionId is required");
  const limited = await rateLimit({ key: `msg:${user.id}`, limit: 60, windowSeconds: 60 });
  if (limited) return limited;
  try {
    const result = await sendCelebration(user.email, id, body.connectionId);
    if (!result.ok) return bad(result.error ?? "Couldn't send", 403);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
