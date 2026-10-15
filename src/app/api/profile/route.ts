import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { GENDERS, MATCH_PREFERENCES, getProfile, updateProfile, type ProfilePatch } from "@/lib/profile/profileDb";
import { trustProvider } from "@/lib/trust/provider";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** Your own trust & matching settings (never other people's). */
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  try {
    const profile = await getProfile(user.id);
    return NextResponse.json(
      { ok: true, profile, verificationAvailable: trustProvider().verificationAvailable },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const body = await readBody(req);
  const patch: ProfilePatch = {};
  if ("gender" in body) {
    if (body.gender !== null && !GENDERS.includes(body.gender as never)) return bad("Invalid gender");
    patch.gender = body.gender as ProfilePatch["gender"];
  }
  if ("matchPreference" in body) {
    if (!MATCH_PREFERENCES.includes(body.matchPreference as never)) return bad("Invalid match preference");
    patch.matchPreference = body.matchPreference as ProfilePatch["matchPreference"];
  }
  for (const key of ["verifiedOnly", "photoOnRadar"] as const) {
    if (key in body) {
      if (typeof body[key] !== "boolean") return bad(`${key} must be true or false`);
      patch[key] = body[key] as boolean;
    }
  }
  try {
    const result = await updateProfile(user.id, patch);
    if (!result.ok) return bad(result.error, 409);
    return NextResponse.json({ ok: true, profile: result.profile });
  } catch (err) {
    return serverError(err);
  }
}
