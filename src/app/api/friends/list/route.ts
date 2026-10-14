import { NextRequest, NextResponse } from "next/server";
import { listFriends } from "@/lib/network/friendsDb";
import { requireUser } from "@/lib/auth/server/session";
import { serverError } from "@/lib/network/apiHelpers";

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json({ ok: true, ...(await listFriends(user.email)) });
  } catch (err) {
    return serverError(err);
  }
}
