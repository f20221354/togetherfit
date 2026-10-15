"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/observability/reportClientError";
import { StatusScreen } from "@/components/ui/StatusScreen";

/** Errors outside the signed-in app (sign-in, legal pages). */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
    reportClientError(error);
  }, [error]);
  return (
    <main className="min-h-dvh bg-background">
      <StatusScreen
        code={error.digest ? `Error ${error.digest}` : "Error"}
        title="Something went wrong"
        message="This page hit a problem. Try again; if it keeps happening, check your connection or come back in a few minutes."
        action={
          <button onClick={() => retry()} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black hover:opacity-90">
            Try again
          </button>
        }
      />
    </main>
  );
}
