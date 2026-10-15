import { NextResponse } from "next/server";
import { reportError } from "@/lib/observability/report";

export function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

/** Reports the real error (server log, and the team's webhook if set); the client only gets a generic message. */
export function serverError(err: unknown) {
  reportError(err, { where: "api" });
  return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function readBody(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}
