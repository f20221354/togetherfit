"use client";

import { useEffect, useRef, useState } from "react";

const REPORT_CATEGORIES = [
  { key: "harassment", label: "Harassment or threats" },
  { key: "safety", label: "Felt unsafe meeting them" },
  { key: "photo", label: "Fake or inappropriate photo" },
  { key: "gender", label: "Misrepresented their gender" },
  { key: "spam", label: "Spam or scam" },
  { key: "other", label: "Something else" },
] as const;

export type ConnectionAction = "removed" | "blocked" | "reported";

const CONFIRM: Record<"remove" | "block", { title: string; body: string; button: string }> = {
  remove: {
    title: "Remove friend?",
    body: "They won't be notified. Your chat with them will be deleted for both of you, and you can add each other again later.",
    button: "Remove",
  },
  block: {
    title: "Block?",
    body: "They won't be able to message you, send you requests, or see you on Find a Friend. They won't be notified.",
    button: "Block",
  },
};

/**
 * ⋯ menu for someone you're connected with: Remove friend, Block, Report.
 * Used on the Friends list and in chat. Reporting also blocks them.
 */
export function ConnectionMenu({
  connectionId,
  name,
  canRemove = true,
  onDone,
}: {
  connectionId: string;
  name: string;
  canRemove?: boolean;
  onDone: (action: ConnectionAction) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"menu" | "remove" | "block" | "report">("menu");
  const [category, setCategory] = useState<string>("harassment");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setStep("menu");
    setReason("");
    setError(null);
  }

  async function run(path: "remove" | "block" | "report", action: ConnectionAction, body?: object) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/connections/${connectionId}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      close();
      onDone(action);
    } catch {
      setError("Can't reach togetherfit. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={`More options for ${name}`}
        aria-expanded={open}
        className="rounded-full px-2.5 py-1 text-lg leading-none text-muted hover:bg-surface-2 hover:text-foreground"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-2xl border border-border bg-surface p-3 shadow-lg">
          {step === "menu" && (
            <div className="flex flex-col">
              {canRemove && (
                <button onClick={() => setStep("remove")} className="rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-surface-2">
                  Remove friend
                </button>
              )}
              <button onClick={() => setStep("block")} className="rounded-lg px-3 py-2 text-left text-sm text-foreground hover:bg-surface-2">
                Block {name}
              </button>
              <button onClick={() => setStep("report")} className="rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/10">
                Report {name}
              </button>
            </div>
          )}

          {(step === "remove" || step === "block") && (
            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-foreground">{CONFIRM[step].title}</div>
              <p className="text-xs text-muted">{CONFIRM[step].body}</p>
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => run(step, step === "remove" ? "removed" : "blocked")}
                  className="rounded-full bg-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {CONFIRM[step].button}
                </button>
                <button onClick={() => setStep("menu")} className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground">
                  Back
                </button>
              </div>
            </div>
          )}

          {step === "report" && (
            <div className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-foreground">Report {name}</div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Reason for report"
                className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-base text-foreground md:text-xs"
              >
                {REPORT_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="What happened? (optional)"
                className="resize-none rounded-xl border border-border bg-surface-2 px-3 py-2 text-base text-foreground outline-none focus:border-accent md:text-xs"
              />
              <p className="text-[11px] text-muted">
                They&apos;ll be blocked right away and won&apos;t know you reported them. Our team reviews every report.
              </p>
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => run("report", "reported", { category, reason })}
                  className="rounded-full bg-danger px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  Report &amp; block
                </button>
                <button onClick={() => setStep("menu")} className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground">
                  Back
                </button>
              </div>
            </div>
          )}

          {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
