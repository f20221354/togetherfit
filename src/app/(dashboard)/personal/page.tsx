import Link from "next/link";
import { PageHeader } from "@/components/shell/PageHeader";
import { PERSONAL_NAV_ITEMS } from "@/components/shell/navItems";

const DESCRIPTIONS: Record<string, string> = {
  sanctuary: "Your environment, plus light, sleep, and daily rhythm.",
  posture: "Camera-based posture and gaze monitoring.",
  urgesurfer: "Fast recovery, breathing, and grounding resets.",
};

const EXTRA_ITEMS = [
  { key: "profile", icon: "🎯", label: "My Profile", detail: "Your wellness profile and activity history.", href: "/connect/my-profile" },
  { key: "settings", icon: "⚙️", label: "Settings", detail: "Account, privacy, notifications, and appearance.", href: "/settings" },
];

export default function PersonalPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <PageHeader icon="👤" title="Personal" subtitle="Your profile, wellness, and self-monitoring modules." />
      <div className="flex flex-col gap-3">
        <Link
          href={EXTRA_ITEMS[0].href}
          className="flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 hover:bg-accent/15"
        >
          <span className="text-2xl">{EXTRA_ITEMS[0].icon}</span>
          <div>
            <div className="text-sm font-medium text-accent-foreground">{EXTRA_ITEMS[0].label}</div>
            <div className="text-xs text-muted">{EXTRA_ITEMS[0].detail}</div>
          </div>
        </Link>

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
          href={EXTRA_ITEMS[1].href}
          className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 hover:bg-surface-2"
        >
          <span className="text-2xl">{EXTRA_ITEMS[1].icon}</span>
          <div>
            <div className="text-sm font-medium text-foreground">{EXTRA_ITEMS[1].label}</div>
            <div className="text-xs text-muted">{EXTRA_ITEMS[1].detail}</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
