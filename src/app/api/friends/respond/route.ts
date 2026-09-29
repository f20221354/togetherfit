import { NextRequest, NextResponse } from "next/server";
import { respondToRequest } from "@/lib/network/friendsDb";

export async function POST(req: NextRequest) {
  const { requestId, respondingEmail, status } = await req.json();
  if (
    typeof requestId !== "string" ||
    typeof respondingEmail !== "string" ||
    (status !== "accepted" && status !== "declined")
  ) {
    return NextResponse.json(
      { ok: false, error: 'requestId, respondingEmail and status ("accepted" | "declined") are required' },
      { status: 400 }
    );
  }
  try {
    const result = await respondToRequest(requestId, respondingEmail.trim().toLowerCase(), status);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: "Request not found or already resolved" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
