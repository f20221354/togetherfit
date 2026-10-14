import { NextRequest, NextResponse } from "next/server";
import { joinGroup } from "@/lib/network/findDb";
import { requireUser } from "@/lib/auth/server/session";
import { bad, serverError } from "@/lib/network/apiHelpers";

/** Joining a group also puts you in its group chat. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  try {
    const result = await joinGroup(user.email, id);
    if (!result.ok) return bad("This group has ended", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
