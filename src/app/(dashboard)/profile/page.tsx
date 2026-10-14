"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "@/lib/auth/authStore";
import { useMyProfile } from "@/lib/profile/profileStore";
import { useFriendCount } from "@/lib/network/useUnreadCount";
import { PhotoEditor } from "@/components/profile/PhotoEditor";
import { VerificationCard } from "@/components/profile/VerificationCard";
import { Avatar } from "@/components/profile/Avatar";

interface Progress {
  total: number;
  streak: number;
  milestones: number;
}

/** Who you are on togetherfit: photo, badge, friend code, activity, and how others see you. */
export default function MyProfilePage() {
  const user = useCurrentUser();
  const { profile } = useMyProfile();
  const friendCount = useFriendCount();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/milestones", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setProgress({ total: data.progress.total, streak: data.progress.streak, milestones: data.achieved.length });
      })
      .catch(() => {});
  }, [user]);

  async function shareCode() {
    if (!user) return;
    const text = `Add me on togetherfit! My friend code is ${user.code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "togetherfit", text });
        return;
      }
      await navigator.clipboard.writeText(user.code);
      setShareNote("Code copied");
    } catch {
      // Share sheet dismissed, or clipboard blocked — nothing to do.
    }
  }

  if (!user) return null;
  const verified = !!profile?.verifiedAt;

  const stats = [
    { label: "Activities", value: progress?.total },
    { label: "Day streak", value: progress?.streak },
    { label: "Milestones", value: progress?.milestones },
    { label: "Friends", value: friendCount },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-5">
        <PhotoEditor size="xl" />
        <div className="flex flex-col gap-1">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold text-foreground">
            {user.name}
            {verified && <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-500">✓ Verified</span>}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            Friend code <span className="font-mono text-foreground">{user.code}</span>
            <button onClick={shareCode} className="rounded-full border border-border px-3 py-0.5 text-xs font-medium text-foreground hover:bg-surface-2">
              Share
            </button>
            {shareNote && <span className="text-xs text-accent-foreground">{shareNote}</span>}
          </div>
        </div>
        <VerificationCard hideWhenVerified />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{s.value ?? "–"}</div>
            <div className="text-xs text-muted">{s.label}</div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground">How others see you</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <PreviewCard
            title="People nearby on Find a Friend"
            name={user.name}
            photoId={profile?.photoOnRadar ? profile.photoId : null}
            verified={verified}
            detail="Running · Now · ~1 km away"
          />
          <PreviewCard title="Your friends" name={user.name} photoId={profile?.photoId ?? null} verified={verified} detail="Chat · Milestones" />
        </div>
        <p className="text-xs text-muted">
          {profile?.photoOnRadar
            ? "People nearby can see your photo before you accept them."
            : "People nearby see only your initial until you accept their request."}{" "}
          Your gender and email are never shown.{" "}
          <Link href="/settings#privacy" className="text-accent-foreground hover:underline">
            Privacy &amp; safety settings →
          </Link>
        </p>
      </section>
    </div>
  );
}

function PreviewCard({
  title,
  name,
  photoId,
  verified,
  detail,
}: {
  title: string;
  name: string;
  photoId: string | null;
  verified: boolean;
  detail: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs font-medium uppercase tracking-widest text-muted">{title}</div>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
        <Avatar name={name} photoId={photoId} verified={verified} />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            {name}
            {verified && <span className="ml-1.5 text-xs font-medium text-sky-500">Verified</span>}
          </div>
          <div className="truncate text-xs text-muted">{detail}</div>
        </div>
      </div>
    </div>
  );
}
