"use client";

import { useState } from "react";
import { useMyProfile } from "@/lib/profile/profileStore";
import { VerifyDialog } from "./VerifyDialog";

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** ✓ badge status, with "Get verified" when you're not. `hideWhenVerified` when the badge is already shown nearby. */
export function VerificationCard({ hideWhenVerified = false }: { hideWhenVerified?: boolean }) {
  const { profile, verificationAvailable, reload } = useMyProfile();
  const [open, setOpen] = useState(false);
  if (!profile) return null;
  const verified = !!profile.verifiedAt;
  if (verified && hideWhenVerified) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 p-3">
      <div className="text-sm">
        {verified ? (
          <>
            <div className="font-medium text-sky-500">✓ Verified</div>
            <div className="text-xs text-muted">Since {fmt(profile.verifiedAt as string)}</div>
          </>
        ) : (
          <>
            <div className="font-medium text-foreground">Not verified</div>
            <div className="text-xs text-muted">
              {profile.photoId ? "A quick live selfie proves you're the person in your photo." : "Add a photo of your face first."}
            </div>
          </>
        )}
      </div>
      {!verified && verificationAvailable && (
        <button
          onClick={() => setOpen(true)}
          disabled={!profile.photoId}
          className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50"
        >
          Get verified
        </button>
      )}
      {open && <VerifyDialog onClose={() => setOpen(false)} onVerified={() => void reload()} />}
    </div>
  );
}
