import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { rateLimit } from "@/lib/auth/server/rateLimit";
import { MAX_STORE_BYTES, isSyncedStore, putState } from "@/lib/sync/stateDb";
import { bad, serverError } from "@/lib/network/apiHelpers";

/**
 * Saves one store: `{ data, baseRevision }`. 409 with `current` when the
 * server has moved on (another device saved first); the browser decides
 * which copy wins and retries with the new revision.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ store: string }> }) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  const { store } = await params;
  if (!isSyncedStore(store)) return bad("Unknown store", 404);
  const limited = await rateLimit({ key: `state:${user.id}`, limit: 120, windowSeconds: 60 });
  if (limited) return limited;

  const raw = await req.text();
  if (raw.length > MAX_STORE_BYTES + 1024) return bad("Too much data", 413);
  let body: { data?: unknown; baseRevision?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return bad("Invalid JSON");
  }
  const { data, baseRevision } = body;
  if (data === null || typeof data !== "object") return bad("data must be an object");
  if (typeof baseRevision !== "number" || !Number.isInteger(baseRevision) || baseRevision < 0) return bad("Invalid baseRevision");

  try {
    const result = await putState(user.id, store, data, baseRevision);
    if (!result.ok) return NextResponse.json({ ok: false, error: "Changed on another device", current: result.current }, { status: 409 });
    return NextResponse.json(result);
  } catch (err) {
    return serverError(err);
  }
}
