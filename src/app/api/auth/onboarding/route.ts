import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { readJson } from "@/lib/auth/server/accounts";
import { requireUser } from "@/lib/auth/server/session";
import { serverError } from "@/lib/network/apiHelpers";

function pickSetup(value: unknown) {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const time = (t: unknown) => (typeof t === "string" && /^\d{2}:\d{2}$/.test(t) ? t : undefined);
  const num = (n: unknown, max: number) => (typeof n === "number" && n >= 0 && n <= max ? n : undefined);
  return {
    wakeTime: time(v.wakeTime),
    sleepTime: time(v.sleepTime),
    workDurationHours: num(v.workDurationHours, 24),
    preferredWalkMinutes: num(v.preferredWalkMinutes, 240),
    cameraAllowed: v.cameraAllowed === true,
  };
}

/** Marks onboarding done and saves the wellness setup answers. */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readJson(req);
  try {
    await getPool().query(
      "update app_users set onboarding_completed_at = coalesce(onboarding_completed_at, now()), wellness_setup = $2 where id = $1",
      [user.id, JSON.stringify(pickSetup(body.wellnessSetup))]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
