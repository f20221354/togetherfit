import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { getPhotoForViewer } from "@/lib/profile/profileDb";
import { serverError } from "@/lib/network/apiHelpers";

/**
 * Serves a profile photo only to people allowed to see it (see
 * getPhotoForViewer), checked on every request, so a copied link is useless
 * to anyone else. Photo ids change on every upload, so browsers may cache a
 * photo for a day without ever showing a stale one.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { id } = await params;
  const size = req.nextUrl.searchParams.get("size") === "large" ? "large" : "small";
  try {
    const data = await getPhotoForViewer(id, user.id, size);
    if (!data) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
