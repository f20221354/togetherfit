import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content-Security-Policy: only the sources togetherfit actually uses.
 * - Posture & Gaze Guard: MediaPipe runtime (cdn.jsdelivr.net, WebAssembly) and model (storage.googleapis.com)
 * - Find a Friend map tiles: tile.openstreetmap.org
 * - Bot check on sign-up: challenges.cloudflare.com (Turnstile)
 * - Realtime chat when REALTIME=ably: Ably's hosts
 * Inline scripts are allowed because Next.js needs them without per-request
 * nonces (which would force every page to render dynamically); everything
 * else (other script hosts, plugins, framing, form targets) is locked down.
 */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://cdn.jsdelivr.net https://storage.googleapis.com",
    "https://challenges.cloudflare.com",
    "https://*.ably.net wss://*.ably.net https://*.ably.io wss://*.ably.io https://*.ably-realtime.com wss://*.ably-realtime.com",
    ...(isDev ? ["ws:"] : []),
  ].join(" "),
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera is used by Posture & Gaze Guard; geolocation by Find a Friend.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Self-contained server bundle for the Docker image (see Dockerfile); Vercel ignores it.
  output: "standalone",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
