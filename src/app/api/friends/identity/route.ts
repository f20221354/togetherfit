import { NextRequest, NextResponse } from "next/server";
import { getOrCreateIdentity } from "@/lib/network/friendsDb";

export async function POST(req: NextRequest) {
  const { email, name } = await req.json();
  if (typeof email !== "string" || typeof name !== "string" || !email.trim() || !name.trim()) {
    return NextResponse.json({ ok: false, error: "email and name are required" }, { status: 400 });
  }
  try {
    const identity = await getOrCreateIdentity(email.trim().toLowerCase(), name.trim());
    return NextResponse.json({ ok: true, identity });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
