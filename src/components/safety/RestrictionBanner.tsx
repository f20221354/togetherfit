"use client";

import { useCurrentUser } from "@/lib/auth/authStore";
import { LEGAL_CONTACT_EMAIL } from "@/components/legal/LegalPage";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

/**
 * Shown to a restricted person on every page: what happened, until when,
 * what still works, and how to appeal. Nothing is hidden from them.
 */
export function RestrictionBanner() {
  const restriction = useCurrentUser()?.restriction;
  if (!restriction) return null;
  const full = restriction.scope === "full";
  const until = restriction.until ? `until ${fmt(restriction.until)}` : "permanently";
  const subject = encodeURIComponent("Appeal: account restriction");

  return (
    <div role="status" className="border-b border-danger/30 bg-danger/10 px-4 py-3 text-sm text-foreground md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="font-semibold">
          {full ? "Your account is restricted" : "You're hidden from Find a Friend"} {until}
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {restriction.reason}{" "}
          {full
            ? "You can't send friend requests or messages, or use Find a Friend and groups. Your friends, history and settings are still here."
            : "Everything else works as usual while our team reviews the report."}{" "}
          You can still export your data or delete your account in Settings.{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}?subject=${subject}`} className="font-medium text-foreground underline">
            Appeal this decision
          </a>
        </p>
      </div>
    </div>
  );
}
