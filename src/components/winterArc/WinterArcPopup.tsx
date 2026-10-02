"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/auth/authStore";
import { useIsClient } from "@/lib/useIsClient";
import { useWinterArcJoined, useWinterArcStore } from "@/lib/winterArc/store";
import { markWinterArcDailyActive, trackWinterArc } from "@/lib/winterArc/analytics";
import {
  WINTER_ARC_COPY,
  WINTER_ARC_PAGE_PATH,
  isWinterArcActive,
  winterArcDay,
  winterArcTotalDays,
} from "@/lib/winterArc/config";

/**
 * Winter Arc event popup, mounted once in AppShell.
 *
 * Intentionally shown on EVERY fresh page load/refresh while the event is
 * live: the open state lives only in this component's memory (no persisted
 * "has seen" flag), so a reload brings it back and client-side navigation
 * doesn't. Only the opt-in (`winterArcJoined`) is persisted.
 */
export function WinterArcPopup() {
  const user = useCurrentUser();
  const isClient = useIsClient();
  const [open, setOpen] = useState(true);
  if (!isClient || !open || !user || !isWinterArcActive()) return null;
  return <WinterArcDialog email={user.email} onClose={() => setOpen(false)} />;
}

function WinterArcDialog({ email, onClose }: { email: string; onClose: () => void }) {
  const router = useRouter();
  const joined = useWinterArcJoined(email);
  const join = useWinterArcStore((s) => s.join);
  const dialogRef = useRef<HTMLDivElement>(null);
  const variant = joined ? "joined" : "join";

  // Logged as-is on every load (high-volume by design, never throttled).
  // The ref only stops React's dev double-invoke from logging twice.
  const loggedShown = useRef(false);
  useEffect(() => {
    if (loggedShown.current) return;
    loggedShown.current = true;
    trackWinterArc("winter_arc_popup_shown", email, { variant });
  }, [email, variant]);

  function dismiss(method: string) {
    trackWinterArc("winter_arc_dismissed", email, { variant, method });
    onClose();
  }
  const onEscape = useEffectEvent(() => dismiss("escape"));

  // Focus in, trap Tab, Esc to close, restore focus on close.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>("button, a[href]");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  function handleJoin() {
    join(email);
    trackWinterArc("winter_arc_joined", email);
    markWinterArcDailyActive(email);
    onClose();
    router.push(WINTER_ARC_PAGE_PATH);
  }

  function handleGoTo() {
    markWinterArcDailyActive(email);
    onClose();
    router.push(WINTER_ARC_PAGE_PATH);
  }

  const day = winterArcDay();
  const total = winterArcTotalDays();

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="absolute inset-0" onClick={() => dismiss("overlay")} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="winter-arc-title"
        aria-describedby="winter-arc-description"
        className="celebration-pop relative w-full max-w-md overflow-hidden rounded-3xl border border-winter/30 bg-surface p-6 shadow-2xl"
        style={{
          backgroundImage:
            "radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--winter) 18%, transparent), transparent 70%)",
        }}
      >
        <button
          onClick={() => dismiss("close_button")}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground"
        >
          ✕
        </button>

        <div className="mb-3 text-4xl" aria-hidden="true">
          ❄️
        </div>

        {joined ? (
          <>
            <h2 id="winter-arc-title" className="text-xl font-semibold text-foreground">
              {WINTER_ARC_COPY.joinedTitle}
            </h2>
            <p id="winter-arc-description" className="mt-1 text-sm text-muted">
              Day {day} of {total}. Keep your arc going.
            </p>
            <div className="mt-4 h-2 w-full rounded-full bg-surface-2" aria-hidden="true">
              <div className="h-2 rounded-full bg-winter" style={{ width: `${Math.round((day / total) * 100)}%` }} />
            </div>
            <div className="mt-6 flex gap-2">
              <button
                data-autofocus
                onClick={handleGoTo}
                className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90"
              >
                {WINTER_ARC_COPY.goToCta}
              </button>
              <button
                onClick={() => dismiss("maybe_later")}
                className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                {WINTER_ARC_COPY.dismissCta}
              </button>
            </div>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-winter/15 px-2.5 py-1 text-xs font-semibold text-winter">
              {WINTER_ARC_COPY.badge}
            </span>
            <h2 id="winter-arc-title" className="mt-3 text-2xl font-semibold text-foreground">
              {WINTER_ARC_COPY.title}
            </h2>
            <p className="mt-1 text-sm font-medium text-foreground">{WINTER_ARC_COPY.hook}</p>
            <p id="winter-arc-description" className="mt-3 text-sm text-muted">
              {WINTER_ARC_COPY.description}
            </p>
            <div className="mt-6 flex gap-2">
              <button
                data-autofocus
                onClick={handleJoin}
                className="flex-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-black hover:opacity-90"
              >
                {WINTER_ARC_COPY.joinCta}
              </button>
              <button
                onClick={() => dismiss("maybe_later")}
                className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-surface-2"
              >
                {WINTER_ARC_COPY.dismissCta}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
