import { NextRequest, NextResponse } from "next/server";
import { createGroup, listMyGroups } from "@/lib/network/findDb";
import { bad, normEmail, serverError } from "@/lib/network/apiHelpers";

/** Groups you're a member of (for the Messages inbox). */
export async function GET(req: NextRequest) {
  const email = normEmail(req.nextUrl.searchParams.get("email"));
  if (!email) return bad("email is required");
  try {
    return NextResponse.json({ ok: true, groups: await listMyGroups(email) });
  } catch (err) {
    return serverError(err);
  }
}

/** Starts a group for your current search's sport, area and time. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = normEmail(body.email);
  if (!email || typeof body.intentId !== "string" || typeof body.name !== "string") {
    return bad("email, intentId and name are required");
  }
  try {
    const result = await createGroup(email, body.intentId, body.name);
    if (!result.ok) return bad(result.error);
    return NextResponse.json({ ok: true, groupId: result.groupId });
  } catch (err) {
    return serverError(err);
  }
}
