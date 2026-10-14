import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

/**
 * For uptime monitors and the Docker health check: 200 when the app can
 * reach the database, 503 when it can't. Public and cheap; no user data.
 */
export async function GET() {
  const started = Date.now();
  try {
    await Promise.race([
      getPool().query("select 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("database timeout")), 3_000)),
    ]);
    return NextResponse.json({ ok: true, db: "up", ms: Date.now() - started }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
