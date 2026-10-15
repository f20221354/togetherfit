import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { deleteExpiredMessages } from "@/lib/network/chatDb";
import { serverError } from "@/lib/network/apiHelpers";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Deletes expired celebration cards. Called by Vercel Cron (vercel.json),
 * which sends `Authorization: Bearer $CRON_SECRET`. Chat reads already hide
 * expired cards, so running this once a day is enough.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, deleted: await deleteExpiredMessages() });
  } catch (err) {
    return serverError(err);
  }
}
