import { NextRequest, NextResponse } from "next/server";
import { createIntent, getActiveIntent } from "@/lib/network/findDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

/** Your current live search, if any. */
export async function GET(req: NextRequest) {
  const email = normEmail(req.nextUrl.searchParams.get("email"));
  if (!email) return bad("email is required");
  try {
    return NextResponse.json({ ok: true, active: await getActiveIntent(email) });
  } catch (err) {
    return serverError(err);
  }
}

/** Starts a Find a Friend search: area (coarse), when, and sport. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = normEmail(body.email);
  if (!email || typeof body.name !== "string") return bad("email and name are required");
  try {
    const result = await createIntent(email, body.name.trim(), {
      sport: body.sport,
      lat: Number(body.lat),
      lng: Number(body.lng),
      areaLabel: typeof body.areaLabel === "string" ? body.areaLabel : null,
      radiusKm: Number(body.radiusKm),
      mode: body.mode,
      startTime: typeof body.startTime === "string" ? body.startTime : null,
    });
    if (!result.ok) return bad(result.error);
    return NextResponse.json({ ok: true, intentId: result.intentId });
  } catch (err) {
    return serverError(err);
  }
}
