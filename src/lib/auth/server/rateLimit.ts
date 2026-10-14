import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

/**
 * Fixed-window counter in Postgres, so the limit holds across every app
 * instance without adding Redis. Swap for Redis if request volume grows.
 */
export async function hit(key: string, limit: number, windowSeconds: number): Promise<{ ok: boolean; retryAfter: number }> {
  const pool = getPool();
  const result = await pool.query<{ count: number; retry_after: number }>(
    `insert into rate_limits (key, window_start, count) values ($1, now(), 1)
     on conflict (key) do update set
       count = case when rate_limits.window_start < now() - make_interval(secs => $2) then 1 else rate_limits.count + 1 end,
       window_start = case when rate_limits.window_start < now() - make_interval(secs => $2) then now() else rate_limits.window_start end
     returning count,
       greatest(1, ceil(extract(epoch from (window_start + make_interval(secs => $2) - now()))))::int as retry_after`,
    [key, windowSeconds]
  );
  // Occasionally sweep expired windows so the table stays small.
  if (Math.random() < 0.01) {
    pool.query("delete from rate_limits where window_start < now() - interval '1 day'").catch(() => {});
  }
  const row = result.rows[0];
  return { ok: row.count <= limit, retryAfter: row.retry_after };
}

export function clientIp(req: NextRequest): string {
  // The first X-Forwarded-For entry is the client when the app sits behind
  // one trusted proxy/load balancer (Vercel, Nginx, a cloud LB).
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

export interface Limit {
  key: string;
  limit: number;
  windowSeconds: number;
}

/** Checks every limit; returns a 429 response for the first one exceeded, or null. */
export async function rateLimit(...limits: Limit[]): Promise<NextResponse | null> {
  for (const l of limits) {
    const { ok, retryAfter } = await hit(l.key, l.limit, l.windowSeconds);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "Too many attempts. Please wait a bit and try again." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }
  }
  return null;
}
