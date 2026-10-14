import { NextRequest, NextResponse } from "next/server";
import { blockUser } from "@/lib/network/findDb";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readBody(req);
  if (typeof body.targetUserId !== "string") return bad("targetUserId is required");
  const limited = await rateLimit({ key: "block:" + user.id, limit: 20, windowSeconds: 3600 });
  if (limited) return limited;
  try {
    const result = await blockUser(user.email, body.targetUserId);
    if (!result.ok) return bad("User not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
