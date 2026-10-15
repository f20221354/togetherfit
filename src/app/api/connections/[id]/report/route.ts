import { after, NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { otherParticipantId } from "@/lib/network/friendsDb";
import { REPORT_CATEGORIES, reportUser, type ReportCategory } from "@/lib/network/findDb";
import { signalUsers } from "@/lib/realtime/server";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** Report the other person in this connection (from Friends or chat). Also blocks them. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const body = await readBody(req);
  const category: ReportCategory = REPORT_CATEGORIES.includes(body.category as ReportCategory) ? (body.category as ReportCategory) : "other";
  const limited = await rateLimit({ key: "report:" + user.id, limit: 20, windowSeconds: 3600 });
  if (limited) return limited;
  try {
    const other = await otherParticipantId(id, user.id);
    if (!other) return bad("Connection not found", 404);
    const result = await reportUser(user.email, other, category, typeof body.reason === "string" ? body.reason : "");
    if (!result.ok) return bad("Couldn't report this person", 400);
    after(() => signalUsers([user.id, other], { type: "chat", connectionId: id }));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
