import { NextRequest, NextResponse } from "next/server";
import { isWinterArcEvent, recordWinterArcEvent } from "@/lib/network/winterArcDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

/** Logs one Winter Arc analytics event (see src/lib/winterArc/analytics.ts). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = normEmail(body?.email);
  if (!email || !isWinterArcEvent(body?.event)) return bad("a known event and an email are required");
  try {
    await recordWinterArcEvent(body.event, email, body.props);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
