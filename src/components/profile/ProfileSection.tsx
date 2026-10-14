"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useCurrentUser } from "@/lib/auth/authStore";
import { Avatar } from "./Avatar";
import { VerifyDialog } from "./VerifyDialog";
import { squareJpeg, uploadProfilePhoto } from "./photoUpload";

interface Profile {
  gender: "woman" | "man" | "nonbinary" | null;
  matchPreference: "anyone" | "women" | "men";
  verifiedOnly: boolean;
  photoOnRadar: boolean;
  photoId: string | null;
  verifiedAt: string | null;
  genderLockedUntil: string | null;
}

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "nonbinary", label: "Non-binary" },
] as const;

const PREFERENCE_OPTIONS = [
  { value: "anyone", label: "Anyone" },
  { value: "women", label: "Women only" },
  { value: "men", label: "Men only" },
] as const;

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button onClick={() => onChange(!on)} role="switch" aria-checked={on} className="flex items-start justify-between gap-4 text-left">
      <span>
        <span className="block text-sm text-foreground">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
      <span className={clsx("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-surface-2")}>
        <span className={clsx("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform", on ? "translate-x-5" : "translate-x-0.5")} />
      </span>
    </button>
  );
}

/**
 * Settings → Profile: photo, verification, and who you're matched with.
 * `compact` (onboarding) shows only photo, gender and preference.
 */
export function ProfileSection({ compact = false }: { compact?: boolean }) {
  const user = useCurrentUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [verificationAvailable, setVerificationAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ blob: Blob; url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reload() {
    return fetch("/api/profile", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setProfile(data.profile);
          setVerificationAvailable(data.verificationAvailable);
        }
      })
      .catch(() => setError("Couldn't load your profile."));
  }

  useEffect(() => {
    reload();
  }, []);

  async function save(patch: Partial<Profile>) {
    setError(null);
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (data?.ok) setProfile(data.profile);
    else setError(data?.error ?? "Couldn't save. Please try again.");
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const blob = await squareJpeg(file);
      setPreview({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setError("We couldn't read that photo. Try a JPG or PNG.");
    }
  }

  function clearPreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function confirmUpload() {
    if (!preview) return;
    setUploading(true);
    const result = await uploadProfilePhoto(preview.blob);
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    clearPreview();
    await reload();
  }

  async function removePhoto() {
    await fetch("/api/profile/photo", { method: "DELETE" }).catch(() => null);
    await reload();
  }

  if (!profile || !user) {
    return (
      <section className={compact ? "" : "rounded-2xl border border-border bg-surface p-5"}>
        {!compact && <h2 className="text-sm font-semibold text-foreground">Profile</h2>}
        <p className="mt-3 text-sm text-muted">{error ?? "Loading…"}</p>
      </section>
    );
  }

  const verified = !!profile.verifiedAt;
  const lockedUntil = profile.genderLockedUntil
    ? new Date(profile.genderLockedUntil).toLocaleDateString("en-IN", { day: "numeric", month: "long" })
    : null;

  return (
    <section className={compact ? "text-left" : "rounded-2xl border border-border bg-surface p-5"}>
      {!compact && <h2 className="mb-4 text-sm font-semibold text-foreground">Profile</h2>}
      <div className="flex flex-col gap-5">
        {/* Photo */}
        <div className="flex items-center gap-4">
          {preview ? (
            // A local preview (blob: URL) of the cropped photo before it's uploaded.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.url} alt="New profile photo preview" className="h-20 w-20 shrink-0 rounded-full object-cover" />
          ) : (
            <Avatar name={user.name} photoId={profile.photoId} verified={verified} size="lg" large />
          )}
          <div className="flex min-w-0 flex-col gap-2">
            {preview ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={confirmUpload}
                  disabled={uploading}
                  className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-60"
                >
                  {uploading ? "Uploading…" : "Use this photo"}
                </button>
                <button onClick={clearPreview} className="rounded-full border border-border px-4 py-1.5 text-xs text-foreground hover:bg-surface-2">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:bg-surface-2"
                >
                  {profile.photoId ? "Change photo" : "Add photo"}
                </button>
                {profile.photoId && (
                  <button onClick={removePhoto} className="rounded-full px-3 py-1.5 text-xs text-muted hover:text-danger">
                    Remove
                  </button>
                )}
              </div>
            )}
            <p className="text-xs text-muted">
              {preview && verified ? "A new photo removes your ✓ badge until you verify again." : "A clear photo of your face. Only friends see it unless you choose otherwise below."}
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
        </div>

        {/* Verification */}
        {!compact && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 p-3">
            <div className="text-sm">
              {verified ? (
                <>
                  <div className="font-medium text-sky-500">✓ Verified</div>
                  <div className="text-xs text-muted">
                    Since {new Date(profile.verifiedAt as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
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
                onClick={() => setVerifying(true)}
                disabled={!profile.photoId}
                className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-50"
              >
                Get verified
              </button>
            )}
          </div>
        )}

        {/* Gender */}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-foreground">Gender (optional)</span>
          <select
            value={profile.gender ?? ""}
            disabled={!!lockedUntil}
            onChange={(e) => save({ gender: (e.target.value || null) as Profile["gender"] })}
            className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-base text-foreground disabled:opacity-60 md:text-sm"
          >
            {GENDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">
            Only used to respect matching preferences. Never shown on your profile.
            {lockedUntil ? ` You can change it again after ${lockedUntil}.` : " You can change it once every 30 days."}
          </span>
        </label>

        {/* Match preference */}
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm text-foreground">Who I&apos;m comfortable being matched with</legend>
          <div className="grid grid-cols-3 gap-2">
            {PREFERENCE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => save({ matchPreference: o.value })}
                aria-pressed={profile.matchPreference === o.value}
                className={clsx(
                  "rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
                  profile.matchPreference === o.value
                    ? "border-accent bg-accent/10 text-accent-foreground"
                    : "border-border text-muted hover:text-foreground"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted">
            Matching is mutual: you&apos;ll only see people whose preferences include you too.
            {profile.matchPreference !== "anyone" && !profile.gender && " Set your gender above, or people with a preference won't see you."}
          </span>
        </fieldset>

        {!compact && (
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <Toggle
              on={profile.verifiedOnly}
              onChange={(v) => save({ verifiedOnly: v })}
              label="Only match me with verified people"
              hint={verified ? "You'll only see people with the ✓ badge on Find a Friend." : "You'll only see verified people — and you need to be verified for them to see you."}
            />
            <Toggle
              on={profile.photoOnRadar}
              onChange={(v) => save({ photoOnRadar: v })}
              label="Show my photo on Find a Friend"
              hint="Off: people nearby see your initial and badge until you accept their request. On: they see your photo too."
            />
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}
      </div>

      {verifying && (
        <VerifyDialog
          onClose={() => setVerifying(false)}
          onVerified={() => {
            void reload();
          }}
        />
      )}
    </section>
  );
}
