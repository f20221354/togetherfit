"use client";

import Link from "next/link";
import { PERSONAL_NAV_ITEMS } from "@/components/shell/navItems";
import { useCurrentUser } from "@/lib/auth/authStore";
import { useMyProfile } from "@/lib/profile/profileStore";
import { Avatar } from "@/components/profile/Avatar";
import { Icon } from "@/components/ui/Icon";

const DESCRIPTIONS: Record<string, string> = {
  sanctuary: "Your environment, plus light, sleep, and daily rhythm.",
  posture: "Camera-based posture and gaze monitoring.",
  urgesurfer: "Fast recovery, breathing, and grounding resets.",
};

/** The phone's "Me" tab: your profile at the top, then the wellness modules and Settings. */
export default function MePage() {
  const user = useCurrentUser();
  const { profile } = useMyProfile();
  if (!user) return null;
  const verified = !!profile?.verifiedAt;

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <Link href="/profile" className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2">
        <Avatar name={user.name} photoId={profile?.photoId} verified={verified} size="lg" large />
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-semibold text-foreground">{user.name}</div>
          <div className="text-xs text-muted">
            {verified ? <span className="font-medium text-sky-500">✓ Verified</span> : "Not verified yet"} · {user.code}
          </div>
          <div className="mt-1 text-xs font-medium text-accent-foreground">View my profile →</div>
        </div>
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Wellness</h2>
        {PERSONAL_NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2"
          >
            <Icon name={item.icon} size={26} className="text-accent-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">{item.label}</div>
              <div className="text-xs text-muted">{DESCRIPTIONS[item.key]}</div>
            </div>
          </Link>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Account</h2>
        <Link href="/settings" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2">
          <Icon name="nav.settings" size={26} className="text-accent-foreground" />
          <div>
            <div className="text-sm font-medium text-foreground">Settings</div>
            <div className="text-xs text-muted">Privacy &amp; safety, notifications, appearance, your data.</div>
          </div>
        </Link>
        {user.isAdmin && (
          <Link href="/moderation" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2">
            <Icon name="nav.moderation" size={26} className="text-accent-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">Moderation</div>
              <div className="text-xs text-muted">Reports and verification appeals (admins only).</div>
            </div>
          </Link>
        )}
      </section>
    </div>
  );
}
