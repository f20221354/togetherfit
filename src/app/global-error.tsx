"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/observability/reportClientError";

/**
 * Last-resort screen when the root layout itself fails. It replaces the
 * whole document, so it can't use the app's stylesheet: styles are inline
 * and follow the system light/dark setting.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "Canvas",
          color: "CanvasText",
          colorScheme: "light dark",
          textAlign: "center",
          padding: 16,
        }}
      >
        <title>Something went wrong · togetherfit</title>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.6 }}>
            {error.digest ? `Error ${error.digest}` : "Error"}
          </div>
          <h1 style={{ margin: 0, fontSize: 24 }}>togetherfit couldn&apos;t load</h1>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.75 }}>Please try again. If it keeps happening, come back in a few minutes.</p>
          <button
            onClick={() => retry()}
            style={{ marginTop: 8, padding: "8px 20px", borderRadius: 999, border: "none", background: "#2bb673", color: "#000", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
