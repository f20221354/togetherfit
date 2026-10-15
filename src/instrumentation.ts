import type { Instrumentation } from "next";

/** Uncaught server errors (pages, route handlers, the proxy) go to the error reporter. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { reportError } = await import("@/lib/observability/report");
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  // Path only, without the query string, which can contain personal data.
  reportError(err, { where: `${context.routeType} ${request.method} ${context.routePath ?? request.path.split("?")[0]}`, digest });
};
