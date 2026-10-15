import { NextRequest, NextResponse } from "next/server";
import { isWinterArcEvent, recordWinterArcEvent } from "@/lib/network/winterArcDb";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** Logs one Winter Arc analytics event (see src/lib/winterArc/analytics.ts). */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readBody(req);
  if (!isWinterArcEvent(body.event)) return bad("a known event is required");
  const props = body.props && JSON.stringify(body.props).length <= 1000 ? body.props : undefined;
  const limited = await rateLimit({ key: `wa:${user.id}`, limit: 120, windowSeconds: 3600 });
  if (limited) return limited;
  try {
    await recordWinterArcEvent(body.event, user.email, props);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
