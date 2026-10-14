import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server/session";
import { realtime } from "@/lib/realtime/server";
import { streamCount, subscribe, type StreamEvent } from "@/lib/realtime/drivers/sseServer";
import { bad } from "@/lib/network/apiHelpers";

/** Keeps proxies from closing a quiet connection. */
const HEARTBEAT_MS = 25_000;
/**
 * Streams end after this long and the browser reconnects on its own, which
 * re-checks the session, so a signed-out or deleted account stops receiving.
 */
const MAX_STREAM_MS = 15 * 60_000;
/** Tabs per user per server process. */
const MAX_STREAMS_PER_USER = 10;

/**
 * REALTIME=sse only: a Server-Sent Events stream of "conversation X changed"
 * signals for the signed-in user. Signals carry ids only; the browser fetches
 * the change from the messages API, which checks permissions.
 */
export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (user instanceof NextResponse) return user;
  if (realtime().mode !== "sse") return bad("Realtime streaming is not enabled", 404);
  if (streamCount(user.id) >= MAX_STREAMS_PER_USER) return bad("Too many open tabs", 429);

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const write = (text: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          close();
        }
      };
      const onEvent = (event: StreamEvent) =>
        write(event.kind === "signal" ? `event: chat\ndata: ${JSON.stringify(event.signal)}\n\n` : "event: resync\ndata: {}\n\n");

      const unsubscribe = await subscribe(user.id, onEvent);
      const heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS);
      const maxAge = setTimeout(() => close(), MAX_STREAM_MS);

      function close() {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(maxAge);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      }
      cleanup = close;
      req.signal.addEventListener("abort", close);

      // How long the browser waits before reconnecting, then "you're live".
      write("retry: 3000\nevent: ready\ndata: {}\n\n");
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      // Tells nginx-style proxies not to buffer the stream.
      "X-Accel-Buffering": "no",
    },
  });
}
