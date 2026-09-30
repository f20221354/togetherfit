import { NextRequest, NextResponse } from "next/server";
import { coarsen } from "@/lib/network/geo";
import { bad } from "@/lib/network/apiHelpers";

/**
 * Place search via OpenStreetMap Nominatim, following its usage policy
 * (https://operations.osmfoundation.org/policies/nominatim/): an identifying
 * User-Agent, at most one request per second from this server, cached
 * results, and search on submit only (Nominatim forbids type-ahead
 * autocomplete). Proxied server-side because browsers can't set User-Agent.
 */
const USER_AGENT = "togetherfit/1.0 (+https://vitaos-jd8j.vercel.app; wellness-app place search)";
const MIN_INTERVAL_MS = 1100;
const CACHE_LIMIT = 300;

const cache = new Map<string, { label: string; lat: number; lng: number }[]>();
let lastRequestAt = 0;
let queue: Promise<void> = Promise.resolve();

function throttle(): Promise<void> {
  // Serialize requests so this instance never exceeds ~1 request/second.
  queue = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequestAt = Date.now();
  });
  return queue;
}

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return bad("Type at least 3 characters");
  if (q.length > 120) return bad("Search is too long");

  const key = q.toLowerCase();
  const cached = cache.get(key);
  if (cached) return NextResponse.json({ ok: true, results: cached });

  await throttle();
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return bad("Place search is busy — try again in a moment", 503);
    const data = (await res.json()) as { display_name: string; lat: string; lon: string }[];
    const results = data.map((place) => {
      // Only a coarse point ever leaves the server.
      const { lat, lng } = coarsen(Number(place.lat), Number(place.lon));
      return { label: place.display_name, lat, lng };
    });
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    cache.set(key, results);
    return NextResponse.json({ ok: true, results });
  } catch {
    return bad("Place search is unavailable right now", 503);
  }
}
