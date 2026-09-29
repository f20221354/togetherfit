import { NextRequest, NextResponse } from "next/server";
import { setHidden } from "@/lib/network/findDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

/** "Hide me from radar": you keep seeing others, they stop seeing you. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = normEmail(body.email);
  if (!email || typeof body.intentId !== "string" || typeof body.hidden !== "boolean") {
    return bad("email, intentId and hidden are required");
  }
  try {
    const result = await setHidden(email, body.intentId, body.hidden);
    if (!result.ok) return bad("Search not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
