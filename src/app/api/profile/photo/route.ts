import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { MAX_UPLOAD_BYTES, processProfilePhoto } from "@/lib/profile/image";
import { deleteProfilePhoto, saveProfilePhoto } from "@/lib/profile/profileDb";
import { trustProvider } from "@/lib/trust/provider";
import { bad, serverError } from "@/lib/network/apiHelpers";

/**
 * Upload a profile photo (multipart field "photo"). The image is re-encoded
 * (stripping EXIF/GPS), checked automatically (one clear face, no nudity,
 * not a minor), and replaces the previous photo. Changing the photo removes
 * the ✓ badge until the user verifies again.
 */
export async function POST(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const limited = await rateLimit({ key: `photo:${user.id}`, limit: 10, windowSeconds: 3600 });
  if (limited) return limited;

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File)) return bad("Choose a photo to upload");
  if (file.size > MAX_UPLOAD_BYTES) return bad("That photo is too large (max 5 MB)", 413);

  try {
    const processed = await processProfilePhoto(Buffer.from(await file.arrayBuffer()));
    if (!processed.ok) return bad(processed.error);
    const check = await trustProvider().checkProfilePhoto(processed.large);
    if (!check.ok) return bad(check.reason, 422);
    const photoId = await saveProfilePhoto(user.id, processed.large, processed.small);
    return NextResponse.json({ ok: true, photoId });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  try {
    await deleteProfilePhoto(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
