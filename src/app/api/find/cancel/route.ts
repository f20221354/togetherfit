import { NextRequest, NextResponse } from "next/server";
import { cancelIntent } from "@/lib/network/findDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = normEmail(body.email);
  if (!email || typeof body.intentId !== "string") return bad("email and intentId are required");
  try {
    const result = await cancelIntent(email, body.intentId);
    if (!result.ok) return bad("Search not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
