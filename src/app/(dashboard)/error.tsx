"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/observability/reportClientError";
import { StatusScreen } from "@/components/ui/StatusScreen";

/** Errors inside the signed-in app: the sidebar and tab bar stay, only the page shows the error. */
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
    reportClientError(error);
  }, [error]);
  return (
    <StatusScreen
      code={error.digest ? `Error ${error.digest}` : "Error"}
      title="This screen didn't load"
      message="Something went wrong on our side. Try again, or use the menu to go somewhere else."
      action={
        <button onClick={() => retry()} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-black hover:opacity-90">
          Try again
        </button>
      }
    />
  );
}
