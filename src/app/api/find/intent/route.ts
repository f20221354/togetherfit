import { NextRequest, NextResponse } from "next/server";
import { createIntent, getActiveIntent } from "@/lib/network/findDb";
import { requireUser } from "@/lib/auth/server/session";
import { restrictedResponse } from "@/lib/safety/restrictions";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** Your current live search, if any. */
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json({ ok: true, active: await getActiveIntent(user.email) });
  } catch (err) {
    return serverError(err);
  }
}

/** Starts a Find a Friend search: area (coarse), when, and sport. */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const restricted = restrictedResponse(user.restriction, "radar");
  if (restricted) return restricted;
  const body = await readBody(req);
  const limited = await rateLimit({ key: `intent:${user.id}`, limit: 30, windowSeconds: 3600 });
  if (limited) return limited;
  try {
    const result = await createIntent(user.email, user.name, {
      sport: typeof body.sport === "string" ? body.sport : "",
      lat: Number(body.lat),
      lng: Number(body.lng),
      areaLabel: typeof body.areaLabel === "string" ? body.areaLabel : null,
      radiusKm: Number(body.radiusKm),
      mode: body.mode as "now" | "scheduled",
      startTime: typeof body.startTime === "string" ? body.startTime : null,
    });
    if (!result.ok) return bad(result.error);
    return NextResponse.json({ ok: true, intentId: result.intentId });
  } catch (err) {
    return serverError(err);
  }
}
