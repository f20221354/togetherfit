import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/server/session";
import { serverError } from "@/lib/network/apiHelpers";

/** The signed-in user, or `user: null`. */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    return NextResponse.json({ ok: true, user }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return serverError(err);
  }
}
