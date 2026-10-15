import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { realtimeClientConfig } from "@/lib/realtime/server";
import { serverError } from "@/lib/network/apiHelpers";

/**
 * Tells the signed-in browser how to receive chat signals: `{ mode: "poll" }`,
 * or `{ mode: "ably", tokenRequest }` with a token that can only subscribe to
 * the user's own channel. Ably calls this again to renew the token.
 */
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const limited = await rateLimit({ key: `realtime-config:${user.id}`, limit: 30, windowSeconds: 600 });
  if (limited) return limited;
  try {
    return NextResponse.json(await realtimeClientConfig(user.id), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return serverError(err);
  }
}
