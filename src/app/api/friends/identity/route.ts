import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";

/** Your shareable friend code and display name. */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  return NextResponse.json({ ok: true, identity: { email: user.email, name: user.name, code: user.code } });
}
