import { NextRequest, NextResponse } from "next/server";
import { cancelIntent } from "@/lib/network/findDb";
import { requireUser } from "@/lib/auth/server/session";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readBody(req);
  if (typeof body.intentId !== "string") return bad("intentId is required");
  try {
    const result = await cancelIntent(user.email, body.intentId);
    if (!result.ok) return bad("Search not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
