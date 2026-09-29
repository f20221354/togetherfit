import { NextRequest, NextResponse } from "next/server";
import { joinGroup } from "@/lib/network/findDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

/** Joining a group also puts you in its group chat. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = normEmail(body.email);
  if (!email) return bad("email is required");
  try {
    const result = await joinGroup(email, id);
    if (!result.ok) return bad("This group has ended", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
