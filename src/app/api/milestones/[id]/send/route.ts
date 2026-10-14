import { after, NextRequest, NextResponse } from "next/server";
import { sendCelebration } from "@/lib/network/milestonesDb";
import { requireUser } from "@/lib/auth/server/session";
import { restrictedResponse } from "@/lib/safety/restrictions";
import { connectionUserIds } from "@/lib/network/chatDb";
import { signalUsers } from "@/lib/realtime/server";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** Sends your milestone's celebration card into a chat with an accepted friend. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const restricted = restrictedResponse(user.restriction, "full");
  if (restricted) return restricted;
  const { id } = await params;
  const body = await readBody(req);
  if (typeof body.connectionId !== "string") return bad("connectionId is required");
  const limited = await rateLimit({ key: `msg:${user.id}`, limit: 60, windowSeconds: 60 });
  if (limited) return limited;
  try {
    const result = await sendCelebration(user.email, id, body.connectionId);
    if (!result.ok) return bad(result.error ?? "Couldn't send", 403);
    const connectionId = body.connectionId;
    after(async () => signalUsers(await connectionUserIds(connectionId), { type: "chat", connectionId }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
