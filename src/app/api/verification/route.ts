import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { getOwnPhotoLarge, recordVerification } from "@/lib/profile/profileDb";
import { trustProvider } from "@/lib/trust/provider";
import { decide } from "@/lib/trust/types";
import { bad, serverError } from "@/lib/network/apiHelpers";

const MESSAGES = {
  verified: "You're verified ✓",
  retry: "We couldn't confirm it was you. Try again facing the camera in good light.",
  rejected: "Your selfie didn't match your profile photo. Make sure your profile photo clearly shows your face, then try again.",
} as const;

/**
 * Runs automatic selfie verification against the current profile photo:
 * clear pass → ✓ badge, clear fail → rejected, unsure → retry. At most 3
 * attempts a day. Only the scores and decision are stored, never images.
 */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const provider = trustProvider();
  if (!provider.verificationAvailable) return bad("Verification isn't available right now.", 503);

  try {
    const photo = await getOwnPhotoLarge(user.id);
    if (!photo) return bad("Add a profile photo that shows your face first.", 409);
    const limited = await rateLimit({ key: `verify-selfie:${user.id}`, limit: 3, windowSeconds: 86_400 });
    if (limited) return limited;

    const scores = await provider.verifySelfie(photo);
    const decision = decide(scores);
    await recordVerification(user.id, provider.name, decision, scores, decision === "verified" ? null : decision);
    return NextResponse.json({ ok: true, decision, message: MESSAGES[decision] });
  } catch (err) {
    return serverError(err);
  }
}
