import { NextRequest, NextResponse } from "next/server";
import { clientIp, rateLimit } from "@/lib/auth/server/rateLimit";
import { reportError } from "@/lib/observability/report";
import { readBody } from "@/lib/network/apiHelpers";

const MAX = { message: 500, stack: 3000, path: 200, digest: 100 } as const;

function text(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value ? value.slice(0, max) : undefined;
}

/** Crashes caught by the app's error pages in the browser. Sanitized, size-limited and rate limited. */
export async function POST(req: NextRequest) {
  const limited = await rateLimit({ key: `client-error:${clientIp(req)}`, limit: 20, windowSeconds: 600 });
  if (limited) return limited;
  const body = await readBody(req);
  const message = text(body.message, MAX.message);
  if (!message) return NextResponse.json({ ok: false }, { status: 400 });
  const error = new Error(message);
  error.name = text(body.name, 100) ?? "ClientError";
  error.stack = text(body.stack, MAX.stack);
  // Path only: the query string can contain personal data.
  const path = text(body.path, MAX.path)?.split("?")[0];
  reportError(error, { source: "client", where: path ? `page ${path}` : undefined, digest: text(body.digest, MAX.digest) });
  return NextResponse.json({ ok: true });
}
