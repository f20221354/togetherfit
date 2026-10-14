import { NextRequest, NextResponse } from "next/server";
import { endSession } from "@/lib/auth/server/session";
import { serverError } from "@/lib/network/apiHelpers";

export async function POST(req: NextRequest) {
  try {
    const res = NextResponse.json({ ok: true });
    await endSession(res, req);
    return res;
  } catch (err) {
    return serverError(err);
  }
}
