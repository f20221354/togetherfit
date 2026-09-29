import { NextRequest, NextResponse } from "next/server";
import { listFriends } from "@/lib/network/friendsDb";

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ ok: false, error: "email query param is required" }, { status: 400 });
  }
  try {
    const list = await listFriends(email.trim().toLowerCase());
    return NextResponse.json({ ok: true, ...list });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
