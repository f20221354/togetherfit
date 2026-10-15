import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/server/session";
import { USER_ACTIONS, applyUserAction, type UserAction } from "@/lib/admin/moderationDb";
import { bad, readBody, serverError } from "@/lib/network/apiHelpers";

/** Help someone stuck in verification: allow more tries, or verify them after checking another way. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(req);
  if (admin instanceof NextResponse) return admin;
  const { id } = await params;
  const { action } = await readBody(req);
  if (!USER_ACTIONS.includes(action as UserAction)) return bad(`action must be one of ${USER_ACTIONS.join(", ")}`);
  try {
    if (!(await applyUserAction(id, action as UserAction, admin.id))) return bad("User not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err);
  }
}
