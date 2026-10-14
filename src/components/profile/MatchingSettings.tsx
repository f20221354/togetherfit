"use client";

import { useState } from "react";
import clsx from "clsx";
import { useMyProfile, type MyProfile, type ProfilePatch } from "@/lib/profile/profileStore";

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
 * Settings → Privacy & safety: gender (private), who you're comfortable being
 * matched with, verified-only, and whether your photo shows on Find a Friend.
 * `compact` (onboarding) shows only gender and preference.
 */
export function MatchingSettings({ compact = false }: { compact?: boolean }) {
  const { profile, save } = useMyProfile();
  const [error, setError] = useState<string | null>(null);
  if (!profile) return <p className="text-sm text-muted">Loading…</p>;

  async function update(patch: ProfilePatch) {
    setError(null);
    const result = await save(patch);
    if (!result.ok) setError(result.error);
  }

  const verified = !!profile.verifiedAt;
  const lockedUntil = profile.genderLockedUntil
    ? new Date(profile.genderLockedUntil).toLocaleDateString("en-IN", { day: "numeric", month: "long" })
    : null;

  return (
    <div className="flex flex-col gap-5 text-left">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-foreground">Gender (optional)</span>
        <select
          value={profile.gender ?? ""}
          disabled={!!lockedUntil}
          onChange={(e) => update({ gender: (e.target.value || null) as MyProfile["gender"] })}
          className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-base text-foreground disabled:opacity-60 md:text-sm"
        >
          {GENDER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted">
          Private: only used to respect matching preferences, never shown to anyone.
          {lockedUntil ? ` You can change it again after ${lockedUntil}.` : " You can change it once every 30 days."}
        </span>
      </label>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm text-foreground">Who I&apos;m comfortable being matched with</legend>
        <div className="grid grid-cols-3 gap-2">
          {PREFERENCE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => update({ matchPreference: o.value })}
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
            onChange={(v) => update({ verifiedOnly: v })}
            label="Only match me with verified people"
            hint={verified ? "You'll only see people with the ✓ badge on Find a Friend." : "You'll only see verified people — and you need to be verified for them to see you."}
          />
          <Toggle
            on={profile.photoOnRadar}
            onChange={(v) => update({ photoOnRadar: v })}
            label="Show my photo on Find a Friend"
            hint="Off: people nearby see your initial and badge until you accept their request. On: they see your photo too."
          />
        </div>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
