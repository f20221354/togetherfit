"use client";

/** Sends a crash caught by an error page to /api/client-errors (best effort, never throws). */
export function reportClientError(error: Error & { digest?: string }) {
  try {
    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        name: error.name,
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        path: window.location.pathname,
      }),
    }).catch(() => {});
  } catch {}
}
