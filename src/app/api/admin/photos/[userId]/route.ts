import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server/session";
import { getPhotoForAdmin } from "@/lib/admin/moderationDb";
import { serverError } from "@/lib/network/apiHelpers";

/** A user's current photo, for reviewing reports. Admins only; never cached. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const { userId } = await params;
  try {
    const data = await getPhotoForAdmin(userId, req.nextUrl.searchParams.get("size") === "large" ? "large" : "small");
    if (!data) return new NextResponse(null, { status: 404 });
    return new NextResponse(new Uint8Array(data), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
    });
  } catch (err) {
    return serverError(err);
  }
}
