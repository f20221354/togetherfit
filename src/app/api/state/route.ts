import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { getAllState } from "@/lib/sync/stateDb";
import { serverError } from "@/lib/network/apiHelpers";

/** Every synced store for the signed-in user: `{ stores: { [name]: { data, revision, updatedAt } } }`. */
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  try {
    return NextResponse.json({ ok: true, stores: await getAllState(user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return serverError(err);
  }
}
