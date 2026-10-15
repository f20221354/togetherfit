/**
 * Error reporting without a vendor SDK:
 * 1. Every error is written to the server log as one JSON line (easy to
 *    search in Docker / Vercel logs, or to ship to any log service).
 * 2. If ERROR_WEBHOOK_URL is set (a Slack or Discord incoming webhook), the
 *    team is pinged, at most once per distinct error every 10 minutes per
 *    server process, so an outage can't flood the channel.
 *
 * Never pass request headers, cookies or bodies here: reports leave the
 * server, so they must not contain personal data.
 */

export interface ErrorContext {
  /** Where it happened, e.g. "api POST /api/groups/[id]/messages" or "client /move". */
  where?: string;
  /** Next.js error digest, also shown to the user on the error page. */
  digest?: string;
  source?: "server" | "client";
}

const WEBHOOK_COOLDOWN_MS = 10 * 60_000;
const lastSent = new Map<string, number>();

function describe(err: unknown): { name: string; message: string; stack?: string } {
  if (err instanceof Error) {
    // Connection failures often arrive as an AggregateError with an empty message; show the first cause.
    const inner = err instanceof AggregateError && err.errors[0] instanceof Error ? err.errors[0] : null;
    const code = (inner ?? err) as Error & { code?: string };
    const message = err.message || inner?.message || "";
    return { name: err.name, message: code.code && !message.includes(code.code) ? `${message} [${code.code}]`.trim() : message, stack: err.stack };
  }
  return { name: "NonError", message: typeof err === "string" ? err : JSON.stringify(err) ?? String(err) };
}

export function reportError(err: unknown, context: ErrorContext = {}): void {
  const { name, message, stack } = describe(err);
  const source = context.source ?? "server";
  console.error(
    JSON.stringify({
      level: "error",
      time: new Date().toISOString(),
      source,
      where: context.where,
      digest: context.digest,
      name,
      message: message.slice(0, 2000),
      stack: stack?.split("\n").slice(0, 15).join("\n"),
    })
  );

  const url = process.env.ERROR_WEBHOOK_URL;
  if (!url) return;
  const key = `${source}|${context.where}|${name}|${message.slice(0, 200)}`;
  const now = Date.now();
  if ((lastSent.get(key) ?? 0) > now - WEBHOOK_COOLDOWN_MS) return;
  lastSent.set(key, now);
  if (lastSent.size > 500) lastSent.clear();

  const text = `togetherfit ${source} error${context.where ? ` in ${context.where}` : ""}: ${name}: ${message.slice(0, 300)}${context.digest ? ` (digest ${context.digest})` : ""}`;
  // Slack reads "text", Discord reads "content".
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, content: text }),
    signal: AbortSignal.timeout(3_000),
  }).catch(() => {});
}
