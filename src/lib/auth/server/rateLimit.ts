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

/**
 * The client's IP, for rate limiting. Anyone can send their own
 * X-Forwarded-For, so we never trust its first entry: each trusted proxy
 * appends the address it saw, so the real client is TRUSTED_PROXY_HOPS
 * entries from the right (default 1: one proxy, e.g. Vercel, Caddy or Nginx).
 * CLIENT_IP_HEADER can name a header your proxy sets on its own instead
 * (e.g. "cf-connecting-ip" behind Cloudflare, or "x-real-ip").
 */
export function clientIp(req: NextRequest): string {
  const custom = process.env.CLIENT_IP_HEADER?.toLowerCase();
  if (custom) return req.headers.get(custom)?.trim() || "unknown";
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS ?? 1) || 1);
  const chain = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (chain.length > 0) return chain[Math.max(0, chain.length - hops)];
  return req.headers.get("x-real-ip")?.trim() || "unknown";
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
