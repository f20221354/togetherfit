import { NextRequest, NextResponse } from "next/server";
import { heartbeat } from "@/lib/network/findDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

/** Keeps a "Now" search on the radar; without it the search expires after ~90 s. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = normEmail(body.email);
  if (!email || typeof body.intentId !== "string") return bad("email and intentId are required");
  try {
    const result = await heartbeat(email, body.intentId);
    if (!result.ok) return bad("Search not found", 404);
    return NextResponse.json({ ok: true, active: result.active });
  } catch (err) {
    return serverError(err);
  }
}
