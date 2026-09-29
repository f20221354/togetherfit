"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/auth/authStore";

/**
 * Quick "Add Friend" entry point on the main Connect screen, using the same
 * real, cross-device friend-code system as /connect/friends
 * (src/lib/network/friendsDb.ts) — not the local demo-partner simulation.
 */
export function AddFriendModal({ onClose }: { onClose: () => void }) {
  const user = useCurrentUser();
  const [codeInput, setCodeInput] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function send() {
    if (!user || !codeInput.trim() || status === "sending") return;
    setStatus("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromEmail: user.email, fromName: user.name, toCode: codeInput.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Couldn't reach the friend network — is DATABASE_URL configured?");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-6">
        <div className="mb-1 text-lg font-semibold text-foreground">Add Friend</div>
        <p className="mb-4 text-xs text-muted">
          Enter a friend&apos;s unique code. Works across real devices — find your own code on the Friends tab.
        </p>

        {status === "sent" ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <span className="text-3xl">✅</span>
            <div className="text-sm font-medium text-foreground">Request sent!</div>
            <Link
              href="/connect/friends"
              className="text-xs font-medium text-accent-foreground hover:underline"
              onClick={onClose}
            >
              View Friends →
            </Link>
          </div>
        ) : (
          <>
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="e.g. SB-7K2QAF"
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
            />
            {status === "error" && <p className="mt-2 text-xs text-danger">{message}</p>}
            <div className="mt-4 flex gap-2">
              <button
                onClick={send}
                disabled={!codeInput.trim() || status === "sending"}
                className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Send Request"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
