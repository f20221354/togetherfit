"use client";

import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { PERSONAL_NAV_ITEMS } from "@/components/shell/navItems";
import { useCurrentUser } from "@/lib/auth/authStore";

const DESCRIPTIONS: Record<string, string> = {
  sanctuary: "Your environment, plus light, sleep, and daily rhythm.",
  posture: "Camera-based posture and gaze monitoring.",
  urgesurfer: "Fast recovery, breathing, and grounding resets.",
};

const SETTINGS_ITEM = { icon: "⚙️", label: "Account & Settings", detail: "Your friend code, privacy, data export, and account deletion.", href: "/settings" };

export default function PersonalPage() {
  const user = useCurrentUser();
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader icon="👤" title="Personal" subtitle="Your account, wellness, and self-monitoring modules." />
      <div className="flex flex-col gap-3">
        {PERSONAL_NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2"
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <div className="text-sm font-medium text-foreground">{item.label}</div>
              <div className="text-xs text-muted">{DESCRIPTIONS[item.key]}</div>
            </div>
          </Link>
        ))}

        <Link
          href={SETTINGS_ITEM.href}
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2"
        >
          <span className="text-2xl">{SETTINGS_ITEM.icon}</span>
          <div>
            <div className="text-sm font-medium text-foreground">{SETTINGS_ITEM.label}</div>
            <div className="text-xs text-muted">{SETTINGS_ITEM.detail}</div>
          </div>
        </Link>

        {user?.isAdmin && (
          <Link href="/moderation" className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2">
            <span className="text-2xl">🛡️</span>
            <div>
              <div className="text-sm font-medium text-foreground">Moderation</div>
              <div className="text-xs text-muted">Reports and verification appeals (admins only).</div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
