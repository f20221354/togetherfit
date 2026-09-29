import { NextRequest, NextResponse } from "next/server";
import { blockUser } from "@/lib/network/findDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = normEmail(body.email);
  if (!email || typeof body.targetUserId !== "string") return bad("email and targetUserId are required");
  try {
    const result = await blockUser(email, body.targetUserId);
    if (!result.ok) return bad("User not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
