import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { createUserTokenRequest, realtimeEnabled } from "@/lib/realtime/server";
import { serverError } from "@/lib/network/apiHelpers";

/**
 * Signs an Ably token request for the signed-in user: subscribe-only, own
 * channel only. 404 when realtime isn't configured, so the browser knows to
 * fall back to checking for changes on a timer.
 */
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (!realtimeEnabled()) return NextResponse.json({ ok: false, enabled: false }, { status: 404 });
  const limited = await rateLimit({ key: `realtime-token:${user.id}`, limit: 30, windowSeconds: 600 });
  if (limited) return limited;
  try {
    const tokenRequest = await createUserTokenRequest(user.id);
    return NextResponse.json(tokenRequest, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return serverError(err);
  }
}
